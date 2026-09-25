/**
 * Intrarea în panou.
 *
 * Nu există conturi, pentru că nu e nevoie: există un singur om care intră.
 * O parolă în `.env` și un bilet semnat, ținut în cookie.
 *
 * ── De ce un bilet semnat și nu o sesiune în baza de date ──
 *
 * O sesiune în bază ar cere un tabel, o migrare și o curățare periodică, ca să
 * rezolve o problemă pe care n-o avem: nu trebuie să putem închide sesiunea
 * altcuiva. Biletul își poartă singur data de expirare, iar semnătura cu
 * `APP_SECRET` face imposibil de fabricat unul.
 *
 * Schimbarea lui `APP_SECRET` invalidează toate biletele deodată — ăsta e
 * butonul de „scoate pe toată lumea afară", dacă vreodată e nevoie.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

const COOKIE = 'vocal_panou';
/** Cât ține o intrare. O lună: e panoul lui, de pe telefonul lui. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function sign(value: string): string {
  return createHmac('sha256', env.APP_SECRET).update(value).digest('hex');
}

/** Comparație în timp constant. O comparație obișnuită se oprește la prima
 *  literă greșită, iar din cât durează se poate ghici valoarea, literă cu
 *  literă. */
function same(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}

export function panelEnabled(): boolean {
  return Boolean(env.PANEL_PASSWORD);
}

/** Parola e bună? Fără parolă configurată, nimeni nu intră. */
export function passwordOk(given: string): boolean {
  if (!env.PANEL_PASSWORD) return false;
  return same(given, env.PANEL_PASSWORD);
}

export async function signIn(): Promise<void> {
  const expires = Date.now() + TTL_MS;
  const token = `${expires}.${sign(String(expires))}`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(TTL_MS / 1000),
  });
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** E cineva înăuntru? Se cheamă la fiecare pagină din panou. */
export async function signedIn(): Promise<boolean> {
  if (!panelEnabled()) return false;

  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;

  const [expires, signature] = raw.split('.');
  if (!expires || !signature) return false;
  if (!same(signature, sign(expires))) return false;

  return Number(expires) > Date.now();
}
