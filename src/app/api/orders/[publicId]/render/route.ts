/**
 * POST /api/orders/:publicId/render — încă o înregistrare a aceluiași text.
 *
 * Costă credite Suno reale pe o comandă care poate să nu se cumpere, deci are
 * două frâne: `renders_left` pe comandă și limita zilnică pe IP și pe email.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { fail, guard, ok } from '@/lib/api';
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

    if (order.status === 'rendering') return ok({ status: 'rendering' });
    if (!['preview_ready', 'paid', 'delivered', 'failed'].includes(order.status)) {
      return fail('Nu există încă o melodie de reluat.', 409);
    }
    if (order.rendersLeft <= 0) {
      return fail(
        'Ai folosit toate înregistrările. Poți alege dintre cele pe care le ai deja.',
        409,
      );
    }

    const limit = await checkLimit('render', { ip: clientIp(req.headers), email: order.email });
    if (!limit.ok) {
      return fail(
        'Ai făcut multe înregistrări astăzi. Încearcă mâine sau scrie-ne la base.vocalmd@gmail.com.',
        429,
      );
    }

    const { render, reason } = await startRender(order);
    if (!render) return fail(reason ?? 'Nu am putut porni înregistrarea.', 409);

    await db
      .update(orders)
      .set({ rendersLeft: order.rendersLeft - 1, updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    return ok({ status: 'rendering', rendersLeft: order.rendersLeft - 1 });
  });
}
