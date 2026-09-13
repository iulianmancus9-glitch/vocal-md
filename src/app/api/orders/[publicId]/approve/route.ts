/**
 * POST /api/orders/:publicId/approve — clientul a aprobat versurile.
 *
 * De aici încolo se cheltuiesc credite Suno, deci e singurul loc din fluxul
 * gratuit unde limita pe IP și pe email chiar contează.
 */
import { fail, guard, ok } from '@/lib/api';
import { logEvent, setStatus } from '@/lib/orders';
import { enqueue } from '@/lib/queue/queue';
import { checkLimit, clientIp } from '@/lib/rate-limit';
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

    // Reintrarea pe o comandă deja pornită nu trebuie să pornească a doua generare.
    if (['rendering', 'preview_ready', 'paid', 'delivered'].includes(order.status)) {
      return ok({ status: order.status });
    }
    // O eroare tehnică se poate reîncerca; un refuz de conținut, nu — ar da
    // exact același răspuns și ar consuma încă o dată aceleași credite.
    if (order.status === 'refused') {
      return fail('Această comandă nu poate fi generată. Scrie-ne dacă e o greșeală.', 409);
    }
    if (order.status !== 'lyrics_ready' && order.status !== 'failed') {
      return fail('Versurile nu sunt gata încă.', 409);
    }
    if (!order.lyrics?.trim()) {
      return fail('Comanda nu are versuri.', 409);
    }

    const limit = await checkLimit('render', {
      ip: clientIp(req.headers),
      email: order.email,
    });
    if (!limit.ok) {
      return fail(
        'Ai făcut multe previzualizări astăzi. Încearcă mâine sau scrie-ne la base.vocalmd@gmail.com.',
        429,
      );
    }

    const job = await enqueue('render', order.id);
    if (!job) return ok({ status: 'rendering' });

    await setStatus(order.id, 'rendering', { failureCode: null, failureMessage: null });
    await logEvent(order.id, 'lyrics_approved', { retry: order.status === 'failed' });

    return ok({ status: 'rendering' });
  });
}
