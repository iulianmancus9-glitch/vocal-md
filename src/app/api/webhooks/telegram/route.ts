/**
 * Webhook-ul Telegram — aici se deblochează melodiile.
 *
 * Adresa asta e cea mai periculoasă din tot proiectul: cine o poate chema poate
 * debloca melodii fără să plătească. De asta se verifică întâi antetul secret
 * pe care Telegram îl trimite înapoi la fiecare apel, și abia apoi se citește
 * ceva din corpul cererii.
 *
 * Secretul se compară cu `timingSafeEqual`, nu cu `===`: o comparație obișnuită
 * se oprește la prima literă greșită, iar din cât durează se poate ghici
 * secretul, literă cu literă.
 *
 * Telegram retrimite o apăsare până primește 200, deci aceeași apăsare poate
 * veni de mai multe ori. `update_id` e unic pe bot și e cheia după care a doua
 * livrare nu mai face nimic.
 */
import { timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, payments, webhookEvents } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { logEvent, paidExpiry, unpaidExpiry } from '@/lib/orders';
import { PROVIDER } from '@/lib/plata';
import { enqueue } from '@/lib/queue/queue';
import { resetLimits } from '@/lib/rate-limit';
import { answerCallback, closeMessage, esc, notify, telegramEnabled } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

function secretOk(header: string | null): boolean {
  if (!header || !env.TELEGRAM_WEBHOOK_SECRET) return false;
  const a = Buffer.from(header, 'utf8');
  const b = Buffer.from(env.TELEGRAM_WEBHOOK_SECRET, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

interface Press {
  updateId: string;
  callbackId: string;
  chatId: number | string;
  messageId: number;
  /** Cine a apăsat — ajunge în jurnal, ca să se știe cine a deblocat. */
  from: string;
  action: 'ok' | 'no';
  publicId: string;
}

/** Banii s-au văzut: comanda se deschide și livrarea intră în coadă. */
async function unlock(press: Press): Promise<string> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.publicId, press.publicId),
  });
  if (!order) return `Nu găsesc comanda ${press.publicId}.`;
  if (order.status === 'paid' || order.status === 'delivered') {
    return `Comanda ${press.publicId} era deja deblocată.`;
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
      rawPayload: { confirmatDe: press.from, prin: 'telegram', la: new Date().toISOString() },
    })
    .onConflictDoNothing({ target: [payments.provider, payments.transactionId] });

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

  await logEvent(order.id, 'paid', { prin: 'telegram', confirmatDe: press.from });
  await enqueue('deliver', order.id);

  // A plătit, deci limita zilnică nu-l mai privește: e liber să înceapă o a
  // doua melodie, cadou pentru altcineva, fără să fie oprit la primul text.
  await resetLimits({ ip: order.consentIp, email: order.email });

  return `Comanda ${press.publicId} e deblocată. Emailul cu melodia pleacă singur.`;
}

/**
 * Banii nu s-au văzut — sau au fost dați înapoi.
 *
 * Aceeași apăsare acoperă două lucruri, pentru că fac exact același lucru la
 * noi: comanda se întoarce la previzualizare. Păstrează minutul gratuit, pierde
 * fișierele integrale. Ruta de audio verifică starea la fiecare cerere, deci
 * accesul se închide imediat, nu la următoarea repornire.
 *
 * Pe o comandă deja deblocată, asta e rambursarea: banii îi dai înapoi din
 * MAIB, iar butonul închide accesul. Nu se poate apăsa din greșeală mai târziu,
 * pentru că butoanele dispar din mesaj după prima apăsare.
 */
async function reject(press: Press): Promise<string> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.publicId, press.publicId),
  });
  if (!order) return `Nu găsesc comanda ${press.publicId}.`;

  const wasPaid = order.status === 'paid' || order.status === 'delivered';
  if (!wasPaid && order.status !== 'payment_claimed') {
    return `Comanda ${press.publicId} nu aștepta o confirmare.`;
  }

  if (wasPaid) {
    await db
      .update(payments)
      .set({ status: 'refunded', refundedCents: Math.round(env.SONG_PRICE_EUR * 100), updatedAt: new Date() })
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

  await logEvent(order.id, wasPaid ? 'refunded' : 'payment_rejected', {
    prin: 'telegram',
    respinsDe: press.from,
  });

  return wasPaid
    ? `Comanda ${press.publicId} s-a închis la loc. Nu uita să dai banii înapoi din MAIB.`
    : `Comanda ${press.publicId} s-a întors la previzualizare. Clientul poate încerca din nou.`;
}

/**
 * `/limite <ceva>` — șterge limitele zilnice ale unui client.
 *
 * Limitele apără previzualizarea gratuită, care ne costă credite Suno. Uneori
 * însă opresc pe cine nu trebuie: doi frați pe același wi-fi, un client care
 * s-a răzgândit de câteva ori, sau tu în timp ce încerci site-ul.
 *
 * `ceva` poate fi, în ordinea în care le recunoaștem:
 *   · numărul comenzii — cel mai comod, îl ai în mesajele de mai sus;
 *     îi ia singur și emailul, și IP-ul;
 *   · o adresă de email;
 *   · un IP.
 */
