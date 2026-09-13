/**
 * POST /api/orders/:publicId/checkout — pregătește plata.
 *
 * Nu încasează nimic: creează tranzacția la Paddle și îi dă browserului
 * identificatorul ei, ca să deschidă fereastra de plată. Banii se confirmă abia
 * prin webhook, care e singurul lucru în care avem încredere.
 */
import { fail, guard, ok } from '@/lib/api';
import { logEvent } from '@/lib/orders';
import { createCheckout, paymentsEnabled } from '@/lib/paddle';
import { loadOrder } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  return guard(async () => {
    const { publicId } = await params;
    const order = await loadOrder(publicId);
    if (!order) return fail('Comanda nu a fost găsită.', 404);

    if (!paymentsEnabled()) {
      return fail('Plata se activează în curând. Scrie-ne și îți trimitem melodia.', 503);
    }
    if (order.status === 'paid' || order.status === 'delivered') {
      return fail('Comanda e deja plătită.', 409);
    }
    if (order.status !== 'preview_ready') {
      return fail('Melodia nu e gata încă.', 409);
    }

    try {
      const session = await createCheckout(order);
      await logEvent(order.id, 'checkout_opened', { transactionId: session.transactionId });
      return ok(session);
    } catch (err) {
      // Detaliul tehnic merge în log; omului îi spunem ce poate face.
      console.error(`Checkout eșuat pentru ${order.publicId}:`, err);
      await logEvent(order.id, 'checkout_failed', {
        message: err instanceof Error ? err.message : String(err),
      });
      return fail(
        'Nu am putut deschide plata. Încearcă din nou peste un minut, ' +
        'sau scrie-ne la base.vocalmd@gmail.com și rezolvăm noi.',
        502,
      );
    }
  });
}
