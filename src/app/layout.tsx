import type { Metadata, Viewport } from 'next';
import './globals.css';

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
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