async function resetCommand(argument: string, from: string): Promise<string> {
  const value = argument.trim();
  if (!value) {
    return '👉 Scrie <code>/limite</code> urmat de numărul comenzii, de email sau de IP.';
  }

  if (/^[a-z2-9]{12}$/.test(value)) {
    const order = await db.query.orders.findFirst({ where: eq(orders.publicId, value) });
    if (!order) return `Nu găsesc comanda <code>${esc(value)}</code>.`;
    await resetLimits({ ip: order.consentIp, email: order.email });
    await logEvent(order.id, 'limits_reset', { prin: 'telegram', de: from });
    return `✅ Limitele pentru comanda <code>${esc(value)}</code> sunt șterse.\n` +
      `Email: <code>${esc(order.email)}</code> · IP: <code>${esc(order.consentIp)}</code>`;
  }

  if (value.includes('@')) {
    await resetLimits({ email: value });
    return `✅ Limitele pentru <code>${esc(value)}</code> sunt șterse.`;
  }

  await resetLimits({ ip: value });
  return `✅ Limitele pentru IP-ul <code>${esc(value)}</code> sunt șterse.`;
}

const AJUTOR =
  '<b>Ce știu să fac</b>\n\n' +
  '<code>/limite &lt;comandă|email|IP&gt;</code> — șterge limitele zilnice ale unui client.\n' +
  'Exemplu: <code>/limite a7k2m9x4p3qd</code>\n\n' +
  'Restul se face din butoanele de sub mesajele care vin singure.';

export async function POST(req: Request) {
  if (!secretOk(req.headers.get('x-telegram-bot-api-secret-token'))) {
    return new Response('Secret invalid', { status: 401 });
  }
  if (!telegramEnabled()) {
    return new Response('Telegram nu e configurat', { status: 503 });
  }

  let press: Press | null = null;
  let raw: Record<string, unknown> = {};
  try {
    raw = (await req.json()) as Record<string, unknown>;
    const cb = raw.callback_query as Record<string, unknown> | undefined;
    if (cb) {
      const message = (cb.message ?? {}) as Record<string, unknown>;
      const chat = (message.chat ?? {}) as Record<string, unknown>;
      const from = (cb.from ?? {}) as Record<string, unknown>;
      const [action, publicId] = String(cb.data ?? '').split(':');

      if ((action === 'ok' || action === 'no') && publicId) {
        press = {
          updateId: String(raw.update_id ?? ''),
          callbackId: String(cb.id ?? ''),
          chatId: (chat.id as number) ?? env.TELEGRAM_CHAT_ID,
          messageId: Number(message.message_id ?? 0),
          from: String(from.username ?? from.first_name ?? from.id ?? 'necunoscut'),
          action,
          publicId,
        };
      }
    }

    /**
     * Un mesaj scris de mână în chat. Se răspunde numai în chat-ul nostru: un
     * bot are numele public, iar cine îl găsește îi poate scrie oricând.
     */
    const msg = raw.message as Record<string, unknown> | undefined;
    if (msg && !press) {
      const chat = (msg.chat ?? {}) as Record<string, unknown>;
      const who = (msg.from ?? {}) as Record<string, unknown>;
      const text = String(msg.text ?? '').trim();

      if (text.startsWith('/') && String(chat.id) === String(env.TELEGRAM_CHAT_ID)) {
        /**
         * `/limite@botul_meu argument` — Telegram lipește numele botului.
         *
         * Valorile implicite nu sunt de prisos: `noUncheckedIndexedAccess`
         * spune adevărul despre orice indexare, iar `split` pe un șir gol poate
         * întoarce mai puțin decât pare la prima vedere.
         */
        const [rawCmd = '', ...rest] = text.split(/\s+/);
        const cmd = (rawCmd.split('@')[0] ?? '').toLowerCase();
        const from = String(who.username ?? who.first_name ?? who.id ?? 'necunoscut');

        if (cmd === '/limite') {
          await notify(await resetCommand(rest.join(' '), from));
        } else {
          await notify(AJUTOR);
        }
      }
      return new Response('ok', { status: 200 });
    }
  } catch (err) {
    console.error('Webhook Telegram cu conținut necitibil:', err);
    return new Response('Conținut invalid', { status: 400 });
  }

  // Orice altceva nu ne privește. Răspundem 200, altfel Telegram retrimite.
  if (!press) return new Response('ok', { status: 200 });

  /**
   * Cine a apăsat contează. Botul răspunde doar în chat-ul nostru: altfel, cine
   * află numele botului i-ar putea scrie, ar primi butoanele și ar debloca
   * singur melodii.
   */
  if (String(press.chatId) !== String(env.TELEGRAM_CHAT_ID)) {
    await answerCallback(press.callbackId, 'Nu ai voie să faci asta.');
    return new Response('ok', { status: 200 });
  }

  const inserted = await db
    .insert(webhookEvents)
    .values({
      provider: 'telegram',
      eventId: press.updateId,
      eventType: `buton:${press.action}`,
      payload: raw,
    })
    .onConflictDoNothing({ target: [webhookEvents.provider, webhookEvents.eventId] })
    .returning({ id: webhookEvents.id });

  if (inserted.length === 0) return new Response('ok (deja procesat)', { status: 200 });

  try {
    const result = press.action === 'ok' ? await unlock(press) : await reject(press);

    await answerCallback(press.callbackId, result);
    await closeMessage(
      press.chatId,
      press.messageId,
      press.action === 'ok'
        ? `✅ <b>Deblocată</b> — ${esc(result)}`
        : `❌ <b>Respinsă</b> — ${esc(result)}`,
    );

    await db
      .update(webhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(webhookEvents.id, inserted[0]!.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Apăsarea de pe Telegram a eșuat:', err);
    await db
      .update(webhookEvents)
      .set({ error: message.slice(0, 1000) })
      .where(eq(webhookEvents.id, inserted[0]!.id));
    await answerCallback(press.callbackId, 'A dat eroare. Încearcă din nou.');
    // 500 face ca Telegram să retrimită — exact ce vrem la o eroare de-a noastră.
    return new Response('Eroare la procesare', { status: 500 });
  }

  return new Response('ok', { status: 200 });
}
