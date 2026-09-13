/**
 * POST /api/orders/:publicId/approve — clientul a aprobat versurile.
 *
 * De aici încolo se cheltuiesc credite Suno, deci e singurul loc din fluxul
 * gratuit unde limita pe IP și pe email chiar contează.
 */
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { renders } from '@/lib/db/schema';
import { fail, guard, ok } from '@/lib/api';
import { logEvent } from '@/lib/orders';
import { checkLimit, clientIp } from '@/lib/rate-limit';
import { startRender } from '@/lib/renders';
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

    // Aprobarea pornește doar prima înregistrare. Următoarele trec prin /render,
    // care scade `renders_left` — altfel limita n-ar însemna nimic.
    const already = await db.query.renders.findFirst({
      where: and(eq(renders.orderId, order.id), eq(renders.status, 'done')),
    });
    if (already) {
      return fail('Melodia a fost deja înregistrată. Cere o înregistrare nouă.', 409);
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

    const { render, reason } = await startRender(order);
    if (!render) return fail(reason ?? 'Nu am putut porni înregistrarea.', 409);

    await logEvent(order.id, 'lyrics_approved', { retry: order.status === 'failed' });
    return ok({ status: 'rendering' });
  });
}
