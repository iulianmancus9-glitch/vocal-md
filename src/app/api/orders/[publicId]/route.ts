/**
 * GET /api/orders/:publicId — starea comenzii, întrebată din browser.
 */
import { fail, guard, ok } from '@/lib/api';
import { orderState } from '@/lib/order-state';
import { loadOrder } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  return guard(async () => {
    const { publicId } = await params;
    const token = new URL(req.url).searchParams.get('token');

    const order = await loadOrder(publicId, token);
    if (!order) return fail('Comanda nu a fost găsită.', 404);

    return ok(await orderState(order));
  });
}
