/**
 * Telegram — panoul de control al comenzilor, pe telefon.
 *
 * Trei feluri de mesaje pleacă de aici:
 *   1. o melodie a intrat la înregistrare — ca omul să fie pregătit;
 *   2. un client a deschis linkul de plată — urmează, probabil, banii;
 *   3. un client spune că a plătit — mesajul ăsta are două butoane.
 *
 * Regula fără de care tot fluxul s-ar strica: **nimic de aici nu are voie să
 * arunce mai departe.** Dacă Telegram e căzut, sau tokenul e greșit, clientul
 * tot trebuie să poată cere melodia și să-și anunțe plata. Notificarea e un
 * ajutor pentru noi, nu o verigă din lanțul lui. De asta fiecare funcție
 * înghite eroarea și o scrie doar în jurnal.
 */
import { env } from '@/lib/env';

const API = 'https://api.telegram.org';

/** Butoanele de sub un mesaj. `data` se întoarce la noi, prin webhook. */
export interface Button {
  text: string;
  data: string;
}

export function telegramEnabled(): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
}

async function call(method: string, payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${API}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    // Telegram răspunde în câteva zeci de milisecunde. Dacă nu răspunde în
    // zece secunde, e căzut — iar noi n-avem de ce să ținem clientul să aștepte.
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!body.ok) throw new Error(body.description ?? `HTTP ${res.status}`);
  return body;
}

/**
 * Trimite un mesaj, cu sau fără butoane.
 *
 * Textul e HTML, nu Markdown: numele oamenilor și titlurile melodiilor conțin
 * des caractere pe care Markdown le ia drept formatare și atunci Telegram
 * refuză tot mesajul. În HTML e de scăpat un singur lucru, și îl scăpăm noi.
 */
export async function notify(text: string, buttons: Button[] = []): Promise<void> {
  if (!telegramEnabled()) return;
  try {
    await call('sendMessage', {
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(buttons.length
        ? {
            reply_markup: {
              inline_keyboard: [buttons.map((b) => ({ text: b.text, callback_data: b.data }))],
            },
          }
        : {}),
    });
  } catch (err) {
    console.error('Notificarea pe Telegram nu a plecat:', err);
  }
}

/**
 * Închide rotița de pe butonul apăsat.
 *
 * Fără asta, Telegram lasă butonul „în lucru" cam un minut și omul apasă a doua
 * oară, crezând că nu s-a înregistrat.
 */
export async function answerCallback(callbackId: string, text: string): Promise<void> {
  if (!telegramEnabled()) return;
  try {
    await call('answerCallbackQuery', { callback_query_id: callbackId, text });
  } catch (err) {
    console.error('Nu am putut răspunde la apăsarea de buton:', err);
  }
}

/**
 * Rescrie mesajul după ce s-a apăsat, și îi scoate butoanele.
 *
 * Așa se vede în istoric ce s-a hotărât pentru fiecare comandă, iar butoanele
 * nu mai pot fi apăsate a doua oară, peste o săptămână, din greșeală.
 */
export async function closeMessage(
  chatId: number | string,
  messageId: number,
  text: string,
): Promise<void> {
  if (!telegramEnabled()) return;
  try {
    await call('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('Nu am putut rescrie mesajul de pe Telegram:', err);
  }
}

/** Scapă ce ar putea fi luat drept etichetă HTML într-un text scris de client. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
