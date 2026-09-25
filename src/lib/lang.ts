/**
 * Ce limbă primește vizitatorul.
 *
 * Se hotărăște pe server, nu în browser: dacă pagina s-ar traduce după
 * hidratare, primul cadru ar fi în limba greșită și React s-ar plânge de
 * nepotrivire. Două surse, în ordine:
 *
 *   1. cookie-ul `lang` — omul a apăsat comutatorul, alegerea lui bate tot;
 *   2. `DEFAULT_LANG` din `.env` — pentru toți ceilalți.
 *
 * ── De ce nu ne mai uităm la `Accept-Language` ──
 *
 * Pentru că minte exact în piața noastră. Foarte mulți oameni din Moldova și
 * din România au telefonul și browserul în engleză, dar vorbesc românește — iar
 * ei primeau un site englezesc și trebuiau să-l comute de fiecare dată.
 * Antetul spune ce limbă are aparatul, nu ce limbă vorbește omul.
 *
 * Cine chiar vrea engleză o are la un buton distanță, iar alegerea lui se ține
 * minte în cookie de atunci încolo.
 */
import { cookies } from 'next/headers';
import { isLang, type Lang } from '@/lib/i18n';

export function defaultLang(): Lang {
  const v = process.env.DEFAULT_LANG;
  return isLang(v) ? v : 'ro';
}

export async function pageLang(): Promise<Lang> {
  const chosen = (await cookies()).get('lang')?.value;
  return isLang(chosen) ? chosen : defaultLang();
}
