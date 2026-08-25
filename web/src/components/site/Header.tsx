'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/site/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const links = [
  { href: '/como-funciona', label: 'Cómo funciona' },
  { href: '/precios', label: 'Precios' },
  { href: '/trucos', label: 'Trucos de viaje' },
  { href: '/opiniones', label: 'Opiniones' },
  { href: '/contacto', label: 'Contacto' },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Al navegar cerramos el menú y liberamos el scroll.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b transition-all duration-300',
        scrolled || open
          ? 'border-ink-100 bg-sand-50/90 backdrop-blur-md'
          : 'border-transparent bg-transparent',
      )}
    >
      <div className="container-page flex h-18 items-center justify-between gap-6 py-3">
        <Logo />

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-2 text-[0.94rem] font-medium transition-colors',
                  active ? 'text-brand-800' : 'text-ink-600 hover:text-ink-900',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ButtonLink href="/seguimiento" variant="ghost" size="sm">
            Ver mi presupuesto
          </ButtonLink>
          <ButtonLink href="/presupuesto" variant="primary" size="sm">
            Pedir presupuesto gratis
          </ButtonLink>
        </div>

        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-800 lg:hidden"
          aria-expanded={open}
          aria-controls="menu-movil"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? 'Cerrar menú' : 'Abrir menú'}</span>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {open ? (
        <div id="menu-movil" className="border-t border-ink-100 bg-sand-50 lg:hidden">
          <nav aria-label="Principal (móvil)" className="container-page flex flex-col gap-1 py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-3 text-lg font-medium text-ink-800 hover:bg-ink-100"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <ButtonLink href="/presupuesto" size="lg">
                Pedir presupuesto gratis
              </ButtonLink>
              <ButtonLink href="/seguimiento" variant="outline" size="lg">
                Ver mi presupuesto
              </ButtonLink>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
