/**
 * Verificarea de sănătate folosită de docker compose și de monitorizare.
 * Atinge efectiv baza de date — un web care răspunde dar nu poate citi nu e sănătos.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: 'up' });
  } catch (err) {
    return Response.json(
      { ok: false, db: 'down', error: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }
}
