/**
 * Ce limbă primește vizitatorul.
 *
 * Se hotărăște pe server, nu în browser: dacă pagina s-ar traduce după
 * hidratare, primul cadru ar fi în limba greșită și React s-ar plânge de
 * nepotrivire. Trei surse, în ordine:
 *
 *   1. cookie-ul `lang` — omul a apăsat comutatorul, alegerea lui bate tot;
 *   2. antetul `Accept-Language` — un browser care cere română primește română,
 *      ca un client de acasă să nu dea peste un site englezesc;
 *   3. `DEFAULT_LANG` din `.env` — restul lumii.
 *
 * `DEFAULT_LANG` e acum `en`. Paddle verifică site-ul din Marea Britanie, iar
 * un om care nu înțelege pagina nu poate confirma ce se vinde pe ea — de trei
 * ori a răspuns că „produsul principal nu este un produs sau serviciu digital".
 * După aprobare se pune `ro` în `.env` și se repornește; nimic altceva.
 */
import { cookies, headers } from 'next/headers';
import { isLang, type Lang } from '@/lib/i18n';

export function defaultLang(): Lang {
  const v = process.env.DEFAULT_LANG;
  return isLang(v) ? v : 'en';
}

/** Prima limbă cunoscută cerută de browser, dacă e vreuna. */
function fromHeader(accept: string | null): Lang | null {
  if (!accept) return null;
  for (const part of accept.split(',')) {
    const tag = part.split(';')[0]!.trim().toLowerCase();
    if (tag.startsWith('ro')) return 'ro';
    if (tag.startsWith('en')) return 'en';
  }
  return null;
}

export async function pageLang(): Promise<Lang> {
  const chosen = (await cookies()).get('lang')?.value;
  if (isLang(chosen)) return chosen;

  const asked = fromHeader((await headers()).get('accept-language'));
  return asked ?? defaultLang();
}
