/**
 * Fișierele audio pe disc, plus linkurile semnate prin care ajung la client.
 *
 * Nimic nu stă în /public: un fișier integral nu are voie să fie descărcabil de
 * cineva care ghicește URL-ul. Fiecare descărcare trece printr-un route handler
 * care verifică semnătura și, pentru varianta integrală, și plata.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '@/lib/env';

/** Toate fișierele unei comenzi stau împreună: <STORAGE_DIR>/<publicId>/ */
export function orderDir(publicId: string): string {
  return join(env.STORAGE_DIR, publicId);
}

export async function ensureOrderDir(publicId: string): Promise<string> {
  const dir = orderDir(publicId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export type TrackKind = 'full' | 'preview';

/** Calea relativă păstrată în `order_tracks`; absolutul se calculează la citire. */
export function trackRelPath(publicId: string, variant: number, kind: TrackKind): string {
  return `${publicId}/varianta-${variant}-${kind === 'full' ? 'integrala' : 'preview'}.mp3`;
}

export function absPath(relPath: string): string {
  return join(env.STORAGE_DIR, relPath);
}

/* ─── linkuri semnate ─── */

function sign(payload: string): string {
  return createHmac('sha256', env.APP_SECRET).update(payload).digest('base64url');
}

/**
 * Semnătura leagă comanda, varianta, tipul fișierului și momentul expirării.
 * Schimbarea oricăruia invalidează linkul, deci nu se poate „promova" o
 * previzualizare la fișier integral schimbând un cuvânt în URL.
 */
export function signDownload(
  publicId: string,
  variant: number,
  kind: TrackKind,
  ttlSeconds = env.DOWNLOAD_LINK_TTL,
): { exp: number; sig: string } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return { exp, sig: sign(`${publicId}:${variant}:${kind}:${exp}`) };
}

export function verifyDownload(
  publicId: string,
  variant: number,
  kind: TrackKind,
  exp: number,
  sig: string,
): boolean {
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = Buffer.from(sign(`${publicId}:${variant}:${kind}:${exp}`));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function downloadUrl(
  publicId: string,
  variant: number,
  kind: TrackKind,
  ttlSeconds?: number,
): string {
  const { exp, sig } = signDownload(publicId, variant, kind, ttlSeconds);
  return `${env.APP_URL}/api/audio/${publicId}/${variant}/${kind}?exp=${exp}&sig=${sig}`;
}
