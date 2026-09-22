/**
 * POST /api/orders/:publicId/lyrics/restore — înapoi la o variantă anterioară.
 *
 * Readucerea NU creează o variantă nouă: doar mută comanda pe una care există
 * deja. Înainte, varianta veche era copiată ca versiune nouă, iar cine apăsa de
 * trei ori se trezea cu trei rânduri identice în istoric — o listă care nu mai
 * arăta variantele scrise, ci de câte ori s-a răzgândit.
 *
 * Nimic nu se pierde: toate variantele rămân în `lyrics_versions`. Se pierde
 * doar ordinea vizitelor, care nu-i folosește nimănui.
 *
 * De aici iese o regulă pentru tot restul codului: numărul următoarei versiuni
 * se ia din maximul existent (`nextLyricsVersion`), nu din versiunea curentă a
 * comenzii — care acum poate merge și înapoi.
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

    await db
      .update(orders)
      .set({
        lyrics: wanted.lyrics,
        songTitle: wanted.title,
        lyricsVersion: wanted.version,
        ...(sung ? {} : { status: 'lyrics_ready' as const }),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await logEvent(order.id, 'lyrics_restored', { to: wanted.version });

    const fresh = await loadOrder(publicId);
    return ok(await orderState(fresh!));
  });
}
