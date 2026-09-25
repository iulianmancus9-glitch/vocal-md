/**
 * Ce se poate face cu o comandă: deblocare, respingere, ștergere.
 *
 * Stau împreună pentru că se cheamă din două locuri — butoanele de pe Telegram
 * și panoul de la `/panou`. Două copii ale aceleiași logici ar însemna că, la a
 * treia schimbare, una dintre ele face altceva decât cealaltă, și n-am ști care.
 *
 * Fiecare funcție întoarce propoziția pe care o citește omul. Tot ea ajunge și
 * pe Telegram, și în panou, deci răspunsul e același oriunde ai apăsat.
 */
import { eq } from 'drizzle-orm';
import { rm } from 'node:fs/promises';
import { db } from '@/lib/db';
import { orders, payments, type Order } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { logEvent, paidExpiry, unpaidExpiry } from '@/lib/orders';
import { PROVIDER } from '@/lib/plata';
import { enqueue } from '@/lib/queue/queue';
import { resetLimits } from '@/lib/rate-limit';
import { orderDir } from '@/lib/storage';

/** Banii s-au văzut: comanda se deschide și livrarea intră în coadă. */
export async function deblocheaza(order: Order, cine: string): Promise<string> {
  // După `paid_at`, nu după stare: o comandă plătită care tocmai face încă o
  // înregistrare stă în „rendering", dar deblocată e de mult.
  if (order.paidAt !== null) {
    return `Comanda ${order.publicId} era deja deblocată.`;
  }

  /**
   * Plata n-are identificator de la MAIB: linkul e fix și nu ne întoarce nimic.
   * Punem unul construit de noi, ca să rămână unic pe comandă și ca o a doua
   * apăsare să nu scrie un al doilea rând de plată.
   */
  await db
    .insert(payments)
    .values({
      orderId: order.id,
      provider: PROVIDER,
      transactionId: `manual:${order.publicId}`,
      status: 'completed',
      amountCents: Math.round(env.SONG_PRICE_EUR * 100),
      currency: 'EUR',
      rawPayload: { confirmatDe: cine, la: new Date().toISOString() },
    })
    .onConflictDoNothing({ target: [payments.provider, payments.transactionId] });

  await db
    .update(orders)
    .set({
      status: 'paid',
      paidAt: new Date(),
      // Comanda plătită se păstrează 24 de luni, ca s-o poată redescărca.
      expiresAt: paidExpiry(),
      /**
       * Încercările se pun la loc. A plătit: dacă vrea altă interpretare a
       * aceleiași piese, sau alt text, le poate cere.
       */
      regensLeft: env.PAID_EXTRA_REGENS,
      rendersLeft: env.PAID_EXTRA_RENDERS,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await logEvent(order.id, 'paid', { confirmatDe: cine });
  await enqueue('deliver', order.id);

  // A plătit, deci limita zilnică nu-l mai privește: e liber să înceapă o a
  // doua melodie, cadou pentru altcineva, fără să fie oprit la primul text.
  await resetLimits({ ip: order.consentIp, email: order.email });

  return `Comanda ${order.publicId} e deblocată. Emailul cu melodia pleacă singur.`;
}

/**
 * Banii nu s-au văzut — sau au fost dați înapoi.
 *
 * Aceeași apăsare acoperă două lucruri, pentru că fac exact același lucru la
 * noi: comanda se întoarce la previzualizare. Păstrează varianta gratuită,
 * pierde fișierele curate. Ruta de audio verifică starea la fiecare cerere,
 * deci accesul se închide imediat, nu la următoarea repornire.
 *
 * Pe o comandă deja deblocată, asta e rambursarea: banii îi dai înapoi din
 * MAIB, iar butonul închide accesul.
 */
export async function respinge(order: Order, cine: string): Promise<string> {
  const eraPlatita = order.paidAt !== null;
  if (!eraPlatita && order.status !== 'payment_claimed') {
    return `Comanda ${order.publicId} e tot la previzualizare. N-am schimbat nimic.`;
  }

  if (eraPlatita) {
    await db
      .update(payments)
      .set({
        status: 'refunded',
        refundedCents: Math.round(env.SONG_PRICE_EUR * 100),
        updatedAt: new Date(),
      })
      .where(eq(payments.orderId, order.id));
  }

  await db
    .update(orders)
    .set({
      status: 'preview_ready',
      paidAt: null,
      // Redevine comandă neplătită, deci și retenția se întoarce la 30 de zile.
      expiresAt: unpaidExpiry(),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await logEvent(order.id, eraPlatita ? 'refunded' : 'payment_rejected', { respinsDe: cine });

  return eraPlatita
    ? `Comanda ${order.publicId} s-a închis la loc. Nu uita să dai banii înapoi din MAIB.`
    : `Comanda ${order.publicId} s-a întors la previzualizare. Clientul poate încerca din nou.`;
}

/**
 * Șterge o comandă cu totul: fișiere, plăți, rând.
 *
 * Întâi fișierele, apoi rândul. Dacă ordinea ar fi inversă și pică ceva la
 * mijloc, ar rămâne fișiere pe disc fără nimeni care să știe de ele.
 *
 * Plățile se șterg explicit, înaintea comenzii. Legătura lor e `restrict`,
 * adică baza refuză din principiu să piardă o urmă de bani odată cu altceva —
 * așa că ștergerea trebuie cerută cu voce tare. Fără rândul ăsta, jobul de
 * curățenie ar fi picat la prima comandă plătită ajunsă la capătul celor 24 de
 * luni, iar politica de retenție n-ar mai fi fost respectată.
 *
 * Versurile, piesele, emailurile și urma auditabilă pleacă în cascadă.
 */
export async function stergeComanda(
  order: Pick<Order, 'id' | 'publicId'>,
): Promise<void> {
  await rm(orderDir(order.publicId), { recursive: true, force: true });
  await db.delete(payments).where(eq(payments.orderId, order.id));
  await db.delete(orders).where(eq(orders.id, order.id));
}
