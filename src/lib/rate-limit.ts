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
import { inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { rateLimits } from '@/lib/db/schema';
import { notify } from '@/lib/telegram';

export type LimitAction = 'lyrics' | 'render' | 'panou';

export interface LimitResult {
  ok: boolean;
  /** Câte au mai rămas azi. */
  remaining: number;
  limit: number;
  /** A câta cerere a fost asta. Din ea se vede cine trece pragul primul. */
  count: number;
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
  return { ok: count <= limit, remaining: Math.max(0, limit - count), limit, count };
}

/** IP-urile scutite, citite o dată. */
let exempt: Set<string> | undefined;

function isExempt(ip: string): boolean {
  exempt ??= new Set(
    env.RATE_LIMIT_EXEMPT_IPS.split(',').map((v) => v.trim()).filter(Boolean),
  );
  return exempt.has(ip);
}

/**
 * Verifică limita pe IP și, dacă avem emailul, și pe email. Trece doar ce trece
 * pe amândouă — altfel ar fi de ajuns un email nou la fiecare încercare.
 */
export async function checkLimit(
  action: LimitAction,
  {
    ip,
    email,
    visitor,
    trusted = false,
  }: { ip: string; email?: string | null; visitor?: string | null; trusted?: boolean },
): Promise<LimitResult> {
  // Adresele tale nu se numără deloc: nici contor, nici plafon.
  if (isExempt(ip)) return { ok: true, remaining: Number.MAX_SAFE_INTEGER, limit: 0, count: 0 };

  const day = today();
  const free: LimitResult = { ok: true, remaining: Number.MAX_SAFE_INTEGER, limit: 0, count: 0 };

  /**
   * Plafonul pe tot site-ul se numără înaintea oricărui altuia și se aplică
   * tuturor, inclusiv clienților plătitori.
   *
   * El nu e o regulă de corectitudine, ci frâna de mână pe bani: e singura
   * limită pe care n-o poate ocoli nici cine șterge cookie-uri, nici cine
   * schimbă adresa, nici cine inventează emailuri.
   */
  if (action === 'render') {
    const all = await bump(`render:all:${day}`, env.MAX_RENDERS_PER_DAY);
    if (!all.ok) {
      // Exact cererea care trece pragul, nu și cele de după ea. Altfel fiecare
      // cerere blocată ar mai trimite un mesaj, iar alarma s-ar îneca în ea însăși.
      if (all.count === all.limit + 1) {
        void notify(
          `🛑 <b>S-a atins plafonul zilnic de înregistrări</b> (${all.limit}).\n\n` +
          `Nu se mai generează nimic până mâine. Dacă e trafic adevărat, ` +
          `urcă <code>MAX_RENDERS_PER_DAY</code> în .env. Dacă nu, cineva încearcă ` +
          `să consume credite.`,
        );
      }
      return all;
    }
  }

  /**
   * Cine a plătit vreodată de pe browserul ăsta trece mai departe.
   *
   * Limitele apără previzualizarea gratuită de cine vine s-o consume degeaba.
   * Un om care a dat 30 € nu e ăla — iar dacă vrea a doua melodie, cadou pentru
   * altcineva, n-are de ce să fie oprit la primul text.
   */
  if (trusted) return free;

  if (visitor) {
    const visitorLimit = action === 'render'
      ? env.MAX_RENDERS_PER_VISITOR_PER_DAY
      : env.MAX_LYRICS_PER_VISITOR_PER_DAY;
    const byVisitor = await bump(`${action}:v:${visitor}:${day}`, visitorLimit);
    if (!byVisitor.ok) return byVisitor;
  }

  const ipLimit = {
    render: env.MAX_RENDERS_PER_IP_PER_DAY,
    lyrics: env.MAX_LYRICS_PER_IP_PER_DAY,
    // Parola panoului e un singur cuvânt, iar o adresă lăsată liberă poate fi
    // încercată de zeci de mii de ori pe minut. Zece pe zi e mai mult decât îi
    // trebuie unui om care și-a uitat parola.
    panou: env.MAX_PANEL_TRIES_PER_DAY,
  }[action];

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
 * Șterge contoarele de azi ale unui client. Se cheamă când a plătit.
 *
 * Limitele apără previzualizarea gratuită, care ne costă credite Suno. Cineva
 * care tocmai a plătit 30 € nu mai e riscul de care ne apăram — iar el e exact
 * omul care vrea o a doua melodie, cadou pentru altcineva.
 *
 * Fără asta, limita zilnică rămânea pe el și după cumpărare: începea o melodie
 * nouă, completa tot formularul și nu primea nici măcar primul text. Din partea
 * lui arăta ca un site stricat, nu ca o limită.
 *
 * Ștergem și după IP, și după email, pentru că `checkLimit` numără pe amândouă
 * și ar fi de ajuns unul rămas ca să-l oprească.
 */
export async function resetLimits(
  { ip, email }: { ip?: string | null; email?: string | null },
): Promise<void> {
  const day = today();
  const buckets: string[] = [];

  if (ip) buckets.push(`lyrics:ip:${ip}:${day}`, `render:ip:${ip}:${day}`);
  if (email) {
    const e = email.toLowerCase();
    buckets.push(`lyrics:email:${e}:${day}`, `render:email:${e}:${day}`);
  }
  if (buckets.length === 0) return;

  try {
    await db.delete(rateLimits).where(inArray(rateLimits.bucket, buckets));
  } catch (err) {
    // O limită nereseta nu are voie să strice deblocarea: omul are melodia,
    // iar contorul se golește oricum la miezul nopții.
    console.error('Nu am putut reseta limitele:', err);
  }
}

/**
 * IP-ul real al vizitatorului.
 *
 * Se caută în mai multe anteturi pentru că depinde ce stă în față: cu Cloudflare
 * adresa vine în CF-Connecting-IP, pe care Caddy îl mută în X-Real-IP; fără
 * Cloudflare rămâne X-Forwarded-For, pus de Caddy.
 *
 * Anteturile goale se sar, nu se acceptă. Un Caddy configurat pentru Cloudflare
 * pe un domeniu care nu e în spatele lui trimite X-Real-IP gol — iar un șir gol
 * ar fi trecut de `??` ca valoare bună. Atunci toți vizitatorii ar fi ajuns în
 * aceeași găleată de limitare și s-ar fi blocat unii pe alții.
 */
export function clientIp(headers: Headers): string {
  const candidates = [
    headers.get('x-real-ip'),
    headers.get('cf-connecting-ip'),
    headers.get('x-forwarded-for')?.split(',')[0],
  ];
  for (const value of candidates) {
    const ip = value?.trim();
    if (ip) return ip;
  }
  return '0.0.0.0';
}
