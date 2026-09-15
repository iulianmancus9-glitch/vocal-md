/**
 * Webhook-ul Lemon Squeezy — singurul lucru pe baza căruia deblocăm melodia.
 *
 * Browserul poate minți: poate spune „am plătit" fără să fi plătit. Lemon
 * Squeezy nu, pentru că semnează fiecare mesaj cu un secret pe care doar noi îl
 * mai știm. De asta plata se confirmă numai aici, niciodată din pagină.
 *
 * Retrimit un eveniment până primesc 200, deci același mesaj poate veni de mai
 * multe ori. Cheia unică din `webhook_events` face ca a doua livrare să nu
 * producă nimic: o inserăm, prinde conflictul, ieșim.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, payments, webhookEvents } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { logEvent, paidExpiry, unpaidExpiry } from '@/lib/orders';
import { enqueue } from '@/lib/queue/queue';

export const dynamic = 'force-dynamic';

const PROVIDER = 'lemon';

interface LemonEvent {
  eventName: string;
  /** Identificatorul pe care îl punem noi la checkout, întors în meta. */
  orderPublicId: string | null;
  /** Identificatorul comenzii la ei; cheia după care recunoaștem o rambursare. */
  transactionId: string;
  attributes: Record<string, unknown>;
  raw: Record<string, unknown>;
}

/**
 * Semnătura: HMAC-SHA256 hex peste corpul brut, în antetul `X-Signature`.
 *
 * Comparăm cu `timingSafeEqual`, nu cu `===`: o comparație obișnuită se oprește
 * la prima literă greșită, iar din cât durează se poate ghici semnătura, literă
 * cu literă. Lungimile se verifică întâi, pentru că `timingSafeEqual` aruncă
 * dacă diferă.
 */
function signatureValid(body: string, header: string | null): boolean {
  if (!header || !env.LEMON_WEBHOOK_SECRET) return false;
  const expected = createHmac('sha256', env.LEMON_WEBHOOK_SECRET).update(body).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(header.trim(), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Comanda la care se referă evenimentul, după identificatorul pus de noi. */
async function orderFor(publicId: string | null) {
  if (!publicId) return null;
  return db.query.orders.findFirst({ where: eq(orders.publicId, publicId) });
}

/** Plata a intrat: comanda se deschide, iar livrarea intră în coadă. */
async function markPaid(event: LemonEvent): Promise<void> {
  // `order_created` vine și pentru comenzi nefinalizate; ne interesează banii.
  const status = String(event.attributes.status ?? '');
  if (status !== 'paid') return;

  const order = await orderFor(event.orderPublicId);
  if (!order) {
    console.error(`Webhook ${event.transactionId}: nu găsesc comanda.`);
    return;
  }
  if (order.status === 'paid' || order.status === 'delivered') return;

  // Sumele vin în cenți, ca număr. `total` e ce a plătit clientul, cu tot cu TVA.
  const cents = Number(event.attributes.total ?? 0);
  const currency = String(event.attributes.currency ?? 'EUR');

  await db
    .insert(payments)
    .values({
      orderId: order.id,
      provider: PROVIDER,
      transactionId: event.transactionId,
      customerId: event.attributes.customer_id != null
        ? String(event.attributes.customer_id)
        : null,
      status: 'completed',
      amountCents: cents,
      currency,
      rawPayload: event.raw,
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

  await logEvent(order.id, 'paid', { transactionId: event.transactionId, cents, currency });
  await enqueue('deliver', order.id);
}

/**
 * Rambursare: clientul se întoarce exact de unde a plecat — păstrează
 * previzualizările, pierde fișierele integrale. Ruta de audio verifică starea
 * la fiecare cerere, deci accesul se închide imediat, nu la următoarea repornire.
 */
async function markRefunded(event: LemonEvent): Promise<void> {
  const payment = await db.query.payments.findFirst({
    where: and(
      eq(payments.provider, PROVIDER),
      eq(payments.transactionId, event.transactionId),
    ),
  });
  if (!payment) return;

  // `refunded_amount` e cât s-a întors în total, nu cât s-a întors acum.
  const refunded = Number(event.attributes.refunded_amount ?? 0) || payment.amountCents;
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

  await logEvent(payment.orderId, 'refunded', {
    transactionId: event.transactionId, refunded, full,
  });
}

export async function POST(req: Request) {
  const body = await req.text();

  if (!signatureValid(body, req.headers.get('x-signature'))) {
    return new Response('Semnătură invalidă', { status: 401 });
  }

  let event: LemonEvent;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const meta = (parsed.meta ?? {}) as Record<string, unknown>;
    const data = (parsed.data ?? {}) as Record<string, unknown>;
    const custom = (meta.custom_data ?? {}) as Record<string, unknown>;

    event = {
      eventName: String(meta.event_name ?? ''),
      orderPublicId: custom.order_id != null ? String(custom.order_id) : null,
      transactionId: String(data.id ?? ''),
      attributes: (data.attributes ?? {}) as Record<string, unknown>,
      raw: parsed,
    };
    if (!event.eventName || !event.transactionId) {
      throw new Error('lipsesc event_name sau data.id');
    }
  } catch (err) {
    console.error('Webhook Lemon Squeezy cu conținut necitibil:', err);
    return new Response('Conținut invalid', { status: 400 });
  }

  /**
   * Cheia de idempotență.
   *
   * Lemon Squeezy nu trimite un identificator al evenimentului, așa cum făcea
   * Paddle, ci doar al comenzii. Două evenimente diferite despre aceeași comandă
   * — plata și rambursarea — ar avea deci aceeași cheie și a doua ar fi înghițită
   * ca duplicat. De asta punem numele evenimentului în cheie.
   */
  const eventKey = `${event.eventName}:${event.transactionId}`;

  const inserted = await db
    .insert(webhookEvents)
    .values({
      provider: PROVIDER,
      eventId: eventKey,
      eventType: event.eventName,
      payload: event.raw,
    })
    .onConflictDoNothing({ target: [webhookEvents.provider, webhookEvents.eventId] })
    .returning({ id: webhookEvents.id });

  if (inserted.length === 0) return new Response('ok (deja procesat)', { status: 200 });

  try {
    switch (event.eventName) {
      case 'order_created':
        await markPaid(event);
        break;
      case 'order_refunded':
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
    console.error(`Webhook ${event.eventName} a eșuat:`, err);
    await db
      .update(webhookEvents)
      .set({ error: message.slice(0, 1000) })
      .where(eq(webhookEvents.id, inserted[0]!.id));
    // 500 face ca Lemon Squeezy să retrimită — exact ce vrem la o eroare de-a noastră.
    return new Response('Eroare la procesare', { status: 500 });
  }

  return new Response('ok', { status: 200 });
}
