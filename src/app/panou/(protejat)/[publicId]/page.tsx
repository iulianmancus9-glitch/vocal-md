/**
 * O comandă, cu tot ce se știe despre ea.
 *
 * Patru lucruri, în ordinea în care le cauți când îți scrie un client:
 * cine e și ce a cerut, ce text a primit, ce melodii s-au făcut, și ce s-a
 * întâmplat pe drum.
 *
 * Melodiile se ascultă aici, inclusiv variantele integrale ale comenzilor
 * neplătite — de asta linkurile poartă `panou=1`, iar ruta de audio îl acceptă
 * doar de la cineva care e deja în panou.
 */
import { asc, desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { emails, lyricsVersions, orderEvents, orderTracks, orders, payments, renders } from '@/lib/db/schema';
import { acum, cand, eveniment, stare, SURSE } from '@/lib/panou/cuvinte';
import { STYLE_NAMES } from '@/lib/pipeline/brief';
import { downloadUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

function Rand({ eticheta, children }: { eticheta: string; children: React.ReactNode }) {
  return (
    <div className="p-row">
      <dt>{eticheta}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default async function Comanda({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ spus?: string; sterg?: string }>;
}) {
  const { publicId } = await params;
  const { spus, sterg } = await searchParams;

  const order = await db.query.orders.findFirst({ where: eq(orders.publicId, publicId) });
  if (!order) notFound();

  const [versiuni, inregistrari, piese, plati, mesaje, istoric] = await Promise.all([
    db.select().from(lyricsVersions).where(eq(lyricsVersions.orderId, order.id))
      .orderBy(desc(lyricsVersions.version)),
    db.select().from(renders).where(eq(renders.orderId, order.id))
      .orderBy(asc(renders.generation)),
    db.select().from(orderTracks).where(eq(orderTracks.orderId, order.id))
      .orderBy(asc(orderTracks.variant)),
    db.select().from(payments).where(eq(payments.orderId, order.id)),
    db.select().from(emails).where(eq(emails.orderId, order.id))
      .orderBy(desc(emails.createdAt)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id))
      .orderBy(desc(orderEvents.createdAt)).limit(80),
  ]);

  const s = stare(order.status);
  const cui = order.recipient === 'Altcineva' && order.recipientOther?.trim()
    ? order.recipientOther.trim()
    : (order.recipient ?? '—');
  const ocazia = order.occasion === 'Altă ocazie' && order.occasionOther?.trim()
    ? order.occasionOther.trim()
    : (order.occasion ?? '—');

  /* `panou=1` spune rutei de audio să nu ceară plata. Ea verifică singură că
     cererea vine dintr-un panou deschis; parametrul doar cere verificarea. */
  const audio = (generatie: number, varianta: number, fel: 'preview' | 'full') =>
    `${downloadUrl(order.publicId, generatie, varianta, fel)}&panou=1`;

  return (
    <div className="p-wrap">
      <Link className="p-back" href="/panou">← Toate comenzile</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 3px', flexWrap: 'wrap' }}>
        <h1 className="p-h1" style={{ margin: 0 }}>
          {order.songTitle ?? order.titleWanted ?? 'Fără titlu'}
        </h1>
        <span className="p-pill" data-t={s.ton}>{s.nume}</span>
      </div>
      <p className="p-sub">
        <span className="p-id">{order.publicId}</span> · începută {acum(order.createdAt)}
        {' · '}
        <a href={`/comanda/${order.publicId}?t=${order.accessToken}`} target="_blank" rel="noopener noreferrer">
          deschide ca clientul
        </a>
      </p>

      {spus && <p className="p-spus">{spus}</p>}

      {/* ─── ce poți face ─── */}
      <div className="p-actiuni">
        {order.paidAt === null ? (
          <form action="/api/panou/comanda" method="post">
            <input type="hidden" name="comanda" value={order.publicId} />
            <input type="hidden" name="actiune" value="deblocheaza" />
            <button className="p-btn" data-primary="1" type="submit">✅ Deblochează melodia</button>
          </form>
        ) : (
          <form action="/api/panou/comanda" method="post">
            <input type="hidden" name="comanda" value={order.publicId} />
            <input type="hidden" name="actiune" value="respinge" />
            <button className="p-btn" type="submit">❌ Închide accesul (rambursare)</button>
          </form>
        )}

        {order.status === 'payment_claimed' && (
          <form action="/api/panou/comanda" method="post">
            <input type="hidden" name="comanda" value={order.publicId} />
            <input type="hidden" name="actiune" value="respinge" />
            <button className="p-btn" type="submit">❌ N-au intrat banii</button>
          </form>
        )}

        {/* Ștergerea cere două apăsări, nu una. Nu se poate desface. */}
        {sterg === '1' ? (
          <form action="/api/panou/comanda" method="post" className="p-confirm">
            <input type="hidden" name="comanda" value={order.publicId} />
            <input type="hidden" name="actiune" value="sterge" />
            <span>
              Sigur ștergi? Dispar melodiile, versurile și urma plății.
              {order.paidAt !== null && <strong> Comanda asta e plătită.</strong>}
            </span>
            <button className="p-btn" data-danger="1" type="submit">Da, șterge</button>
            <Link className="p-btn" href={`/panou/${order.publicId}`}>Nu</Link>
          </form>
        ) : (
          <Link className="p-btn p-right" href={`/panou/${order.publicId}?sterg=1`}>
            🗑 Șterge comanda
          </Link>
        )}
      </div>

      <div className="p-grid">
        <div style={{ display: 'grid', gap: 14 }}>
          {/* ─── ce a cerut ─── */}
          <div className="p-box">
            <p className="p-boxTitle">Ce a cerut</p>
            <dl className="p-rows" style={{ margin: 0 }}>
              <Rand eticheta="Email">{order.email ?? '—'}</Rand>
              <Rand eticheta="Pentru cine">{cui}</Rand>
              <Rand eticheta="Nume în piesă">
                {order.names.filter((n) => n?.trim()).join(', ') || '—'}
              </Rand>
              <Rand eticheta="Ocazia">{ocazia}</Rand>
              <Rand eticheta="Stil">
                {STYLE_NAMES[order.styleId ?? ''] ?? order.styleId ?? '—'}
                {order.direction ? ` · ${order.direction}` : ''}
              </Rand>
              <Rand eticheta="Stare de spirit">{order.mood ?? '—'}</Rand>
              <Rand eticheta="Voce">{order.voice ?? '—'}</Rand>
              <Rand eticheta="Limba piesei">{order.language}</Rand>
              <Rand eticheta="Titlul cerut">{order.titleWanted ?? '—'}</Rand>
              <Rand eticheta="Versurile">
                {order.lyricsMode === 'own' ? 'aduse de client' : 'scrise de noi'}
              </Rand>
            </dl>

            <p className="p-boxTitle" style={{ margin: '16px 0 8px' }}>Povestea lui</p>
            <p className="p-story">{order.story?.trim() || '— n-a scris nimic —'}</p>
          </div>

          {/* ─── versurile ─── */}
          <div className="p-box">
            <p className="p-boxTitle">
              Versuri · {versiuni.length} {versiuni.length === 1 ? 'variantă' : 'variante'}
            </p>
            {versiuni.length === 0 && <p className="p-muted">Încă niciuna.</p>}
            {versiuni.map((v) => (
              <div className="p-ver" key={v.id} data-cur={v.version === order.lyricsVersion ? '1' : '0'}>
                <div className="p-verTop">
                  <span className="p-strong">Varianta {v.version}</span>
                  {v.version === order.lyricsVersion && (
                    <span className="p-pill" data-t="work">în folosință</span>
                  )}
                  <span className="p-muted">{SURSE[v.source] ?? v.source}</span>
                  <span className="p-muted" style={{ marginLeft: 'auto' }}>{cand(v.createdAt)}</span>
                </div>
                {v.title && <p className="p-muted" style={{ margin: '0 0 6px' }}>„{v.title}&rdquo;</p>}
                <p className="p-lyrics">{v.lyrics}</p>
              </div>
            ))}
          </div>

          {/* ─── melodiile ─── */}
          <div className="p-box">
            <p className="p-boxTitle">
              Înregistrări · {inregistrari.filter((r) => r.status === 'done').length} reușite
            </p>
            {inregistrari.length === 0 && <p className="p-muted">Încă niciuna.</p>}
            {inregistrari.map((r) => {
              const ale = piese.filter((p) => p.renderId === r.id);
              return (
                <div className="p-take" key={r.id}>
                  <div className="p-verTop">
                    <span className="p-strong">Înregistrarea {r.generation}</span>
                    {r.id === order.currentRenderId && (
                      <span className="p-pill" data-t="work">aleasă de client</span>
                    )}
                    <span className="p-pill" data-t={r.status === 'done' ? 'paid' : r.status === 'failed' ? 'bad' : 'work'}>
                      {r.status === 'done' ? 'gata' : r.status === 'failed' ? 'eșuată' : 'în lucru'}
                    </span>
                    <span className="p-muted" style={{ marginLeft: 'auto' }}>{cand(r.createdAt)}</span>
                  </div>
                  {r.styleString && (
                    <p className="p-muted" style={{ margin: '0 0 6px' }}>
                      Trimis la Suno: {r.styleString}
                    </p>
                  )}
                  {r.errorMessage && (
                    <p className="p-muted" style={{ color: 'var(--red)' }}>{r.errorMessage}</p>
                  )}
                  {ale.map((p) => (
                    <div key={p.id} style={{ marginTop: 9 }}>
                      <p className="p-muted" style={{ margin: 0 }}>
                        Varianta {p.variant}
                        {p.durationSeconds ? ` · ${Math.round(p.durationSeconds)}s` : ''}
                        {' · gratuită'}
                      </p>
                      {p.previewPath && (
                        <audio className="p-audio" controls preload="none"
                          src={audio(r.generation, p.variant, 'preview')} />
                      )}
                      {p.fullPath && (
                        <>
                          <p className="p-muted" style={{ margin: '7px 0 0' }}>
                            Varianta {p.variant} · integrală, fără marcă
                          </p>
                          <audio className="p-audio" controls preload="none"
                            src={audio(r.generation, p.variant, 'full')} />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── coloana din dreapta ─── */}
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="p-box">
            <p className="p-boxTitle">Plata</p>
            <dl className="p-rows" style={{ margin: 0 }}>
              <Rand eticheta="Stare">
                <span className="p-pill" data-t={order.paidAt ? 'paid' : 'idle'}>
                  {order.paidAt ? 'plătită' : 'neplătită'}
                </span>
              </Rand>
              <Rand eticheta="Confirmată">{cand(order.paidAt)}</Rand>
              {plati.map((p) => (
                <Rand key={p.id} eticheta="Tranzacție">
                  {(p.amountCents / 100).toFixed(2)} {p.currency} · {p.status}
                  <div className="p-muted p-id">{p.transactionId}</div>
                </Rand>
              ))}
              <Rand eticheta="Reluări rămase">
                {order.regensLeft} text · {order.rendersLeft} înregistrări
              </Rand>
              <Rand eticheta="Se șterge la">{cand(order.expiresAt)}</Rand>
            </dl>
          </div>

          <div className="p-box">
            <p className="p-boxTitle">Consimțăminte</p>
            <dl className="p-rows" style={{ margin: 0 }}>
              <Rand eticheta="Termeni">{cand(order.termsAcceptedAt)}</Rand>
              <Rand eticheta="Retragere">{cand(order.withdrawalWaivedAt)}</Rand>
              <Rand eticheta="Versiunea">{order.legalVersion ?? '—'}</Rand>
              <Rand eticheta="IP">{order.consentIp ?? '—'}</Rand>
              <Rand eticheta="Newsletter">{order.newsletterOptIn ? 'da' : 'nu'}</Rand>
            </dl>
          </div>

          <div className="p-box">
            <p className="p-boxTitle">Emailuri · {mesaje.length}</p>
            {mesaje.length === 0 && <p className="p-muted">Niciunul încă.</p>}
            {mesaje.map((m) => (
              <div className="p-ev" key={m.id}>
                <span className="p-evTime">{cand(m.sentAt ?? m.createdAt)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  {m.subject ?? m.template}
                  <div className="p-evData">
                    {m.status}
                    {m.error ? ` · ${m.error}` : ''}
                  </div>
                </span>
              </div>
            ))}
          </div>

          <div className="p-box">
            <p className="p-boxTitle">Ce s-a întâmplat</p>
            <div className="p-timeline">
              {istoric.map((e) => (
                <div className="p-ev" key={e.id}>
                  <span className="p-evTime">{cand(e.createdAt)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {eveniment(e.type)}
                    {Object.keys((e.data ?? {}) as Record<string, unknown>).length > 0 && (
                      <div className="p-evData">{JSON.stringify(e.data)}</div>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
