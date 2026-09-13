/**
 * Jobul „înregistrare": trimite versurile la Suno, descarcă ambele variante și
 * taie previzualizările de 60 de secunde.
 *
 * Aici se cheltuiesc banii. Trei protecții:
 *  · indexul `jobs_active_key` împiedică două joburi de render pentru aceeași comandă;
 *  · dacă înregistrarea are deja un `suno_task_id`, nu mai creăm altul — o
 *    reîncercare după o pană de rețea reia așteptarea, nu generarea;
 *  · `renders_left` de pe comandă limitează câte reluări poate cere clientul.
 */
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { lyricsVersions, orderTracks, orders, renders, type Job } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { logEvent, setStatus } from '@/lib/orders';
import { getDuration, makePreview } from '@/lib/pipeline/audio';
import { briefFromOrder } from '@/lib/pipeline/brief';
import { buildStyle } from '@/lib/pipeline/prompt';
import { SunoError, createTask, downloadTrack, waitForTask } from '@/lib/pipeline/suno';
import { absPath, ensureOrderDir, trackRelPath } from '@/lib/storage';

/** Suno întoarce două interpretări; pe astea le promitem clientului. */
const VARIANTS = 2;

export async function handleRender(job: Job): Promise<void> {
  if (!job.orderId) throw new Error('Jobul de înregistrare are nevoie de order_id.');

  const renderId = (job.payload as { renderId?: string }).renderId;
  if (!renderId) throw new Error('Jobul de înregistrare are nevoie de renderId.');

  const order = await db.query.orders.findFirst({ where: eq(orders.id, job.orderId) });
  if (!order) throw new Error(`Comanda ${job.orderId} nu mai există.`);

  const render = await db.query.renders.findFirst({ where: eq(renders.id, renderId) });
  if (!render) throw new Error(`Înregistrarea ${renderId} nu mai există.`);
  if (!order.lyrics?.trim()) throw new Error('Comanda nu are versuri aprobate.');

  const latest = await db.query.lyricsVersions.findFirst({
    where: and(
      eq(lyricsVersions.orderId, order.id),
      eq(lyricsVersions.version, render.lyricsVersion),
    ),
  });
  const style =
    render.styleString ?? buildStyle(briefFromOrder(order), latest?.styleHint ?? undefined);

  await db
    .update(renders)
    .set({ status: 'running', styleString: style })
    .where(eq(renders.id, render.id));

  try {
    let taskId = render.sunoTaskId;

    if (!taskId) {
      taskId = await createTask({
        lyrics: order.lyrics,
        style,
        title: order.songTitle ?? order.titleWanted ?? 'Melodie personalizată',
        voice: order.voice ?? 'Bărbat',
      });
      await db
        .update(renders)
        .set({ sunoTaskId: taskId, sunoModel: env.SUNO_MODEL })
        .where(eq(renders.id, render.id));
    }

    const tracks = await waitForTask(taskId);
    const dir = await ensureOrderDir(order.publicId);

    for (const [i, track] of tracks.slice(0, VARIANTS).entries()) {
      const variant = i + 1;
      // Numele fișierului poartă generația, ca înregistrările să nu se suprascrie.
      const fullRel = trackRelPath(order.publicId, render.generation, variant, 'full');
      const previewRel = trackRelPath(order.publicId, render.generation, variant, 'preview');

      const fullBytes = await downloadTrack(track.audioUrl, absPath(fullRel));
      const duration = await getDuration(absPath(fullRel)).catch(() => track.duration ?? 0);
      await makePreview(absPath(fullRel), absPath(previewRel), { seconds: env.PREVIEW_SECONDS });

      await db
        .insert(orderTracks)
        .values({
          orderId: order.id,
          renderId: render.id,
          variant,
          sunoAudioId: track.id,
          fullPath: fullRel,
          previewPath: previewRel,
          fullBytes,
          durationSeconds: duration,
          sourceUrl: track.audioUrl,
          // Linkurile Suno expiră în 14 zile; de asta fișierele sunt deja la noi.
          sourceExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        })
        .onConflictDoUpdate({
          target: [orderTracks.renderId, orderTracks.variant],
          set: {
            sunoAudioId: track.id,
            fullPath: fullRel,
            previewPath: previewRel,
            fullBytes,
            durationSeconds: duration,
            sourceUrl: track.audioUrl,
          },
        });
    }

    await db
      .update(renders)
      .set({ status: 'done', completedAt: new Date() })
      .where(eq(renders.id, render.id));

    // Clientul ascultă ce tocmai a cerut; poate reveni oricând la cele vechi.
    await setStatus(order.id, 'preview_ready', {
      previewReadyAt: order.previewReadyAt ?? new Date(),
      currentRenderId: render.id,
    });
    await logEvent(order.id, 'preview_ready', {
      generation: render.generation,
      taskId,
      variants: tracks.length,
      dir,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(renders)
      .set({ status: 'failed', errorMessage: message.slice(0, 1000) })
      .where(eq(renders.id, render.id));

    // Filtrul de conținut al lui Suno e definitiv: reîncercarea dă același răspuns.
    if (err instanceof SunoError && !err.retryable) {
      await setStatus(order.id, err.code === 451 ? 'refused' : 'failed', {
        failureCode: err.code === 451 ? 'content_refused' : 'render_failed',
        failureMessage: message,
      });
      await logEvent(order.id, 'render_failed', { message, code: err.code });
      throw Object.assign(err, { permanent: true });
    }
    throw err;
  }
}
