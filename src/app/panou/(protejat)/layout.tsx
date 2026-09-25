/**
 * Panoul de comenzi — învelișul comun și paza.
 *
 * Fiecare pagină din grupul `(protejat)` trece prin layout-ul ăsta, deci o
 * pagină nouă e apărată din clipa în care e creată — nu trebuie să-și aducă
 * aminte cineva să pună o verificare în ea.
 *
 * Pagina de intrare stă dinadins în afara grupului. Dacă ar fi fost sub paza
 * asta, ar fi fost trimisă la ea însăși la nesfârșit.
 *
 * Fără parolă în `.env`, panoul răspunde 404, nu „parolă greșită". Un panou
 * care spune că e acolo e un panou pe care cineva începe să-l încerce.
 */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { panelEnabled, signedIn } from '@/lib/panou/auth';
import { CSS } from '@/lib/panou/stil';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Panou — Vocal MD',
  // N-are ce căuta în Google, oricât de bine ar fi apărat.
  robots: { index: false, follow: false },
};

export default async function Protejat({ children }: { children: React.ReactNode }) {
  if (!panelEnabled()) notFound();
  if (!(await signedIn())) redirect('/panou/intrare');

  return (
    <>
      <style>{CSS}</style>
      <div className="p-head">
        <div className="p-headIn">
          <Link className="p-brand" href="/panou">VOCAL<span>MD</span></Link>
          <span className="p-headNote">panou de comenzi</span>
          <div className="p-headRight">
            <a className="p-btn" href="/" target="_blank" rel="noopener noreferrer">Site</a>
            <form action="/api/panou/iesire" method="post">
              <button className="p-btn" type="submit">Ieși</button>
            </form>
          </div>
        </div>
      </div>
      {children}
    </>
  );
}
