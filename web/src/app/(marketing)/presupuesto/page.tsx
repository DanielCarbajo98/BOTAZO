import type { Metadata } from 'next';
import { Wizard } from '@/components/wizard/Wizard';
import { site } from '@/config/site';
import { modeCopy, quoteNoun, quoteNounCapitalized } from '@/config/mode';

export const metadata: Metadata = {
  title: modeCopy.ctaShort,
  description:
    `Cuéntanos tu viaje en 3 minutos y te enviamos un ${quoteNoun} con tres opciones y el desglose completo. Gratis y sin compromiso.`,
  alternates: { canonical: '/presupuesto' },
};

export default async function PresupuestoPage({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string }>;
}) {
  const params = await searchParams;
  // Nunca confiamos en el parámetro de la URL: lo recortamos y lo limpiamos.
  const preset = params.destino?.slice(0, 80).replace(/[<>]/g, '').trim() || undefined;

  return (
    <>
      <section className="border-b border-ink-100 bg-white py-10">
        <div className="container-page">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
            {quoteNounCapitalized} gratis
          </p>
          <h1 className="sr-only">{modeCopy.ctaShort}</h1>
          <p className="mt-2 max-w-2xl font-display text-2xl font-semibold text-ink-900 md:text-3xl">
            Tres minutos ahora te ahorran horas de búsqueda y, casi siempre, bastante dinero.
          </p>
          <p className="mt-3 max-w-2xl text-ink-600">
            Sin registro, sin pagos y sin compromiso. Te contestamos en menos de {site.contact.responseTimeHours} h.
          </p>
        </div>
      </section>
      <Wizard presetDestination={preset} />
    </>
  );
}
