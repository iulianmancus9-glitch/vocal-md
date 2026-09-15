/**
 * Paginile legale. Generate static la build, din fișierul de documente.
 *
 * Stau pe adrese proprii, nu într-o fereastră din formular: Paddle cere să le
 * poată deschide un om înainte să aprobe contul, iar din formular se deschid în
 * filă nouă, ca cineva care citește Termenii la pasul patru să nu-și piardă
 * povestea scrisă.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import HtmlLang from '@/components/HtmlLang';
import { DOCS, LANGS, LINK_LABELS, getDoc, isDoc, isLang } from '@/lib/legal';
import './legal.css';

export const dynamic = 'force-static';

type Params = { params: Promise<{ lang: string; doc: string }> };

export function generateStaticParams() {
  return LANGS.flatMap((lang) => DOCS.map((doc) => ({ lang, doc })));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, doc } = await params;
  if (!isLang(lang) || !isDoc(doc)) return {};
  const { title } = await getDoc(lang, doc);
  return { title: `${title} — Vocal MD` };
}

export default async function LegalPage({ params }: Params) {
  const { lang, doc } = await params;
  if (!isLang(lang) || !isDoc(doc)) notFound();

  const { title, html } = await getDoc(lang, doc);
  const other = lang === 'ro' ? 'en' : 'ro';

  return (
    <div className="lg">
      <HtmlLang lang={lang} />
      <header className="lg-head">
        <Link href="/" className="lg-mark">VOCAL</Link>
        <Link href={`/legal/${other}/${doc}`} className="lg-lang">
          {other === 'en' ? 'English' : 'Română'}
        </Link>
      </header>

      <main className="lg-wrap">
        <h1 className="lg-title">{title}</h1>
        <article className="lg-body" dangerouslySetInnerHTML={{ __html: html }} />

        <nav className="lg-other" aria-label={lang === 'ro' ? 'Celelalte documente' : 'Other documents'}>
          {DOCS.filter((d) => d !== doc).map((d) => (
            <Link key={d} href={`/legal/${lang}/${d}`} className="lg-otherLink">
              {LINK_LABELS[lang][d]}
            </Link>
          ))}
        </nav>

        <p className="lg-foot">
          S.R.L. „WADE PRODUCTION” · IDNO 1025600056881 · base.vocalmd@gmail.com
        </p>
      </main>
    </div>
  );
}
