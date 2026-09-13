/**
 * Conexiunea la Postgres.
 *
 * Next repornește modulele la fiecare recompilare în dezvoltare, așa că ținem
 * pool-ul pe globalThis — altfel se adună zeci de conexiuni până se plânge baza.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/lib/env';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { __vocalPool?: Pool };

const pool =
  globalForDb.__vocalPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    // Web-ul are nevoie de puține conexiuni; worker-ul rulează un singur job pe rând.
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (env.NODE_ENV !== 'production') globalForDb.__vocalPool = pool;

export const db = drizzle(pool, { schema });
export { pool, schema };
export * from './schema';
