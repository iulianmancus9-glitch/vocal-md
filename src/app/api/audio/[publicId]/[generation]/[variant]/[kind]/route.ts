/**
 * Servirea fișierelor audio.
 *
 * Nimic nu stă în /public. Fiecare cerere trece pe aici, unde se verifică două
 * lucruri: semnătura linkului și, pentru varianta integrală, plata. Semnătura
 * acoperă comanda, înregistrarea, varianta, tipul fișierului și expirarea, deci
 * nu se poate schimba „preview" în „full" în bara de adrese.
 *
 * Răspundem la cereri cu interval (Range), ca mutarea cursorului în player să nu
 * ceară de fiecare dată tot fișierul.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orderTracks, orders, renders } from '@/lib/db/schema';
import { absPath, verifyDownload, type TrackKind } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Plata se citește din `paid_at`, nu din stare.
 *
 * O comandă plătită trece iar prin „rendering" dacă omul cere încă o
 * înregistrare — iar dacă accesul ar atârna de stare, tocmai clientul care a
 * plătit și-ar pierde fișierele cât se face varianta nouă. `paid_at` se scrie
 * la confirmare și se șterge la rambursare, deci spune adevărul tot timpul.
 */

export async function GET(
  req: Request,
  { params }: {
    params: Promise<{ publicId: string; generation: string; variant: string; kind: string }>;
  },
) {
  const { publicId, generation: generationRaw, variant: variantRaw, kind: kindRaw } = await params;
  const url = new URL(req.url);

  const generation = Number(generationRaw);
  const variant = Number(variantRaw);
  const kind = kindRaw as TrackKind;

  if (!Number.isInteger(generation) || generation < 1 || generation > 10) {
    return new Response('Not found', { status: 404 });
  }
  if (!Number.isInteger(variant) || variant < 1 || variant > 4) {
    return new Response('Not found', { status: 404 });
  }
  if (kind !== 'preview' && kind !== 'full') {
    return new Response('Not found', { status: 404 });
  }

  const exp = Number(url.searchParams.get('exp'));
  const sig = url.searchParams.get('sig') ?? '';
  if (!verifyDownload(publicId, generation, variant, kind, exp, sig)) {
    return new Response('Link expirat sau invalid', { status: 403 });
  }

  const order = await db.query.orders.findFirst({ where: eq(orders.publicId, publicId) });
  if (!order) return new Response('Not found', { status: 404 });

  // Semnătura dovedește că linkul e al nostru; plata se verifică separat, la
  // fiecare cerere, ca o rambursare să închidă accesul imediat.
  if (kind === 'full' && order.paidAt === null) {
    return new Response('Melodia completă se deblochează după plată.', { status: 402 });
  }

  const render = await db.query.renders.findFirst({
    where: and(eq(renders.orderId, order.id), eq(renders.generation, generation)),
  });
  if (!render) return new Response('Not found', { status: 404 });

  const track = await db.query.orderTracks.findFirst({
    where: and(eq(orderTracks.renderId, render.id), eq(orderTracks.variant, variant)),
  });

  const rel = kind === 'full' ? track?.fullPath : track?.previewPath;
  if (!rel) return new Response('Not found', { status: 404 });

  const file = absPath(rel);
  let size: number;
  try {
    size = (await stat(file)).size;
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers({
    'Content-Type': 'audio/mpeg',
    'Accept-Ranges': 'bytes',
    // Linkul e semnat și expiră; nu are ce căuta într-un cache public.
    'Cache-Control': 'private, max-age=3600',
  });
  if (kind === 'full') {
    const name = `${order.songTitle ?? 'melodie'}-varianta-${variant}.mp3`
      .replace(/[^\w.\-]+/g, '-');
    headers.set('Content-Disposition', `attachment; filename="${name}"`);
  }

  const range = req.headers.get('range');
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);

  if (match) {
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;

    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }

    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as WebReadableStream;
    return new Response(stream as unknown as ReadableStream, { status: 206, headers });
  }

  headers.set('Content-Length', String(size));
  const stream = Readable.toWeb(createReadStream(file)) as WebReadableStream;
  return new Response(stream as unknown as ReadableStream, { status: 200, headers });
}
