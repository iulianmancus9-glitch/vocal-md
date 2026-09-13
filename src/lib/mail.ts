/**
 * Emailurile către client.
 *
 * Două, atât: unul când melodia e gata de ascultat, altul după plată, cu
 * fișierele. Fiecare trimitere se scrie în tabelul `emails` — „nu am primit
 * melodia" e reclamația numărul unu la genul ăsta de serviciu, iar răspunsul
 * trebuie să fie o interogare, nu o presupunere.
 */
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { emails, type Order } from '@/lib/db/schema';
import { env } from '@/lib/env';

let client: Resend | undefined;

function resend(): Resend {
  if (!env.RESEND_API_KEY) throw new Error('Lipsește RESEND_API_KEY din .env.');
  client ??= new Resend(env.RESEND_API_KEY);
  return client;
}

export function mailEnabled(): boolean {
  return Boolean(env.RESEND_API_KEY);
}

/** Scapă textul care intră în HTML: un nume cu `<` nu are voie să rupă pagina. */
function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface Button {
  label: string;
  url: string;
}

/**
 * Șablonul comun. Tabele și stiluri în linie, pentru că multe clienți de email
 * ignoră foile de stil și aruncă ce nu înțeleg.
 */
function layout({ title, lines, button, footer }: {
  title: string;
  lines: string[];
  button?: Button;
  footer?: string;
}): string {
  const body = lines.map((l) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3F3F4B;">${l}</p>`).join('');
  const cta = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
         <tr><td style="border-radius:12px;background:#6C5CE7;">
           <a href="${esc(button.url)}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${esc(button.label)}</a>
         </td></tr>
       </table>`
    : '';

  return `<!doctype html>
<html lang="ro"><body style="margin:0;padding:0;background:#F6F5FA;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F5FA;padding:28px 14px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;padding:32px 28px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
    <tr><td>
      <p style="margin:0 0 22px;font-size:15px;font-weight:700;letter-spacing:.16em;color:#16161D;">VOCAL MD</p>
      <h1 style="margin:0 0 16px;font-size:23px;line-height:1.3;color:#16161D;">${esc(title)}</h1>
      ${body}
      ${cta}
      <p style="margin:22px 0 0;padding-top:18px;border-top:1px solid #ECECF1;font-size:12px;line-height:1.6;color:#767686;">
        ${footer ?? ''}
        ${footer ? '<br><br>' : ''}
        S.R.L. „WADE PRODUCTION” · base.vocalmd@gmail.com
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

async function send(
  order: Order,
  template: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!order.email) return;

  const [row] = await db
    .insert(emails)
    .values({ orderId: order.id, toEmail: order.email, template, subject, status: 'queued' })
    .returning();

  try {
    const result = await resend().emails.send({
      from: env.MAIL_FROM,
      to: order.email,
      replyTo: env.MAIL_REPLY_TO,
      subject,
      html,
    });
    if (result.error) throw new Error(result.error.message);

    await db
      .update(emails)
      .set({ status: 'sent', sentAt: new Date(), providerMessageId: result.data?.id ?? null })
      .where(eq(emails.id, row!.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(emails).set({ status: 'failed', error: message.slice(0, 1000) })
      .where(eq(emails.id, row!.id));
    throw err;
  }
}

const orderUrl = (order: Order) =>
  `${env.APP_URL}/comanda/${order.publicId}?t=${order.accessToken}`;

/** Melodia e gata de ascultat, dar încă neplătită. */
export async function sendPreviewReady(order: Order): Promise<void> {
  const title = order.songTitle ?? 'Melodia ta';
  await send(
    order,
    'preview_ready',
    `„${title}" e gata de ascultat`,
    layout({
      title: 'Melodia ta e gata.',
      lines: [
        `Am înregistrat <strong>„${esc(title)}"</strong> în două interpretări. Ascultă-le pe amândouă și alege-o pe cea care îți place.`,
        'Primul minut e gratuit. Plătești doar dacă te-a convins ce auzi.',
      ],
      button: { label: 'Ascultă melodia', url: orderUrl(order) },
      footer: 'Dacă nu cumperi, păstrăm melodia 30 de zile și pe urmă o ștergem.',
    }),
  );
}

/** După plată: fișierele integrale. */
export async function sendDelivery(
  order: Order,
  links: { variant: number; url: string }[],
): Promise<void> {
  const title = order.songTitle ?? 'Melodia ta';
  const list = links
    .map((l) => `<a href="${esc(l.url)}" style="color:#6C5CE7;">Descarcă varianta ${l.variant}</a>`)
    .join(' &nbsp;·&nbsp; ');

  await send(
    order,
    'delivery',
    `„${title}" — melodia ta completă`,
    layout({
      title: 'Melodia e a ta.',
      lines: [
        `<strong>„${esc(title)}"</strong>, integral, în ambele interpretări.`,
        list,
        'O poți descărca oricând din pagina comenzii, timp de 24 de luni.',
      ],
      button: { label: 'Deschide melodia', url: orderUrl(order) },
      footer:
        'Linkurile directe de mai sus expiră într-o zi, din motive de securitate. ' +
        'Butonul funcționează oricând — de acolo îți generezi linkuri noi.',
    }),
  );
}
