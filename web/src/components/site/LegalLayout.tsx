import type { ReactNode } from 'react';
import { site } from '@/config/site';

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white py-14 md:py-20">
      <div className="container-page max-w-3xl">
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-ink-500">Última actualización: {updated}</p>
        <div className="legal mt-10 space-y-6 text-[0.98rem] leading-relaxed text-ink-700 [&_a]:font-semibold [&_a]:text-brand-800 [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h3]:mt-6 [&_h3]:text-lg [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
          {children}
        </div>
        <p className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
          <strong>Aviso para el titular del sitio:</strong> este texto es una plantilla de partida. Antes de publicar
          hay que rellenar los datos marcados como PENDIENTE en <code>src/config/site.ts</code> y revisarlo con un
          asesor legal, especialmente lo relativo al título-licencia de agencia de viajes, la garantía frente a
          insolvencia y la normativa de viajes combinados (RDL 1/2007 y Directiva (UE) 2015/2302).
        </p>
        <p className="mt-6 text-sm text-ink-500">
          ¿Dudas? Escríbenos a{' '}
          <a href={`mailto:${site.legal.dpoEmail}`} className="font-semibold text-brand-800 underline underline-offset-2">
            {site.legal.dpoEmail}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
