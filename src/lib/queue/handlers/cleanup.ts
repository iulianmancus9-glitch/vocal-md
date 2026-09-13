/**
 * Jobul „curățenie": aplică politica de retenție.
 *
 * Comenzile neplătite dispar la 30 de zile, cele plătite la 24 de luni. Ștergem
 * întâi fișierele de pe disc, apoi rândul — dacă ordinea ar fi inversă și pică
 * ceva la mijloc, ar rămâne fișiere fără nimeni care să știe de ele.
 */
import { rm } from 'node:fs/promises';
import { lt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, rateLimits, webhookEvents } from '@/lib/db/schema';
import { orderDir } from '@/lib/storage';

export async function handleCleanup(): Promise<void> {
  const now = new Date();

  const expired = await db
    .select({ id: orders.id, publicId: orders.publicId })
    .from(orders)
    .where(lt(orders.expiresAt, now))
    .limit(200);

  for (const order of expired) {
    await rm(orderDir(order.publicId), { recursive: true, force: true });
    // Piesele, versurile, emailurile și evenimentele pleacă în cascadă.
    await db.delete(orders).where(sql`${orders.id} = ${order.id}`);
  }

  const limits = await db.delete(rateLimits).where(lt(rateLimits.expiresAt, now)).returning({
    bucket: rateLimits.bucket,
  });

  // Webhook-urile procesate nu ne mai spun nimic după 90 de zile.
  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const hooks = await db
    .delete(webhookEvents)
    .where(lt(webhookEvents.receivedAt, cutoff))
    .returning({ id: webhookEvents.id });

  console.log(
    `Curățenie: ${expired.length} comenzi, ${limits.length} limite, ${hooks.length} webhook-uri.`,
  );
}
