/**
 * Jobul „livrare": emailul cu melodia completă, după plată.
 *
 * Rulează în coadă, nu în webhook: dacă Resend e căzut două minute, plata a fost
 * deja înregistrată și livrarea se reîncearcă singură. Invers ar însemna că
 * Paddle primește o eroare și retrimite plata la nesfârșit.
 */
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orderTracks, orders, renders, type Job } from '@/lib/db/schema';
import { logEvent } from '@/lib/orders';
import { mailEnabled, sendDelivery } from '@/lib/mail';
import { downloadUrl } from '@/lib/storage';

export async function handleDeliver(job: Job): Promise<void> {
  if (!job.orderId) throw new Error('Jobul de livrare are nevoie de order_id.');

  const order = await db.query.orders.findFirst({ where: eq(orders.id, job.orderId) });
  if (!order) throw new Error(`Comanda ${job.orderId} nu mai există.`);
  if (!order.email) throw new Error('Comanda nu are adresă de email.');

  if (!mailEnabled()) {
    // Fără cheie de email, melodia rămâne oricum în pagină. Nu blocăm plata.
    console.error(`Comanda ${order.publicId} e plătită, dar emailul nu e configurat.`);
    await logEvent(order.id, 'delivery_skipped', { reason: 'mail_not_configured' });
    return;
  }

  // Trimitem înregistrarea aleasă de client — cea pe care o ascultă.
  const chosen = order.currentRenderId
    ? await db.query.renders.findFirst({ where: eq(renders.id, order.currentRenderId) })
    : await db.query.renders.findFirst({
        where: eq(renders.orderId, order.id),
        orderBy: [asc(renders.generation)],
      });
  if (!chosen) throw new Error('Comanda nu are nicio înregistrare.');

  const tracks = await db
    .select()
    .from(orderTracks)
    .where(eq(orderTracks.renderId, chosen.id))
    .orderBy(asc(orderTracks.variant));

  const links = tracks
    .filter((t) => t.fullPath)
    .map((t) => ({
      variant: t.variant,
      url: downloadUrl(order.publicId, chosen.generation, t.variant, 'full'),
    }));

  if (links.length === 0) throw new Error('Înregistrarea aleasă nu are fișiere.');

  await sendDelivery(order, links);

  await db
    .update(orders)
    .set({ status: 'delivered', deliveredAt: new Date(), updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  await logEvent(order.id, 'delivered', { generation: chosen.generation, links: links.length });
}
