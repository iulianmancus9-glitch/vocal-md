/**
 * Exportul pentru Google Sheets — un mini-CRM, fără să instalezi nimic.
 *
 *   /api/export/comenzi.csv?key=…    ce s-a vândut
 *   /api/export/incercari.csv?key=…  cine a încercat și ce a primit
 *
 * În Sheets se leagă cu IMPORTDATA, care reîmprospătează singur. Cheia stă în
 * adresă pentru că Google descarcă fișierul fără să se poată autentifica altfel;
 * de asta e o cheie separată de restul, care nu dă acces la nimic altceva și se
 * poate schimba oricând din .env.
 */
import { timingSafeEqual } from 'node:crypto';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orderTracks, orders, payments, renders } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { csvResponse, toCsv, type CsvValue } from '@/lib/csv';
import { STYLE_NAMES } from '@/lib/pipeline/brief';

export const dynamic = 'force-dynamic';

/** Stările, în cuvinte pe care le înțelege cineva care nu a scris codul. */
const STATUS_LABEL: Record<string, string> = {
  draft: 'a completat formularul',
  lyrics_pending: 'se scriu versurile',
  lyrics_ready: 'a primit versurile',
  rendering: 'se înregistrează melodia',
  preview_ready: 'a ascultat previzualizarea',
  paid: 'a plătit',
  delivered: 'a primit melodia',
  refused: 'refuzată (conținut)',
  failed: 'eroare tehnică',
  expired: 'expirată',
};

function keyOk(given: string): boolean {
  const expected = env.EXPORT_KEY;
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Cui îi e dedicată piesa, în text, cu „Altcineva" rezolvat. */
function recipientOf(o: typeof orders.$inferSelect): string {
  return o.recipient === 'Altcineva' && o.recipientOther?.trim()
    ? o.recipientOther.trim()
    : (o.recipient ?? '');
}

function occasionOf(o: typeof orders.$inferSelect): string {
  return o.occasion === 'Altă ocazie' && o.occasionOther?.trim()
    ? o.occasionOther.trim()
    : (o.occasion ?? '');
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sheet: string }> },
) {
  const { sheet } = await params;
  const url = new URL(req.url);

  if (!keyOk(url.searchParams.get('key') ?? '')) {
    return new Response('Cheie lipsă sau greșită.', { status: 403 });
  }

  const bom = url.searchParams.get('bom') === '1';
  const limit = Math.min(5000, Number(url.searchParams.get('limit')) || 5000);

  const all = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
  if (all.length === 0) {
    return csvResponse(toCsv(['Nicio comandă încă'], []), sheet, bom);
  }

  const ids = all.map((o) => o.id);
  const [renderRows, trackRows, paymentRows] = await Promise.all([
    db.select().from(renders).where(inArray(renders.orderId, ids)),
    db.select({ orderId: orderTracks.orderId, n: sql<number>`count(*)::int` })
      .from(orderTracks).where(inArray(orderTracks.orderId, ids)).groupBy(orderTracks.orderId),
    db.select().from(payments).where(inArray(payments.orderId, ids)),
  ]);

  const rendersOf = (id: string) => renderRows.filter((r) => r.orderId === id);
  const tracksOf = (id: string) => trackRows.find((t) => t.orderId === id)?.n ?? 0;
  const paymentOf = (id: string) => paymentRows.find((p) => p.orderId === id);

  /* ─── ce s-a vândut ─── */
  if (sheet === 'comenzi.csv' || sheet === 'comenzi') {
    const paid = all.filter((o) => o.status === 'paid' || o.status === 'delivered');
    const rows: CsvValue[][] = paid.map((o) => {
      const pay = paymentOf(o.id);
      return [
        o.paidAt ?? o.updatedAt,
        o.publicId,
        o.email,
        o.songTitle ?? o.titleWanted,
        STYLE_NAMES[o.styleId ?? ''] ?? o.styleId,
        o.direction,
        o.mood,
        o.voice,
        recipientOf(o),
        o.names.join(', '),
        occasionOf(o),
        o.language,
        pay ? (pay.amountCents / 100).toFixed(2) : '',
        pay?.currency ?? '',
        pay?.transactionId ?? '',
        pay ? STATUS_LABEL[o.status] : 'plată neînregistrată',
        rendersOf(o.id).filter((r) => r.status === 'done').length,
        o.createdAt,
      ];
    });

    return csvResponse(
      toCsv(
        ['Data plății', 'Comandă', 'Email', 'Titlu', 'Stil', 'Direcție', 'Stare de spirit',
         'Voce', 'Pentru cine', 'Nume', 'Ocazie', 'Limbă', 'Sumă', 'Monedă',
         'Tranzacție', 'Stare', 'Înregistrări', 'Data comenzii'],
        rows,
      ),
      'comenzi.csv',
      bom,
    );
  }

  /* ─── cine a încercat și ce a primit ─── */
  if (sheet === 'incercari.csv' || sheet === 'incercari') {
    const rows: CsvValue[][] = all.map((o) => {
      const done = rendersOf(o.id).filter((r) => r.status === 'done').length;
      return [
        o.createdAt,
        o.publicId,
        o.email,
        STATUS_LABEL[o.status] ?? o.status,
        o.paidAt !== null,
        STYLE_NAMES[o.styleId ?? ''] ?? o.styleId,
        o.direction,
        o.mood,
        o.voice,
        recipientOf(o),
        o.names.join(', '),
        occasionOf(o),
        o.language,
        o.lyricsMode === 'own' ? 'aduse de client' : 'scrise de noi',
        o.lyricsReadyAt !== null,
        done,
        tracksOf(o.id),
        o.regensLeft,
        o.rendersLeft,
        o.failureMessage,
        // Povestea e materia primă a piesei: cel mai util lucru de citit când
        // vrei să înțelegi de ce a ieșit bine sau prost.
        o.story?.replace(/\s+/g, ' ').slice(0, 500),
        o.consentIp,
      ];
    });

    return csvResponse(
      toCsv(
        ['Data', 'Comandă', 'Email', 'Unde a ajuns', 'A plătit', 'Stil', 'Direcție',
         'Stare de spirit', 'Voce', 'Pentru cine', 'Nume', 'Ocazie', 'Limbă', 'Versuri',
         'A primit versuri', 'Înregistrări reușite', 'Piese generate', 'Reluări text rămase',
         'Reluări melodie rămase', 'Motiv oprire', 'Povestea', 'IP'],
        rows,
      ),
      'incercari.csv',
      bom,
    );
  }

  return new Response('Foaie necunoscută. Folosește comenzi.csv sau incercari.csv.', {
    status: 404,
  });
}
