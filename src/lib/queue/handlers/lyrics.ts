/**
 * Jobul „versuri": cere textul de la Gemini și îl pune la dispoziția clientului.
 *
 * Pasul e gratuit pentru client și ieftin pentru noi, dar e și primul filtru de
 * conținut: dacă modelul refuză povestea, comanda se oprește aici și nu ajunge
 * niciodată să consume credite Suno.
 */
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { lyricsVersions, orders, type Job } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { logEvent, nextLyricsVersion, setStatus } from '@/lib/orders';
import { briefFromOrder } from '@/lib/pipeline/brief';
import { generateLyrics } from '@/lib/pipeline/gemini';

export async function handleLyrics(job: Job): Promise<void> {
  if (!job.orderId) throw new Error('Jobul de versuri are nevoie de order_id.');

  const order = await db.query.orders.findFirst({ where: eq(orders.id, job.orderId) });
  if (!order) throw new Error(`Comanda ${job.orderId} nu mai există.`);

  // Clientul și-a adus propriile versuri: nu avem ce genera.
  if (order.lyricsMode === 'own') {
    await setStatus(order.id, 'lyrics_ready', { lyricsReadyAt: new Date() });
    return;
  }

  const regenerate = Boolean((job.payload as { regenerate?: boolean }).regenerate);

  const previous = await db
    .select({ lyrics: lyricsVersions.lyrics })
    .from(lyricsVersions)
    .where(eq(lyricsVersions.orderId, order.id))
    .orderBy(desc(lyricsVersions.version))
    .limit(2);

  await setStatus(order.id, 'lyrics_pending');

  const result = await generateLyrics(briefFromOrder(order), {
    regenerate,
    previousLyrics: previous.map((p) => p.lyrics),
  });

  if (!result.ok) {
    // Refuzul nu e o eroare tehnică: jobul s-a terminat cu bine, comanda nu merge mai departe.
    await setStatus(order.id, 'refused', {
      failureCode: 'content_refused',
      failureMessage: result.reason,
    });
    await logEvent(order.id, 'lyrics_refused', { reason: result.reason });
    return;
  }

  // Din maximul existent, nu din versiunea curentă: readucerea unei variante
  // vechi mută comanda înapoi, iar „curentă + 1" ar da un număr deja folosit.
  const version = await nextLyricsVersion(order.id);

  await db.transaction(async (tx) => {
    await tx.insert(lyricsVersions).values({
      orderId: order.id,
      version,
      source: regenerate ? 'ai_regen' : 'ai',
      title: result.title,
      lyrics: result.lyrics,
      styleHint: result.styleHint,
      model: env.GEMINI_MODEL,
    });

    await tx
      .update(orders)
      .set({
        status: 'lyrics_ready',
        songTitle: result.title,
        lyrics: result.lyrics,
        lyricsVersion: version,
        lyricsReadyAt: new Date(),
        // O regenerare consumă una dintre variantele gratuite.
        regensLeft: regenerate ? Math.max(0, order.regensLeft - 1) : order.regensLeft,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
  });

  await logEvent(order.id, 'lyrics_generated', { version, regenerate, title: result.title });
}
