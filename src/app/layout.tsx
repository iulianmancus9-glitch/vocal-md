import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import CookieBanner from '@/components/CookieBanner';
import { UI } from '@/lib/i18n';
import { pageLang } from '@/lib/lang';

/**
 * Fontul se descarcă la build și se servește de la noi.
 *
 * Nu e doar o chestiune de viteză: un <link> către fonts.googleapis.com ar
 * trimite adresa IP a fiecărui vizitator către Google, la fiecare vizită, fără
 * consimțământ — exact genul de transfer pe care Politica noastră de
 * confidențialitate nu îl menționează, pentru că nu are loc.
 *
 * `latin-ext` aduce diacriticele: ă, â, î, ș, ț.
 */
const poppins = Poppins({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

/**
 * Titlul și descrierea urmează limba paginii.
 *
 * Contează mai mult decât pare: fila browserului e primul lucru pe care îl
 * vede cineva care ne verifică site-ul, iar un titlu pe care nu-l poate citi
 * îl lasă să ghicească ce vindem.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = UI[await pageLang()];
  return {
    metadataBase: new URL(process.env.APP_URL ?? 'https://vocal.md'),
    title: t.metaTitle,
    description: t.metaDesc,
    openGraph: {
      title: t.metaTitle,
      description: t.metaOgDesc,
      locale: t.metaLocale,
      type: 'website',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await pageLang();
  return (
    <html lang={lang} className={poppins.variable}>
      <body>
        {children}
        <CookieBanner lang={lang} />
      </body>
    </html>
  );
}
