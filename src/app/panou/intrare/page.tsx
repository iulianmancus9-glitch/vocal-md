/**
 * Intrarea în panou.
 *
 * Un câmp de parolă, trimis de un formular obișnuit. Fără JavaScript: nimic
 * din pagina asta n-are nevoie de el, iar un formular care merge fără scripturi
 * merge și când altceva s-a stricat.
 *
 * Cine e deja înăuntru e trimis direct la comenzi — altfel ar vedea un
 * formular de parolă după ce tocmai a intrat.
 */
import { notFound, redirect } from 'next/navigation';
import { panelEnabled, signedIn } from '@/lib/panou/auth';
import { CSS } from '@/lib/panou/stil';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Intrare — Vocal MD',
  robots: { index: false, follow: false },
};

export default async function Intrare({
  searchParams,
}: {
  searchParams: Promise<{ gresit?: string }>;
}) {
  if (!panelEnabled()) notFound();
  if (await signedIn()) redirect('/panou');

  const { gresit } = await searchParams;

  return (
    <>
      <style>{CSS}</style>
      <div className="p-login">
        <div className="p-loginBox">
          <p className="p-loginTitle">VOCAL MD</p>
          <p className="p-loginSub">Panoul de comenzi</p>

          {gresit && <p className="p-err">Parolă greșită. Mai încearcă.</p>}

          <form action="/api/panou/intrare" method="post">
            <input
              className="p-field"
              type="password"
              name="parola"
              placeholder="Parola"
              autoComplete="current-password"
              autoFocus
              required
            />
            <button className="p-submit" type="submit">Intră</button>
          </form>
        </div>
      </div>
    </>
  );
}
