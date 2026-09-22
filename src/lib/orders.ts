/**
 * Operații mărunte pe comenzi, folosite din mai multe locuri.
 */
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { lyricsVersions, orderEvents, orders, type OrderStatus } from '@/lib/db/schema';

/** Scrie un rând în urma auditabilă. Nu aruncă niciodată: e jurnal, nu logică. */
export async function logEvent(
  orderId: string,
  type: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.insert(orderEvents).values({ orderId, type, data });
  } catch (err) {
    console.error(`Nu am putut scrie evenimentul ${type} pentru ${orderId}:`, err);
  }
}

export async function setStatus(
  orderId: string,
  status: OrderStatus,
  extra: Partial<typeof orders.$inferInsert> = {},
): Promise<void> {
  await db
    .update(orders)
    .set({ status, updatedAt: new Date(), ...extra })
    .where(eq(orders.id, orderId));
}

/**
 * Următorul număr liber de versiune a versurilor.
 *
 * Se calculează din maximul existent, NU din versiunea curentă a comenzii.
 * Readucerea unei variante vechi mută comanda înapoi pe numărul ei — după ce
 * te întorci la varianta 1, `lyrics_version + 1` ar da 2, care există deja, iar
 * inserarea ar cădea pe cheia unică.
 */
export async function nextLyricsVersion(orderId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${lyricsVersions.version}), 0)` })
    .from(lyricsVersions)
    .where(eq(lyricsVersions.orderId, orderId));
  return (row?.max ?? 0) + 1;
}

/** Data la care o comandă neplătită se șterge: 30 de zile, conform politicii. */
export function unpaidExpiry(from = new Date()): Date {
  return new Date(from.getTime() + env.RETENTION_UNPAID_DAYS * 24 * 60 * 60 * 1000);
}

/** Data la care o comandă plătită se șterge: 24 de luni, ca să poată fi redescărcată. */
export function paidExpiry(from = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + env.RETENTION_PAID_MONTHS);
  return d;
}
