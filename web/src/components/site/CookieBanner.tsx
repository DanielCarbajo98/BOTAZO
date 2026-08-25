'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'alisio-cookies-v1';

/**
 * Este sitio solo usa almacenamiento técnico (borrador del formulario y sesión
 * del backoffice). No hay analítica de terceros ni marketing, así que el banner
 * es informativo y no bloquea nada: es lo que exige la AEPD en ese caso.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Navegador con almacenamiento bloqueado: no mostramos nada.
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignorado */
    }
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-3 z-60 mx-auto max-w-2xl rounded-2xl border border-ink-200 bg-white p-4 shadow-lift sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm leading-relaxed text-ink-700">
          Solo usamos almacenamiento técnico imprescindible: guardar el borrador de tu formulario y mantener la sesión.
          No hay cookies de publicidad ni de seguimiento.{' '}
          <Link href="/cookies" className="font-semibold text-brand-800 underline underline-offset-2">
            Más información
          </Link>
          .
        </p>
        <Button onClick={dismiss} size="sm" className="shrink-0">
          Entendido
        </Button>
      </div>
    </div>
  );
}
