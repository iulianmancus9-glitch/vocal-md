/**
 * GET /api/orders/:publicId — starea comenzii, întrebată din browser.
 */
import { fail, guard, ok } from '@/lib/api';
import { orderState } from '@/lib/order-state';
import { loadOrder, remember } from '@/lib/session';

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

    /**
     * Comanda deschisă cu secretul din adresă se ține minte pe dispozitivul
     * ăsta, ca să apară în bibliotecă și la următoarea vizită, fără link.
     *
     * Se face aici, nu în pagină: Next.js lasă cookie-urile să fie scrise doar
     * dintr-o rută sau o acțiune de server. În pagină, aceeași linie arunca, iar
     * omul venit de la plată sau dintr-un email primea 500.
     */
    if (token) await remember(publicId, order.accessToken);

    return ok(await orderState(order));
  });
}
