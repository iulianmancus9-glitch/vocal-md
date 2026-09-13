/**
 * Operații mărunte pe comenzi, folosite din mai multe locuri.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { orderEvents, orders, type OrderStatus } from '@/lib/db/schema';

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
