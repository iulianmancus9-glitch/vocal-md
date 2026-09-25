/**
 * Lista comenzilor.
 *
 * Toate, nu doar cele plătite: cele neterminate spun mai mult despre ce merge
 * prost decât cele reușite. Unde se opresc oamenii e informația care schimbă
 * site-ul.
 *
 * Filtrele și căutarea trec prin adresă, nu prin stare de browser. Așa o
 * pagină de comenzi filtrată se poate pune la favorite și se poate trimite mai
 * departe, iar panoul merge fără JavaScript.
 */
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/lib/db';
import { orders, payments, type OrderStatus } from '@/lib/db/schema';
import { acum, stare } from '@/lib/panou/cuvinte';
import { STYLE_NAMES } from '@/lib/pipeline/brief';

export const dynamic = 'force-dynamic';

/** Grupurile din bara de filtre. Cheia ajunge în adresă. */
const FILTRE: Record<string, { nume: string; stari?: OrderStatus[] }> = {
  toate: { nume: 'Toate' },
  asteapta: { nume: 'Te așteaptă', stari: ['payment_claimed'] },
  platite: { nume: 'Plătite', stari: ['paid', 'delivered'] },
  lucru: { nume: 'În lucru', stari: ['draft', 'lyrics_pending', 'lyrics_ready', 'rendering'] },
  asculta: { nume: 'Ascultă', stari: ['preview_ready'] },
  oprite: { nume: 'Oprite', stari: ['failed', 'refused', 'expired'] },
};

function destinatar(o: typeof orders.$inferSelect): string {
  const cui = o.recipient === 'Altcineva' && o.recipientOther?.trim()
    ? o.recipientOther.trim()
    : (o.recipient ?? '');
  const nume = o.names.filter((n) => n?.trim()).join(', ');
  return [cui, nume].filter(Boolean).join(' · ') || '—';
}

export default async function Comenzi({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; q?: string; spus?: string }>;
}) {
  const { f = 'toate', q = '', spus } = await searchParams;
  const cautat = q.trim();
  const filtru = FILTRE[f] ? f : 'toate';
  const ales = FILTRE[filtru] ?? FILTRE.toate!;

  const conditii = [];
  if (ales.stari) conditii.push(inArray(orders.status, ales.stari));
  if (cautat) {
    conditii.push(
      or(
        ilike(orders.email, `%${cautat}%`),
        ilike(orders.publicId, `%${cautat}%`),
        ilike(orders.songTitle, `%${cautat}%`),
      ),
    );
  }

  const lista = await db
    .select()
    .from(orders)
    .where(conditii.length ? and(...conditii) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(300);

  /* Cifrele de sus se numără în bază, nu din lista de mai sus: lista e tăiată
     la 300 de rânduri, iar un total care se schimbă când filtrezi n-ar fi un
     total. */
  const [numarate] = await db
    .select({
      toate: sql<number>`count(*)::int`,
      platite: sql<number>`count(*) filter (where ${orders.paidAt} is not null)::int`,
      asteapta: sql<number>`count(*) filter (where ${orders.status} = 'payment_claimed')::int`,
      azi: sql<number>`count(*) filter (where ${orders.createdAt} >= current_date)::int`,
    })
    .from(orders);

  const [incasat] = await db
    .select({ bani: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
    .from(payments)
    .where(eq(payments.status, 'completed'));

  return (
    <div className="p-wrap">
      <h1 className="p-h1">Comenzi</h1>
      <p className="p-sub">Tot ce s-a început pe site, nu doar ce s-a vândut.</p>

      {spus && <p className="p-spus" style={{ margin: '0 0 16px' }}>{spus}</p>}

      <div className="p-stats">
        <div className="p-stat">
          <div className="p-statNum p-num">{numarate?.toate ?? 0}</div>
          <div className="p-statLabel">comenzi, în total</div>
        </div>
        <div className="p-stat">
          <div className="p-statNum p-num">{numarate?.azi ?? 0}</div>
          <div className="p-statLabel">începute azi</div>
        </div>
        <div className="p-stat" data-accent={(numarate?.asteapta ?? 0) > 0 ? '1' : '0'}>
          <div className="p-statNum p-num">{numarate?.asteapta ?? 0}</div>
          <div className="p-statLabel">așteaptă confirmarea ta</div>
        </div>
        <div className="p-stat">
          <div className="p-statNum p-num">{((incasat?.bani ?? 0) / 100).toFixed(0)} €</div>
          <div className="p-statLabel">încasat, {numarate?.platite ?? 0} plăți</div>
        </div>
      </div>

      <div className="p-tools">
        <div className="p-filters">
          {Object.entries(FILTRE).map(([cheie, val]) => (
            <Link
              key={cheie}
              className="p-filter"
              data-on={cheie === filtru ? '1' : '0'}
              href={`/panou?f=${cheie}${cautat ? `&q=${encodeURIComponent(cautat)}` : ''}`}
            >
              {val.nume}
            </Link>
          ))}
        </div>
        <form className="p-search" action="/panou" method="get">
          <input type="hidden" name="f" value={filtru} />
          <input
            className="p-input"
            type="search"
            name="q"
            defaultValue={cautat}
            placeholder="email, număr de comandă sau titlu"
          />
          <button className="p-btn" type="submit">Caută</button>
        </form>
      </div>

      <div className="p-card">
        {lista.length === 0 ? (
          <p className="p-empty">
            {cautat ? `Nimic pentru „${cautat}".` : 'Nicio comandă aici.'}
          </p>
        ) : (
          <div className="p-scroll">
            <table className="p-table">
              <thead>
                <tr>
                  <th>Când</th>
                  <th>Comandă</th>
                  <th>Email</th>
                  <th>Pentru cine</th>
                  <th>Stil</th>
                  <th>Unde a ajuns</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((o) => {
                  const s = stare(o.status);
                  return (
                    <tr key={o.id}>
                      <td className="p-muted" style={{ whiteSpace: 'nowrap' }}>
                        {acum(o.createdAt)}
                      </td>
                      <td>
                        <Link className="p-id p-strong" href={`/panou/${o.publicId}`}>
                          {o.publicId}
                        </Link>
                        <div className="p-muted p-cut">{o.songTitle ?? o.titleWanted ?? '—'}</div>
                      </td>
                      <td className="p-cut">{o.email ?? '—'}</td>
                      <td className="p-cut">{destinatar(o)}</td>
                      <td className="p-muted" style={{ whiteSpace: 'nowrap' }}>
                        {STYLE_NAMES[o.styleId ?? ''] ?? o.styleId ?? '—'}
                      </td>
                      <td>
                        <span className="p-pill" data-t={s.ton}>{s.nume}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lista.length === 300 && (
        <p className="p-sub" style={{ marginTop: 12 }}>
          Se arată ultimele 300. Caută după email sau număr ca să ajungi la cele mai vechi.
        </p>
      )}
    </div>
  );
}
