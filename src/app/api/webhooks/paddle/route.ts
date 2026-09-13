/**
 * Webhook-ul Paddle — singurul lucru pe baza căruia deblocăm melodia.
 *
 * Browserul poate minți: poate spune „am plătit" fără să fi plătit. Paddle nu,
 * pentru că semnează fiecare mesaj cu un secret pe care doar noi îl mai știm.
 * De asta plata se confirmă numai aici, niciodată din pagină.
 *
 * Paddle retrimite un eveniment până primește 200, deci același mesaj poate veni
 * de mai multe ori. Cheia unică din `webhook_events` face ca a doua livrare să
 * nu producă nimic: o inserăm, prinde conflictul, ieșim.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, payments, webhookEvents } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { logEvent, paidExpiry, unpaidExpiry } from '@/lib/orders';
import { paddle } from '@/lib/paddle';
import { enqueue } from '@/lib/queue/queue';

export const dynamic = 'force-dynamic';

interface PaddleEvent {
  eventId: string;
  eventType: string;
  data: Record<string, unknown>;
}

/** Comanda la care se referă evenimentul, după identificatorul pus de noi la checkout. */
async function orderFor(data: Record<string, unknown>) {
  const custom = (data.custom_data ?? data.customData) as { orderId?: string } | undefined;
  const publicId = custom?.orderId;
  if (!publicId) return null;
  return db.query.orders.findFirst({ where: eq(orders.publicId, publicId) });
}

interface Totals {
  grand_total?: string;
  grandTotal?: string;
  currency_code?: string;
  currencyCode?: string;
}

/** Sumele vin în cenți, ca text. Paddle scrie cu underscore pe fir. */
function totalsOf(data: Record<string, unknown>) {
  const details = data.details as { totals?: Totals } | undefined;
  const totals = details?.totals;
  return {
    cents: Number(totals?.grand_total ?? totals?.grandTotal ?? 0),
    currency: totals?.currency_code ?? totals?.currencyCode ?? 'EUR',
  };
}

/** Plata a intrat: comanda se deschide, iar livrarea intră în coadă. */
async function markPaid(event: PaddleEvent): Promise<void> {
  const order = await orderFor(event.data);
  if (!order) {
    console.error(`Webhook ${event.eventId}: nu găsesc comanda.`);
    return;
  }
  if (order.status === 'paid' || order.status === 'delivered') return;

  const { cents, currency } = totalsOf(event.data);
  const transactionId = String(event.data.id ?? '');

  await db
    .insert(payments)
    .values({
      orderId: order.id,
      provider: 'paddle',
      transactionId,
      customerId: (event.data.customer_id ?? event.data.customerId ?? null) as string | null,
      status: 'completed',
      amountCents: cents,
      currency,
      rawPayload: event.data,
    })
    .onConflictDoUpdate({
      target: [payments.provider, payments.transactionId],
      set: { status: 'completed', amountCents: cents, currency, updatedAt: new Date() },
    });

  await db
    .update(orders)
    .set({
      status: 'paid',
      paidAt: new Date(),
      // Comanda plătită se păstrează 24 de luni, ca s-o poată redescărca.
      expiresAt: paidExpiry(),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await logEvent(order.id, 'paid', { transactionId, cents, currency });
  await enqueue('deliver', order.id);
}

/**
 * Rambursare: clientul se întoarce exact de unde a plecat — păstrează
 * previzualizările, pierde fișierele integrale. Ruta de audio verifică starea
 * la fiecare cerere, deci accesul se închide imediat, nu la următoarea repornire.
 */
async function markRefunded(event: PaddleEvent): Promise<void> {
  const action = String(event.data.action ?? '');
  if (action !== 'refund') return;

  const transactionId = String(event.data.transaction_id ?? event.data.transactionId ?? '');
  if (!transactionId) return;

  const payment = await db.query.payments.findFirst({
    where: eq(payments.transactionId, transactionId),
  });
  if (!payment) return;

  const { cents } = totalsOf(event.data);
  const refunded = payment.refundedCents + (cents || payment.amountCents);
  const full = refunded >= payment.amountCents;

  await db
    .update(payments)
    .set({
      status: full ? 'refunded' : 'partially_refunded',
      refundedCents: refunded,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));

  if (full) {
    await db
      .update(orders)
      .set({
        status: 'preview_ready',
        paidAt: null,
        expiresAt: unpaidExpiry(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, payment.orderId));
  }

  await logEvent(payment.orderId, 'refunded', { transactionId, refunded, full });
}

export async function POST(req: Request) {
  const signature = req.headers.get('paddle-signature');
  const body = await req.text();

  if (!signature || !env.PADDLE_WEBHOOK_SECRET) {
    return new Response('Semnătură lipsă', { status: 400 });
  }

  /**
   * Verificăm doar semnătura, apoi citim JSON-ul brut.
   *
   * `unmarshal` ar face și transformarea în obiecte tipizate, dar aruncă dacă
   * payload-ul are un câmp în plus sau în minus față de ce se așteaptă — iar
   * atunci o plată adevărată ar fi respinsă cu 401 și clientul n-ar primi
   * niciodată melodia. Semnătura e ce contează; restul citim cu grijă, câmp cu
   * câmp, și ignorăm ce nu ne privește.
   */
  let valid = false;
  try {
    valid = await paddle().webhooks.isSignatureValid(body, env.PADDLE_WEBHOOK_SECRET, signature);
  } catch (err) {
    console.error('Nu am putut verifica semnătura Paddle:', err);
  }
  if (!valid) return new Response('Semnătură invalidă', { status: 401 });

  let event: PaddleEvent;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    event = {
      eventId: String(parsed.event_id ?? parsed.eventId ?? ''),
      eventType: String(parsed.event_type ?? parsed.eventType ?? ''),
      data: (parsed.data ?? {}) as Record<string, unknown>,
    };
    if (!event.eventId || !event.eventType) throw new Error('lipsesc event_id sau event_type');
  } catch (err) {
    console.error('Webhook Paddle cu conținut necitibil:', err);
    return new Response('Conținut invalid', { status: 400 });
  }

  // Prima oprire pentru un mesaj repetat: dacă rândul există deja, nu-l refacem.
  const inserted = await db
    .insert(webhookEvents)
    .values({
      provider: 'paddle',
      eventId: event.eventId,
      eventType: event.eventType,
      payload: event.data,
    })
    .onConflictDoNothing({ target: [webhookEvents.provider, webhookEvents.eventId] })
    .returning({ id: webhookEvents.id });

  if (inserted.length === 0) return new Response('ok (deja procesat)', { status: 200 });

  try {
    switch (event.eventType) {
      case 'transaction.completed':
      case 'transaction.paid':
        await markPaid(event);
        break;
      case 'adjustment.created':
      case 'adjustment.updated':
        await markRefunded(event);
        break;
      default:
        // Restul le păstrăm doar ca urmă; nu schimbă nimic la noi.
        break;
    }

    await db
      .update(webhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(webhookEvents.id, inserted[0]!.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Webhook ${event.eventType} a eșuat:`, err);
    await db
      .update(webhookEvents)
      .set({ error: message.slice(0, 1000) })
      .where(eq(webhookEvents.id, inserted[0]!.id));
    // 500 face ca Paddle să retrimită — exact ce vrem la o eroare de-a noastră.
    return new Response('Eroare la procesare', { status: 500 });
  }

  return new Response('ok', { status: 200 });
}
