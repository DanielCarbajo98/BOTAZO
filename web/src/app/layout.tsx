import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { site } from '@/config/site';
import { modeCopy } from '@/config/mode';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK'],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} · ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: modeCopy.metaDescription,
  applicationName: site.name,
  keywords: [
    modeCopy.roleShort.toLowerCase(),
    'viajes low cost',
    'vuelos baratos',
    'presupuesto de viaje gratis',
    'viajes baratos a medida',
    'buscar vuelos baratos',
    'hoteles baratos',
  ],
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: site.url,
    siteName: site.name,
    title: `${site.name} · ${site.tagline}`,
    description: modeCopy.metaDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name} · ${site.tagline}`,
    description: modeCopy.metaDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: { canonical: '/' },
};

/**
 * Todo el sitio se renderiza en cada petición.
 *
 * No es un capricho: la CSP lleva un nonce distinto por petición, y una página
 * prerenderizada en tiempo de compilación llevaría cosido un nonce que ya no
 * coincide, así que el navegador bloquearía todos los scripts de Next y la
 * página se quedaría sin JavaScript. Renderizar en servidor cuesta unos pocos
 * milisegundos por página; quedarse sin hidratar cuesta la web entera.
 */
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  themeColor: '#0b1220',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
