'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Hace que las secciones aparezcan al entrar en pantalla.
 *
 * La clase `js-reveal` en <html> la ponemos desde aquí: si el navegador no
 * ejecuta JavaScript, o si algo falla, el contenido se ve tal cual. Nada de
 * páginas en blanco por culpa de una animación.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      root.classList.remove('js-reveal');
      return;
    }

    root.classList.add('js-reveal');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      },
      // Se dispara un poco antes de llegar: el usuario nunca ve el hueco vacío.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );

    const targets = document.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-stagger]');
    for (const target of targets) {
      // Lo que ya está en pantalla al cargar se muestra sin animación de entrada.
      if (target.getBoundingClientRect().top < window.innerHeight * 0.9) {
        target.classList.add('is-revealed');
      } else {
        observer.observe(target);
      }
    }

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
