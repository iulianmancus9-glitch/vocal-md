import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import CookieBanner from '@/components/CookieBanner';

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'https://vocal.md'),
  title: 'Vocal MD — melodii personalizate',
  description:
    'Spui povestea, noi scriem versurile și le cântăm. Asculți un minut gratuit și plătești doar dacă îți place.',
  openGraph: {
    title: 'Vocal MD — melodii personalizate',
    description: 'Versuri gratuite, un minut de ascultat gratuit, plătești doar dacă îți place.',
    locale: 'ro_RO',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" className={poppins.variable}>
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
