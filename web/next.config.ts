import type { NextConfig } from 'next';

/**
 * Cabeceras de seguridad aplicadas a todas las respuestas.
 * La Content-Security-Policy se genera por petición en `src/proxy.ts`
 * porque necesita un nonce distinto cada vez.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // better-sqlite3 es un módulo nativo: no debe pasar por el bundler.
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    optimizePackageImports: ['clsx'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
