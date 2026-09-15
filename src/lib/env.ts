/**
 * Configurarea aplicației, citită o singură dată din process.env și validată.
 *
 * Dacă lipsește ceva esențial, aplicația se oprește la pornire cu un mesaj clar,
 * nu peste trei zile în mijlocul unei comenzi plătite.
 */
import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.url().default('http://localhost:3000'),
  APP_SECRET: z.string().min(32, 'APP_SECRET trebuie să aibă minimum 32 de caractere'),

  DATABASE_URL: z.string().startsWith('postgres'),

  OPENROUTER_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default('google/gemini-2.5-pro'),
  GEMINI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.9),

  SUNO_API_KEY: z.string().min(1),
  SUNO_MODEL: z.string().default('V6'),
  SUNO_CALLBACK_URL: z.url(),

  STORAGE_DIR: z.string().default('/data/audio'),
  PREVIEW_SECONDS: z.coerce.number().int().positive().default(60),
  DOWNLOAD_LINK_TTL: z.coerce.number().int().positive().default(86_400),

  PADDLE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  PADDLE_API_KEY: z.string().default(''),
  PADDLE_CLIENT_TOKEN: z.string().default(''),
  PADDLE_PRICE_ID: z.string().default(''),
  PADDLE_WEBHOOK_SECRET: z.string().default(''),
  SONG_PRICE_EUR: z.coerce.number().positive().default(30),

  /**
   * Cheia pentru exportul în Google Sheets. Stă în adresa pe care o pune omul în
   * foaie, deci e separată de tot restul: nu dă acces la nimic altceva și se
   * poate schimba fără să afecteze site-ul.
   */
  EXPORT_KEY: z.string().default(''),

  RESEND_API_KEY: z.string().default(''),
  MAIL_FROM: z.string().default('Vocal MD <comenzi@vocal.md>'),
  MAIL_REPLY_TO: z.string().default('base.vocalmd@gmail.com'),

  /**
   * Câte înregistrări în plus poate cere un client, peste prima.
   *
   * Fiecare e o generare Suno completă, plătită de noi, pe o comandă care poate
   * foarte bine să nu se cumpere. 2 înseamnă că o comandă neconvertită ne poate
   * costa de trei ori mai mult decât înainte.
   */
  MAX_EXTRA_RENDERS: z.coerce.number().int().min(0).max(5).default(2),
  MAX_LYRICS_REGENS: z.coerce.number().int().min(0).max(5).default(2),

  // O comandă poate consuma acum până la 1 + MAX_EXTRA_RENDERS generări, deci
  // limita zilnică pe IP trebuie să lase loc pentru câteva comenzi întregi.
  MAX_RENDERS_PER_IP_PER_DAY: z.coerce.number().int().positive().default(9),
  MAX_RENDERS_PER_EMAIL_PER_DAY: z.coerce.number().int().positive().default(6),

  /**
   * Adrese IP care nu sunt limitate deloc — ale tale, ca să poți testa.
   * Separate prin virgulă.
   *
   * Atenție la adresele care nu-ți aparțin doar ție: dacă folosești un VPN sau
   * Cloudflare WARP, IP-ul e împărțit cu alți oameni, iar scutirea li se aplică
   * și lor. Pe unul ca ăsta, oricine poate consuma credite nelimitat.
   */
  RATE_LIMIT_EXEMPT_IPS: z.string().default(''),

  /**
   * Limba paginii pentru vizitatorii al căror browser nu cere nici română,
   * nici engleză. Vezi `src/lib/lang.ts` pentru ordinea completă.
   */
  DEFAULT_LANG: z.enum(['ro', 'en']).default('en'),
  MAX_LYRICS_PER_IP_PER_DAY: z.coerce.number().int().positive().default(20),

  RETENTION_UNPAID_DAYS: z.coerce.number().int().positive().default(30),
  RETENTION_PAID_MONTHS: z.coerce.number().int().positive().default(24),

  SEED_DEMO: bool.default(false),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  · ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Configurare invalidă în .env:\n${lines.join('\n')}`);
  }
  return parsed.data;
}

function config(): Env {
  cached ??= load();
  return cached;
}

/**
 * Configurarea, citită la prima folosire — nu la încărcarea modulului.
 *
 * `next build` importă fiecare rută ca să-i adune configurarea, iar construirea
 * imaginii Docker se face înainte să existe vreun .env. Dacă am verifica la
 * import, build-ul ar cădea cu „APP_SECRET lipsește" deși cheile urmau oricum
 * să vină abia la pornire.
 */
export const env: Env = new Proxy({} as Env, {
  get: (_t, key: string) => config()[key as keyof Env],
  has: (_t, key: string) => key in config(),
  ownKeys: () => Reflect.ownKeys(config()),
  getOwnPropertyDescriptor: (_t, key) => ({
    ...Object.getOwnPropertyDescriptor(config(), key),
    configurable: true,
  }),
});

/**
 * Verifică acum toată configurarea și aruncă dacă lipsește ceva.
 *
 * Se cheamă la pornirea worker-ului: acolo o cheie lipsă trebuie să oprească
 * procesul cu un mesaj clar, nu să se ascundă într-o reîncercare la nesfârșit.
 */
export function assertConfig(): void {
  config();
}

/** Versiunea documentelor legale acceptate de client, stocată la fiecare comandă. */
export const LEGAL_VERSION = '2026-09-13';
