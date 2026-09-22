/**
 * Versurile, înainte de a fi cântate.
 *
 *   POST  — cere o variantă nouă (consumă una dintre cele gratuite)
 *   PATCH — salvează textul modificat de client
 *
 * Amândouă sunt permise doar cât timp comanda n-a plecat la înregistrare. După
 * ce Suno a primit textul, o schimbare aici ar însemna că omul ascultă altceva
 * decât ce a aprobat.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { lyricsVersions, orders } from '@/lib/db/schema';
import { fail, guard, ok } from '@/lib/api';
import { logEvent, nextLyricsVersion } from '@/lib/orders';
import { orderState } from '@/lib/order-state';
import { enqueue } from '@/lib/queue/queue';
import { loadOrder } from '@/lib/session';
import { lyricsEdit } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const EDITABLE = ['lyrics_ready', 'lyrics_pending', 'draft'];

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  return guard(async () => {
    const { publicId } = await params;
    const order = await loadOrder(publicId);
    if (!order) return fail('Comanda nu a fost găsită.', 404);

    if (!EDITABLE.includes(order.status)) {
      return fail('Versurile au fost deja trimise la înregistrare.', 409);
    }
    if (order.lyricsMode === 'own') {
      return fail('Ai adus versurile tale, deci nu le scriem noi.', 409);
    }
    if (order.regensLeft <= 0) {
      return fail('Ai folosit variantele gratuite. Poți modifica textul direct.', 409);
    }

    const job = await enqueue('lyrics', order.id, { payload: { regenerate: true } });
    if (!job) return fail('Se scrie deja o variantă nouă. Așteaptă puțin.', 409);

    await db
      .update(orders)
      .set({ status: 'lyrics_pending', updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    return ok({ status: 'lyrics_pending', regensLeft: order.regensLeft - 1 });
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  return guard(async () => {
    const { publicId } = await params;
    const order = await loadOrder(publicId);
    if (!order) return fail('Comanda nu a fost găsită.', 404);

    if (!EDITABLE.includes(order.status)) {
      return fail('Versurile au fost deja trimise la înregistrare.', 409);
    }

    const { lyrics } = lyricsEdit.parse(await req.json());
    if (lyrics === order.lyrics) return ok(await orderState(order));

    // Din maximul existent, nu din versiunea curentă: readucerea unei variante
    // vechi mută comanda înapoi, iar „curentă + 1" ar da un număr deja folosit.
    const version = await nextLyricsVersion(order.id);

    await db.transaction(async (tx) => {
      await tx.insert(lyricsVersions).values({
        orderId: order.id,
        version,
        source: order.lyricsMode === 'own' ? 'user_provided' : 'user_edit',
        title: order.songTitle,
        lyrics,
      });
      await tx
        .update(orders)
        .set({ lyrics, lyricsVersion: version, status: 'lyrics_ready', updatedAt: new Date() })
        .where(eq(orders.id, order.id));
    });

    await logEvent(order.id, 'lyrics_edited', { version });

    const fresh = await loadOrder(publicId);
    return ok(await orderState(fresh!));
  });
}
