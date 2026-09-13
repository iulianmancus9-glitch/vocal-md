/**
 * Limitele care apără previzualizarea gratuită.
 *
 * Versurile costă câțiva cenți, dar o previzualizare înseamnă o generare Suno
 * completă, plătită de noi. Fără limită, o singură persoană poate goli contul
 * într-o după-amiază, iar noi aflăm abia când se oprește site-ul.
 *
 * Numărătoarea stă în Postgres, nu în memoria procesului: web-ul și worker-ul
 * sunt containere separate, iar o repornire nu are voie să reseteze limita.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

export type LimitAction = 'lyrics' | 'render';

export interface LimitResult {
  ok: boolean;
  /** Câte au mai rămas azi. */
  remaining: number;
  limit: number;
}

/** Ziua curentă, ca text. Fereastra se resetează la miezul nopții UTC. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function endOfDay(): Date {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Crește contorul și spune dacă cererea încape sub limită.
 *
 * Incrementul și citirea sunt o singură instrucțiune, ca două cereri simultane
 * să nu treacă amândouă pe ultimul loc rămas.
 */
async function bump(bucket: string, limit: number): Promise<LimitResult> {
  const { rows } = await db.execute<{ count: number }>(sql`
    insert into rate_limits (bucket, count, expires_at)
         values (${bucket}, 1, ${endOfDay()})
    on conflict (bucket)
      do update set count = rate_limits.count + 1
      returning count
  `);

  const count = rows[0]?.count ?? 1;
  return { ok: count <= limit, remaining: Math.max(0, limit - count), limit };
}

/**
 * Verifică limita pe IP și, dacă avem emailul, și pe email. Trece doar ce trece
 * pe amândouă — altfel ar fi de ajuns un email nou la fiecare încercare.
 */
export async function checkLimit(
  action: LimitAction,
  { ip, email }: { ip: string; email?: string | null },
): Promise<LimitResult> {
  const day = today();

  const ipLimit =
    action === 'render' ? env.MAX_RENDERS_PER_IP_PER_DAY : env.MAX_LYRICS_PER_IP_PER_DAY;

  const byIp = await bump(`${action}:ip:${ip}:${day}`, ipLimit);
  if (!byIp.ok) return byIp;

  if (action === 'render' && email) {
    const byEmail = await bump(
      `${action}:email:${email.toLowerCase()}:${day}`,
      env.MAX_RENDERS_PER_EMAIL_PER_DAY,
    );
    if (!byEmail.ok) return byEmail;
  }

  return byIp;
}

/**
 * IP-ul real al vizitatorului. Caddy pune CF-Connecting-IP în X-Real-IP, pentru că
 * altfel am vedea doar adresele Cloudflare și am limita toată lumea deodată.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get('x-real-ip') ??
    headers.get('cf-connecting-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '0.0.0.0'
  );
}
