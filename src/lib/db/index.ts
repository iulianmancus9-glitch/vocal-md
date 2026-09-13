/**
 * Conexiunea la Postgres, deschisă la prima folosire.
 *
 * Două motive pentru care nu se deschide la încărcarea modulului:
 *  · `next build` importă rutele ca să le adune configurarea, iar imaginea
 *    Docker se construiește înainte să existe vreun .env — un Pool creat la
 *    import ar cere DATABASE_URL exact atunci și ar opri build-ul;
 *  · Next repornește modulele la fiecare recompilare în dezvoltare, așa că
 *    ținem pool-ul pe globalThis, altfel se adună zeci de conexiuni.
 */
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/lib/env';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { __vocalPool?: Pool };

let poolInstance: Pool | undefined;
let dbInstance: NodePgDatabase<typeof schema> | undefined;

function realPool(): Pool {
  poolInstance ??=
    globalForDb.__vocalPool ??
    new Pool({
      connectionString: env.DATABASE_URL,
      // Web-ul are nevoie de puține conexiuni; worker-ul rulează un job pe rând.
      max: Number(process.env.DB_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

  if (env.NODE_ENV !== 'production') globalForDb.__vocalPool = poolInstance;
  return poolInstance;
}

function realDb(): NodePgDatabase<typeof schema> {
  dbInstance ??= drizzle(realPool(), { schema });
  return dbInstance;
}

/** Metodele trebuie legate de obiectul adevărat, altfel își pierd `this`. */
function lazy<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_t, prop) {
      const target = resolve();
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    has: (_t, prop) => prop in resolve(),
  });
}

export const pool: Pool = lazy(realPool);
export const db: NodePgDatabase<typeof schema> = lazy(realDb);
export { schema };
export * from './schema';
