/**
 * Documentele legale, citite din content/legal/documente-legale.md.
 *
 * Textul are o singură sursă: fișierul. Paginile se generează din el la build,
 * deci nu se poate întâmpla ca site-ul să spună altceva decât documentul pe care
 * l-a citit un avocat sau l-a aprobat Paddle.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { marked } from 'marked';

export type Lang = 'ro' | 'en';
export type DocSlug = 'termeni' | 'rambursare' | 'confidentialitate';

export const LANGS: Lang[] = ['ro', 'en'];
export const DOCS: DocSlug[] = ['termeni', 'rambursare', 'confidentialitate'];

/** Titlul din markdown pentru fiecare document, pe limbi. */
const HEADINGS: Record<Lang, Record<DocSlug, string>> = {
  ro: {
    termeni: 'Termeni și condiții',
    rambursare: 'Politica de rambursare',
    confidentialitate: 'Politica de confidențialitate',
  },
  en: {
    termeni: 'Terms of Service',
    rambursare: 'Refund Policy',
    confidentialitate: 'Privacy Policy',
  },
};

/** Ce scrie pe legătura din subsol. */
export const LINK_LABELS: Record<Lang, Record<DocSlug, string>> = {
  ro: {
    termeni: 'Termeni și condiții',
    rambursare: 'Politica de rambursare',
    confidentialitate: 'Confidențialitate',
  },
  en: {
    termeni: 'Terms',
    rambursare: 'Refunds',
    confidentialitate: 'Privacy',
  },
};

export interface LegalDoc {
  lang: Lang;
  slug: DocSlug;
  title: string;
  html: string;
}

let cache: string | null = null;

async function source(): Promise<string> {
  cache ??= await readFile(
    join(process.cwd(), 'content', 'legal', 'documente-legale.md'),
    'utf8',
  );
  return cache;
}

/** Partea de română sau de engleză a fișierului. */
function section(md: string, lang: Lang): string {
  const ro = md.indexOf('\n# ROMÂNĂ');
  const en = md.indexOf('\n# ENGLISH');
  if (ro === -1 || en === -1) throw new Error('Fișierul legal nu are secțiunile ROMÂNĂ și ENGLISH.');
  return lang === 'ro' ? md.slice(ro, en) : md.slice(en);
}

/** Bucata dintre un titlu „## …" și următorul. */
function chapter(section: string, heading: string): string {
  const start = section.indexOf(`\n## ${heading}`);
  if (start === -1) throw new Error(`Nu găsesc capitolul „${heading}" în documentele legale.`);
  const rest = section.slice(start + 1);
  const next = rest.indexOf('\n## ');
  const body = next === -1 ? rest : rest.slice(0, next);
  // Titlul îl punem noi în pagină, ca <h1>; îl scoatem din corp ca să nu apară de două ori.
  return body.replace(/^## .*\n/, '').trim();
}

export async function getDoc(lang: Lang, slug: DocSlug): Promise<LegalDoc> {
  const md = await source();
  const heading = HEADINGS[lang][slug];
  const body = chapter(section(md, lang), heading);

  return {
    lang,
    slug,
    title: heading,
    // Tabelul de temeiuri juridice e prea lat pentru un telefon: îi dăm propriul
    // container care derulează lateral, ca pagina în sine să nu o ia în lături.
    html: (await marked.parse(body, { async: true }))
      .replace(/<table>/g, '<div class="lg-tableWrap"><table>')
      .replace(/<\/table>/g, '</table></div>'),
  };
}

export function isLang(v: string): v is Lang {
  return (LANGS as string[]).includes(v);
}

export function isDoc(v: string): v is DocSlug {
  return (DOCS as string[]).includes(v);
}
