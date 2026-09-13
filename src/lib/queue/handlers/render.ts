/**
 * Jobul „înregistrare": trimite versurile la Suno, descarcă ambele variante și taie
 * previzualizările de 60 de secunde.
 *
 * Aici se cheltuiesc banii. Două protecții:
 *  · indexul `jobs_active_key` împiedică două joburi de render pentru aceeași comandă;
 *  · dacă avem deja un `suno_task_id`, nu mai creăm altul — o reîncercare după o
 *    pană de rețea reia așteptarea, nu generarea.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orderTracks, orders, type Job } from '@/lib/db/schema';
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

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, job.orderId),
    with: { lyricsVersions: true },
  });
  if (!order) throw new Error(`Comanda ${job.orderId} nu mai există.`);
  if (!order.lyrics?.trim()) throw new Error('Comanda nu are versuri aprobate.');

  const brief = briefFromOrder(order);
  const latest = order.lyricsVersions.sort((a, b) => b.version - a.version)[0];
  const style = order.styleString ?? buildStyle(brief, latest?.styleHint ?? undefined);

  try {
    let taskId = order.sunoTaskId;

    if (!taskId) {
      taskId = await createTask({
        lyrics: order.lyrics,
        style,
        title: order.songTitle ?? order.titleWanted ?? 'Melodie personalizată',
        voice: order.voice ?? 'Bărbat',
      });
      await setStatus(order.id, 'rendering', {
        sunoTaskId: taskId,
        sunoModel: env.SUNO_MODEL,
        styleString: style,
      });
      await logEvent(order.id, 'render_started', { taskId, style });
    } else {
      await setStatus(order.id, 'rendering');
    }

    const tracks = await waitForTask(taskId);
    const dir = await ensureOrderDir(order.publicId);

    for (const [i, track] of tracks.slice(0, VARIANTS).entries()) {
      const variant = i + 1;
      const fullRel = trackRelPath(order.publicId, variant, 'full');
      const previewRel = trackRelPath(order.publicId, variant, 'preview');

      const fullBytes = await downloadTrack(track.audioUrl, absPath(fullRel));
      const duration = await getDuration(absPath(fullRel)).catch(() => track.duration ?? 0);
      await makePreview(absPath(fullRel), absPath(previewRel), {
        seconds: env.PREVIEW_SECONDS,
      });

      await db
        .insert(orderTracks)
        .values({
          orderId: order.id,
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
          target: [orderTracks.orderId, orderTracks.variant],
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

    await setStatus(order.id, 'preview_ready', { previewReadyAt: new Date() });
    await logEvent(order.id, 'preview_ready', { taskId, variants: tracks.length, dir });
  } catch (err) {
    // Filtrul de conținut al lui Suno e definitiv: reîncercarea dă același răspuns.
    if (err instanceof SunoError && !err.retryable) {
      await setStatus(order.id, err.code === 451 ? 'refused' : 'failed', {
        failureCode: err.code === 451 ? 'content_refused' : 'render_failed',
        failureMessage: err.message,
      });
      await logEvent(order.id, 'render_failed', { message: err.message, code: err.code });
      // Aruncăm mai departe marcat ca definitiv, ca jobul să nu se reia.
      throw Object.assign(err, { permanent: true });
    }
    throw err;
  }
}
