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

  RESEND_API_KEY: z.string().default(''),
  MAIL_FROM: z.string().default('Vocal MD <comenzi@vocal.md>'),
  MAIL_REPLY_TO: z.string().default('base.vocalmd@gmail.com'),

  MAX_RENDERS_PER_IP_PER_DAY: z.coerce.number().int().positive().default(3),
  MAX_RENDERS_PER_EMAIL_PER_DAY: z.coerce.number().int().positive().default(2),
  MAX_LYRICS_PER_IP_PER_DAY: z.coerce.number().int().positive().default(20),

  RETENTION_UNPAID_DAYS: z.coerce.number().int().positive().default(30),
  RETENTION_PAID_MONTHS: z.coerce.number().int().positive().default(24),

  SEED_DEMO: bool.default(false),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  · ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Configurare invalidă în .env:\n${lines.join('\n')}`);
  }
  return parsed.data;
}

export const env = load();
export type Env = typeof env;

/** Versiunea documentelor legale acceptate de client, stocată la fiecare comandă. */
export const LEGAL_VERSION = '2026-09-13';
