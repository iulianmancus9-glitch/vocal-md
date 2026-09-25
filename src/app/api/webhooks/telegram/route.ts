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
import { orders, webhookEvents } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { deblocheaza, respinge } from '@/lib/comenzi';
import { logEvent } from '@/lib/orders';
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
    /* Aceleași funcții pe care le cheamă și panoul. Două copii ar fi însemnat
       că, la a treia schimbare, una face altceva decât cealaltă. */
    const order = await db.query.orders.findFirst({
      where: eq(orders.publicId, press.publicId),
    });

    const result = !order
      ? `Nu găsesc comanda ${press.publicId}.`
      : press.action === 'ok'
        ? await deblocheaza(order, press.from)
        : await respinge(order, press.from);

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
