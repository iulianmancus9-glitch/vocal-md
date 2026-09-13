/**
 * POST /api/orders/:publicId/recording — clientul alege ce înregistrare ascultă.
 *
 * Alegerea stă pe server, nu doar în pagină: e melodia pe care o primește la
 * livrare, deci trebuie să supraviețuiască unei reîncărcări și să fie aceeași
 * pe telefon și pe laptop.
 */
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, renders } from '@/lib/db/schema';
import { fail, guard, ok } from '@/lib/api';
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

    const { renderId } = (await req.json()) as { renderId?: string };
    if (!renderId) return fail('Spune ce înregistrare alegi.', 422);

    const render = await db.query.renders.findFirst({
      where: and(eq(renders.id, renderId), eq(renders.orderId, order.id)),
    });
    if (!render || render.status !== 'done') {
      return fail('Înregistrarea nu a fost găsită.', 404);
    }

    await db
      .update(orders)
      .set({ currentRenderId: render.id, updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    const fresh = await loadOrder(publicId);
    return ok(await orderState(fresh!));
  });
}
