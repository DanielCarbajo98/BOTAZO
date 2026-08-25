import type { Metadata } from 'next';
import { FinalCta } from '@/components/home/Sections';
import { Section, SectionHeading } from '@/components/ui/Card';
import { JsonLd } from '@/components/site/JsonLd';
import { tricks } from '@/content/differentiators';
import { ButtonLink } from '@/components/ui/Button';
import { site } from '@/config/site';

export const metadata: Metadata = {
  title: 'Trucos para viajar barato',
  description:
    'Los ocho métodos que usamos para bajar el precio de un viaje: aeropuertos alternativos, calendario completo, billetes separados, la cuenta real del equipaje y más.',
  alternates: { canonical: '/trucos' },
};

export default function TrucosPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Cómo viajar barato: los ocho métodos que usamos en cada búsqueda',
    author: { '@type': 'Organization', name: site.name },
    publisher: { '@type': 'Organization', name: site.name },
    description: metadata.description,
  };

  return (
    <>
      <JsonLd data={structuredData} />

      <Section tone="night" className="pb-10">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-300">Guía gratuita</p>
          <h1 className="mt-3 text-4xl text-white md:text-5xl">Los ocho trucos con los que bajamos el precio</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-300">
            Aquí está el método entero, sin reservarnos nada. Si tienes tiempo y paciencia, puedes aplicarlo tú
            mismo: funciona igual. Nos contratas para ahorrarte las horas, no porque escondamos nada.
          </p>
        </div>
      </Section>

      <Section tone="white">
        <div className="mx-auto max-w-3xl space-y-10">
          {tricks.map((trick, index) => (
            <article key={trick.id} id={trick.id} className="scroll-mt-24">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-3xl font-semibold text-brand-200">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2 className="text-2xl">{trick.title}</h2>
              </div>
              <p className="mt-3 text-lg leading-relaxed text-ink-800">{trick.short}</p>
              <p className="mt-3 leading-relaxed text-ink-600">{trick.detail}</p>
              <p className="mt-4 inline-flex rounded-pill bg-coral-50 px-3 py-1.5 text-sm font-semibold text-coral-700">
                {trick.saving}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="sand">
        <SectionHeading
          eyebrow="Errores caros"
          title="Y tres cosas que casi todo el mundo hace mal"
        />
        <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-3">
          {[
            {
              title: 'Buscar en modo incógnito «para que no suba»',
              body: 'Los precios no suben porque te espíen las cookies: suben porque se agotan las plazas baratas de esa tarifa. El incógnito no ahorra un euro; la flexibilidad, sí.',
            },
            {
              title: 'Reservar siempre con mucha antelación',
              body: 'Demasiada antelación también es cara: las aerolíneas abren con tarifas altas. La ventana buena suele estar entre dos y cinco meses antes, según la ruta.',
            },
            {
              title: 'Mirar solo el precio del vuelo',
              body: 'El vuelo es la mitad de la cuenta. Equipaje, traslados, resort fees y la comida del hotel mal elegido se llevan la diferencia sin que te des cuenta.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-card border border-ink-100 bg-white p-6">
              <h3 className="text-lg leading-snug">{item.title}</h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-600">{item.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <ButtonLink href="/presupuesto" size="lg">
            O deja que lo hagamos nosotros
          </ButtonLink>
        </div>
      </Section>

      <FinalCta />
    </>
  );
}
