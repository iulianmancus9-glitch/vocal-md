/**
 * POST /api/panou/intrare — verifică parola și deschide panoul.
 *
 * Primește un formular obișnuit, nu JSON: pagina de intrare n-are JavaScript,
 * iar un formular care merge fără scripturi merge și când altceva s-a stricat.
 *
 * Limita pe IP e aici pentru că parola e un singur cuvânt, iar o adresă lăsată
 * liberă poate fi încercată de zece mii de ori pe minut. Zece încercări pe zi
 * de pe aceeași adresă e mai mult decât îi trebuie unui om care și-a uitat
 * parola, și mult mai puțin decât îi trebuie unui program ca s-o ghicească.
 */
import { NextResponse } from 'next/server';
import { panelEnabled, passwordOk, signIn } from '@/lib/panou/auth';
import { checkLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!panelEnabled()) return new Response('Not found', { status: 404 });

  const url = new URL(req.url);
  const gresit = new URL('/panou/intrare?gresit=1', url.origin);

  const limit = await checkLimit('panou', { ip: clientIp(req.headers) });
  if (!limit.ok) {
    return NextResponse.redirect(new URL('/panou/intrare?gresit=1', url.origin), 303);
  }

  const form = await req.formData().catch(() => null);
  const parola = String(form?.get('parola') ?? '');

  if (!passwordOk(parola)) {
    return NextResponse.redirect(gresit, 303);
  }

  await signIn();
  // 303 ca browserul să ceară pagina nouă cu GET, nu să retrimită formularul.
  return NextResponse.redirect(new URL('/panou', url.origin), 303);
}
