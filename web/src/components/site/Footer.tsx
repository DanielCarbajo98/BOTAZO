import Link from 'next/link';
import { site } from '@/config/site';
import { modeCopy } from '@/config/mode';
import { LogoMark } from '@/components/site/Logo';

const columns = [
  {
    title: 'Viaja con nosotros',
    links: [
      { href: '/presupuesto', label: modeCopy.ctaShort },
      { href: '/como-funciona', label: 'Cómo funciona' },
      { href: '/precios', label: 'Cuánto cobramos' },
      { href: '/seguimiento', label: 'Seguir mi solicitud' },
    ],
  },
  {
    title: 'Aprende a viajar barato',
    links: [
      { href: '/trucos', label: 'Nuestros trucos' },
      { href: '/opiniones', label: 'Opiniones reales' },
      { href: '/faq', label: 'Preguntas frecuentes' },
      { href: '/contacto', label: 'Hablar con una persona' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/aviso-legal', label: 'Aviso legal' },
      { href: '/privacidad', label: 'Privacidad' },
      { href: '/cookies', label: 'Cookies' },
      { href: '/condiciones', label: 'Condiciones de contratación' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-night text-ink-300">
      <div className="container-page py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark />
              <span className="font-display text-xl font-semibold text-white">{site.name}</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">
              Buscamos por ti, cobramos una tarifa fija y te enseñamos el desglose completo.
            </p>
            <p className="mt-4 max-w-xs border-l-2 border-brand-700/50 pl-3 text-sm italic leading-relaxed text-ink-500">
              {site.story}
            </p>
            <div className="mt-6 flex flex-col gap-1.5 text-sm">
              <a href={`mailto:${site.contact.email}`} className="text-ink-200 transition-colors hover:text-brand-300">
                {site.contact.email}
              </a>
              <a href={`tel:${site.contact.phoneE164}`} className="text-ink-200 transition-colors hover:text-brand-300">
                {site.contact.phoneDisplay}
              </a>
              <span className="text-ink-500">{site.contact.hours}</span>
            </div>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="font-sans text-xs font-bold uppercase tracking-[0.16em] text-brand-300">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-ink-300 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 border-t border-white/10 pt-8 text-xs leading-relaxed text-ink-500">
          <p>
            © {new Date().getFullYear()} {site.legal.company}. NIF {site.legal.nif}. Título-licencia de agencia de
            viajes: {site.legal.travelAgencyLicence}.
          </p>
          <p className="mt-2 max-w-4xl">
            Los precios orientativos que muestra esta web son estimaciones basadas en medianas de mercado y no
            constituyen una oferta vinculante. El precio en firme es siempre el del presupuesto que te enviamos,
            válido durante el plazo que se indique en él.
          </p>
        </div>
      </div>
    </footer>
  );
}
