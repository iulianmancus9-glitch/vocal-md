/**
 * Statistica, lună de lună.
 *
 * Nu numărul de vânzări e lucrul interesant, ci **unde se pierd oamenii**.
 * De asta fiecare lună arată toată pâlnia: câți au început, câți au ajuns la
 * versuri, câți au ascultat melodia, câți au plătit. Între două coloane
 * vecine se vede exact pasul care rupe.
 *
 * Totul se numără în bază, într-o singură interogare pe tabel. O sută de
 * comenzi citite în Node și numărate acolo ar merge la fel de bine azi, și
 * prost în ziua în care sunt zece mii.
 *
 * Banii se leagă de luna plății, nu de luna comenzii: o melodie începută în
 * ianuarie și plătită în februarie e venit de februarie. Așa arată și extrasul
 * de la bancă, deci cifrele se pot compara.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { STYLE_NAMES } from '@/lib/pipeline/brief';

export const dynamic = 'force-dynamic';

/**
 * Formele rândurilor întoarse de interogările de mai jos.
 *
 * Scrise ca `type`, nu ca `interface`, și asta nu e o preferință: `db.execute`
 * cere o formă care se poate citi după orice nume de coloană. O `interface`
 * poate fi completată mai târziu, în alt fișier, deci TypeScript nu-i poate
 * promite asta; unui `type` da, pentru că e închis pe loc.
 */
type Luna = {
  luna: string;
  incepute: number;
  cuVersuri: number;
  auAscultat: number;
  platite: number;
  bani: number;
};

type Stil = {
  stil: string | null;
  incepute: number;
  platite: number;
};

const LUNI = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
];

function numeLuna(iso: string): string {
  const d = new Date(iso);
  return `${LUNI[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Procent, sau o liniuță când n-are din ce se calcula. */
function procent(parte: number, intreg: number): string {
  if (!intreg) return '—';
  return `${Math.round((parte / intreg) * 100)}%`;
}

export default async function Statistici() {
  const { rows: luni } = await db.execute<Luna>(sql`
    select
      to_char(date_trunc('month', created_at), 'YYYY-MM-DD')            as luna,
      count(*)::int                                                     as incepute,
      count(*) filter (where lyrics_ready_at is not null)::int           as "cuVersuri",
      count(*) filter (where preview_ready_at is not null)::int          as "auAscultat",
      count(*) filter (where paid_at is not null)::int                   as platite,
      0::int                                                            as bani
    from orders
    group by 1
    order by 1 desc
    limit 24
  `);

  /* Banii, separat, pe luna plății. Un `join` aici ar fi legat suma de luna
     comenzii, iar februarie ar fi apărut sărac pentru o plată care chiar a
     intrat în februarie. */
  const { rows: incasari } = await db.execute<{ luna: string; bani: number }>(sql`
    select
      to_char(date_trunc('month', paid_at), 'YYYY-MM-DD') as luna,
      coalesce(sum(p.amount_cents), 0)::int               as bani
    from orders o
    join payments p on p.order_id = o.id and p.status = 'completed'
    where o.paid_at is not null
    group by 1
  `);

  const baniPe = new Map(incasari.map((r) => [r.luna, r.bani]));

  const { rows: stiluri } = await db.execute<Stil>(sql`
    select
      style_id                                          as stil,
      count(*)::int                                     as incepute,
      count(*) filter (where paid_at is not null)::int   as platite
    from orders
    where style_id is not null
    group by 1
    order by 2 desc
  `);

  const totalIncepute = luni.reduce((s, l) => s + l.incepute, 0);
  const totalPlatite = luni.reduce((s, l) => s + l.platite, 0);
  const totalBani = incasari.reduce((s, r) => s + r.bani, 0);

  return (
    <div className="p-wrap">
      <h1 className="p-h1">Statistici</h1>
      <p className="p-sub">
        Nu numărul de vânzări e lucrul interesant, ci unde se pierd oamenii pe drum.
      </p>

      <div className="p-stats">
        <div className="p-stat">
          <div className="p-statNum p-num">{totalIncepute}</div>
          <div className="p-statLabel">comenzi începute</div>
        </div>
        <div className="p-stat">
          <div className="p-statNum p-num">{totalPlatite}</div>
          <div className="p-statLabel">plătite</div>
        </div>
        <div className="p-stat" data-accent="1">
          <div className="p-statNum p-num">{procent(totalPlatite, totalIncepute)}</div>
          <div className="p-statLabel">din cei care încep, cumpără</div>
        </div>
        <div className="p-stat">
          <div className="p-statNum p-num">{(totalBani / 100).toFixed(0)} €</div>
          <div className="p-statLabel">încasat, în total</div>
        </div>
      </div>

      <div className="p-card" style={{ marginBottom: 18 }}>
        <div className="p-scroll">
          <table className="p-table">
            <thead>
              <tr>
                <th>Luna</th>
                <th>Au început</th>
                <th>Au primit versuri</th>
                <th>Au ascultat melodia</th>
                <th>Au plătit</th>
                <th>Cumpără</th>
                <th>Încasat</th>
              </tr>
            </thead>
            <tbody>
              {luni.length === 0 && (
                <tr><td colSpan={7}><p className="p-empty">Nicio comandă încă.</p></td></tr>
              )}
              {luni.map((l) => {
                const bani = baniPe.get(l.luna) ?? 0;
                return (
                  <tr key={l.luna}>
                    <td className="p-strong" style={{ whiteSpace: 'nowrap' }}>{numeLuna(l.luna)}</td>
                    <td className="p-num">{l.incepute}</td>
                    <td className="p-num">
                      {l.cuVersuri}
                      <span className="p-muted"> · {procent(l.cuVersuri, l.incepute)}</span>
                    </td>
                    <td className="p-num">
                      {l.auAscultat}
                      <span className="p-muted"> · {procent(l.auAscultat, l.incepute)}</span>
                    </td>
                    <td className="p-num p-strong">{l.platite}</td>
                    <td>
                      <span className="p-pill" data-t={l.platite > 0 ? 'paid' : 'idle'}>
                        {procent(l.platite, l.incepute)}
                      </span>
                    </td>
                    <td className="p-num p-strong">{(bani / 100).toFixed(0)} €</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="p-h1" style={{ fontSize: 17 }}>Ce stiluri se cer</h2>
      <p className="p-sub">
        Din toate lunile. Un stil cerut des dar cumpărat rar e un stil care sună prost.
      </p>

      <div className="p-card">
        <div className="p-scroll">
          <table className="p-table">
            <thead>
              <tr>
                <th>Stil</th>
                <th>Cerut</th>
                <th>Cumpărat</th>
                <th>Rată</th>
              </tr>
            </thead>
            <tbody>
              {stiluri.length === 0 && (
                <tr><td colSpan={4}><p className="p-empty">Nimic încă.</p></td></tr>
              )}
              {stiluri.map((s) => (
                <tr key={s.stil ?? '—'}>
                  <td className="p-strong">{STYLE_NAMES[s.stil ?? ''] ?? s.stil}</td>
                  <td className="p-num">{s.incepute}</td>
                  <td className="p-num">{s.platite}</td>
                  <td>
                    <span className="p-pill" data-t={s.platite > 0 ? 'paid' : 'idle'}>
                      {procent(s.platite, s.incepute)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
