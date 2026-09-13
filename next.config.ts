import type { NextConfig } from 'next';

const config: NextConfig = {
  // Imaginea Docker rulează serverul din .next/standalone, fără node_modules.
  output: 'standalone',
  poweredByHeader: false,
  // Fișierele audio le servim prin route handler, nu prin /public.
  experimental: {
    // Povestea utilizatorului poate fi lungă; 1 MB e mai mult decât suficient.
    serverActions: { bodySizeLimit: '1mb' },
  },
};

export default config;
