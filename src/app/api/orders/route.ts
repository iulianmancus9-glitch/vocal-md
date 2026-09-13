/**
 * POST /api/orders — comanda pleacă la drum.
 *
 * Răspundem imediat ce am scris rândul și am pus jobul în coadă. Versurile vin
 * în câteva zeci de secunde, iar browserul le așteaptă întrebând, nu ținând
 * cererea deschisă.
 */
import { db } from '@/lib/db';
import { newAccessToken, newPublicId } from '@/lib/db/ids';
import { orders } from '@/lib/db/schema';
import { LEGAL_VERSION } from '@/lib/env';
import { fail, guard, ok } from '@/lib/api';
import { orderState } from '@/lib/order-state';
import { logEvent, unpaidExpiry } from '@/lib/orders';
import { enqueue } from '@/lib/queue/queue';
import { checkLimit, clientIp } from '@/lib/rate-limit';
import { loadOrder, remember, rememberedIds } from '@/lib/session';
import { orderInput } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return guard(async () => {
    const input = orderInput.parse(await req.json());
    const ip = clientIp(req.headers);

    const limit = await checkLimit('lyrics', { ip, email: input.email });
    if (!limit.ok) {
      return fail(
        'Ai cerut multe versuri astăzi. Încearcă mâine sau scrie-ne la base.vocalmd@gmail.com.',
        429,
      );
    }

    const publicId = newPublicId();
    const accessToken = newAccessToken();
    const now = new Date();

    const [order] = await db
      .insert(orders)
      .values({
        publicId,
        accessToken,
        email: input.email,
        newsletterOptIn: input.newsletter,
        styleId: input.style,
        direction: input.sub,
        mood: input.mood,
        voice: input.voice,
        recipient: input.recipient,
        recipientOther: input.recipientOther,
        names: input.names.map((n) => n.trim()).filter(Boolean),
        occasion: input.occasion,
        occasionOther: input.occasionOther,
        lyricsMode: input.mode,
        titleWanted: input.title,
        story: input.story,
        language: input.lang,
        // Versurile aduse de client se aprobă direct, fără trecere prin Gemini.
        lyrics: input.mode === 'own' ? input.story : null,
        songTitle: input.mode === 'own' ? input.title : null,
        termsAcceptedAt: now,
        legalVersion: LEGAL_VERSION,
        consentIp: ip,
        consentUserAgent: req.headers.get('user-agent')?.slice(0, 400) ?? null,
        expiresAt: unpaidExpiry(now),
      })
      .returning();

    await remember(publicId, accessToken);
    await logEvent(order!.id, 'order_created', { mode: input.mode, style: input.style });
    await enqueue('lyrics', order!.id);

    return ok({ publicId, status: order!.status }, { status: 201 });
  });
}

/**
 * GET /api/orders — biblioteca: comenzile pe care le ține minte acest browser.
 *
 * Nu există conturi, deci „biblioteca" înseamnă exact atât: ce a comandat cineva
 * de pe dispozitivul ăsta. Linkurile din email vor deschide o comandă anume,
 * indiferent de dispozitiv.
 */
export async function GET() {
  return guard(async () => {
    const ids = await rememberedIds();
    const found = await Promise.all(ids.map((id) => loadOrder(id)));
    const states = await Promise.all(
      found.filter((o) => o !== null).map((o) => orderState(o!)),
    );
    return ok({ orders: states });
  });
}
