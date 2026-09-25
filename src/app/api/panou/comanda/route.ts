/**
 * POST /api/panou/comanda — ce faci cu o comandă din panou.
 *
 * Trei acțiuni, toate prin formulare obișnuite: deblochează, respinge, șterge.
 * Aceleași funcții pe care le cheamă și butoanele de pe Telegram, ca să nu
 * existe două feluri de a debloca o comandă.
 *
 * Paza e aici, nu în layout: layout-ul apără paginile, nu rutele. O rută de
 * scriere lăsată neapărată ar fi fost o ușă din dos către ștergerea oricărei
 * comenzi, de către oricine îi află adresa.
 */
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { deblocheaza, respinge, stergeComanda } from '@/lib/comenzi';
import { signedIn } from '@/lib/panou/auth';
import { esc, notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!(await signedIn())) return new Response('Not found', { status: 404 });

  const origin = new URL(req.url).origin;
  const form = await req.formData().catch(() => null);
  const publicId = String(form?.get('comanda') ?? '');
  const actiune = String(form?.get('actiune') ?? '');

  const order = await db.query.orders.findFirst({ where: eq(orders.publicId, publicId) });
  if (!order) return NextResponse.redirect(new URL('/panou', origin), 303);

  const inapoi = (mesaj: string) =>
    NextResponse.redirect(
      new URL(`/panou/${publicId}?spus=${encodeURIComponent(mesaj)}`, origin),
      303,
    );

  /**
   * Orice cade aici ajunge înapoi în panou, scris cu litere.
   *
   * Fără asta, o acțiune care eșuează arunca omul pe pagina de eroare a lui
   * Next — un ecran care nu spune nimic și din care nu se poate merge nicăieri.
   * Motivul adevărat rămânea în jurnalul serverului, unde nu se uită nimeni.
   */
  try {
    if (actiune === 'deblocheaza') {
      const raspuns = await deblocheaza(order, 'panou');
      /* Și pe Telegram, ca să nu se piardă urma: dacă deblochezi din panou, pe
         telefon rămânea un mesaj cu butoane care păreau neapăsate. */
      void notify(`✅ Deblocată din panou: <code>${esc(publicId)}</code>`);
      return inapoi(raspuns);
    }

    if (actiune === 'respinge') {
      const raspuns = await respinge(order, 'panou');
      void notify(`❌ Respinsă din panou: <code>${esc(publicId)}</code>`);
      return inapoi(raspuns);
    }

    if (actiune === 'sterge') {
      await stergeComanda(order);
      void notify(`🗑 Ștearsă din panou: <code>${esc(publicId)}</code>`);
      // Comanda nu mai există, deci nu mai are pagină la care să ne întoarcem.
      return NextResponse.redirect(
        new URL(`/panou?spus=${encodeURIComponent(`Comanda ${publicId} a fost ștearsă.`)}`, origin),
        303,
      );
    }
  } catch (err) {
    const mesaj = err instanceof Error ? err.message : String(err);
    console.error(`Panou: „${actiune}" a eșuat pentru ${publicId}:`, err);
    return inapoi(`Nu a mers: ${mesaj}`);
  }

  return NextResponse.redirect(new URL(`/panou/${publicId}`, origin), 303);
}
