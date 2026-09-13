/**
 * POST /api/orders/:publicId/lyrics/restore — înapoi la o variantă anterioară.
 *
 * Nu suprascriem istoricul: varianta veche e copiată ca versiune nouă. Așa,
 * după ce te răzgândești de două ori, tot le ai pe toate.
 */
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { lyricsVersions, orders, renders } from '@/lib/db/schema';
import { fail, guard, ok } from '@/lib/api';
import { logEvent } from '@/lib/orders';
import { orderState } from '@/lib/order-state';
import { loadOrder } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  return guard(async () => {
    const { publicId } = await params;
    const order = await loadOrder(publicId);
    if (!order) return fail('Comanda nu a fost găsită.', 404);

    if (order.status === 'rendering') {
      return fail('Se înregistrează acum. Așteaptă să se termine.', 409);
    }

    const { version } = (await req.json()) as { version?: number };
    if (!Number.isInteger(version)) return fail('Spune ce variantă alegi.', 422);

    const wanted = await db.query.lyricsVersions.findFirst({
      where: and(eq(lyricsVersions.orderId, order.id), eq(lyricsVersions.version, version!)),
    });
    if (!wanted) return fail('Varianta nu a fost găsită.', 404);
    if (wanted.version === order.lyricsVersion) return ok(await orderState(order));

    const next = order.lyricsVersion + 1;

    /**
     * Dacă piesa a fost deja cântată, comanda NU se întoarce în „lyrics_ready".
     *
     * Altfel s-ar deschide o portiță: readuci un text vechi, comanda pare
     * neînregistrată, aprobi din nou — și tot așa, la nesfârșit, fără să scadă
     * numărul de reluări. Fiecare ar fi o generare Suno plătită de noi.
     * Textul se schimbă, dar o înregistrare nouă se cere tot prin /render.
     */
    const sung = await db.query.renders.findFirst({
      where: and(eq(renders.orderId, order.id), eq(renders.status, 'done')),
    });

    await db.transaction(async (tx) => {
      await tx.insert(lyricsVersions).values({
        orderId: order.id,
        version: next,
        source: 'user_edit',
        title: wanted.title,
        lyrics: wanted.lyrics,
        styleHint: wanted.styleHint,
        model: wanted.model,
      });
      await tx
        .update(orders)
        .set({
          lyrics: wanted.lyrics,
          songTitle: wanted.title,
          lyricsVersion: next,
          ...(sung ? {} : { status: 'lyrics_ready' as const }),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
    });

    await logEvent(order.id, 'lyrics_restored', { from: wanted.version, as: next });

    const fresh = await loadOrder(publicId);
    return ok(await orderState(fresh!));
  });
}
