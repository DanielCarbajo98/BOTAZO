import type { Metadata } from 'next';
import { FinalCta, PricingTeaser } from '@/components/home/Sections';
import { Section, SectionHeading } from '@/components/ui/Card';
import { pricing, site } from '@/config/site';
import { eur } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Precios',
  description: `Tarifa fija por persona desde ${pricing.escapada.feePerPerson} €. Sin comisiones ocultas, sin suscripciones y con garantía: si no te ahorramos, no pagas.`,
  alternates: { canonical: '/precios' },
};

const includes = [
  ['Estudio de tu viaje', 'Un agente analiza tu formulario y define la estrategia de búsqueda.'],
  ['Búsqueda completa', 'Aeropuertos alternativos, calendario completo, compañías, combinaciones y alojamientos en varios canales.'],
  ['Presupuesto con tres opciones', 'Con desglose línea por línea y nuestra recomendación razonada.'],
  ['Una ronda de cambios', 'Si nada te encaja, ajustamos y volvemos a buscar sin coste.'],
  ['Gestión de las reservas', 'Emitimos todo y te mandamos los localizadores a tu nombre.'],
  ['Radar de precios', 'Seguimos vigilando y rehacemos la reserva si baja y la tarifa lo permite.'],
  ['Soporte durante el viaje', 'WhatsApp con una persona que conoce tu expediente.'],
  ['Ayuda si algo sale mal', 'Te explicamos qué compensación te corresponde y cómo reclamarla.'],
];

const notIncluded = [
  ['El precio del viaje', 'Vuelos, hoteles y servicios los pagas a su precio, sin recargo nuestro.'],
  ['Seguros', 'Te lo buscamos y comparamos, pero lo contratas tú a la aseguradora.'],
  ['Tasas y visados', 'Te avisamos de todos los que necesitas y de cuánto cuestan.'],
];

export default function PreciosPage() {
  return (
    <>
      <Section tone="night" className="pb-10">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-300">Precios</p>
          <h1 className="mt-3 text-4xl text-white md:text-5xl">Cobramos poco y se ve todo</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-300">
            El problema de las agencias no es que cobren: es que no sabes cuánto. Nuestra tarifa va en una línea
            aparte del presupuesto, es la misma tanto si tu viaje cuesta {eur(300)} como {eur(3000)}, y si no te
            ahorramos dinero no la pagas.
          </p>
        </div>
      </Section>

      <PricingTeaser />

      <Section tone="sand">
        <SectionHeading eyebrow="Qué entra y qué no" title="La letra pequeña, en grande" />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-card border border-brand-200 bg-white p-6">
            <h3 className="text-xl text-brand-900">Incluido en la tarifa</h3>
            <ul className="mt-5 space-y-4">
              {includes.map(([title, body]) => (
                <li key={title} className="flex gap-3">
                  <span aria-hidden className="mt-0.5 text-brand-600">
                    ✓
                  </span>
                  <span>
                    <span className="block font-semibold text-ink-900">{title}</span>
                    <span className="block text-sm leading-relaxed text-ink-600">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-card border border-ink-100 bg-white p-6">
            <h3 className="text-xl text-ink-800">No incluido (y no lo tocamos)</h3>
            <ul className="mt-5 space-y-4">
              {notIncluded.map(([title, body]) => (
                <li key={title} className="flex gap-3">
                  <span aria-hidden className="mt-0.5 text-ink-300">
                    —
                  </span>
                  <span>
                    <span className="block font-semibold text-ink-900">{title}</span>
                    <span className="block text-sm leading-relaxed text-ink-600">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-2xl bg-sand-100 p-4 text-sm leading-relaxed text-ink-600">
              Cuando reservamos a tu nombre, pagas el importe exacto del proveedor. Puedes comprobarlo en su web con
              el localizador que te damos.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="white">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl">Cómo funciona la garantía</h2>
          <ol className="mt-6 space-y-4 text-[0.98rem] leading-relaxed text-ink-700">
            <li className="rounded-2xl border border-ink-100 bg-sand-50 p-5">
              <strong className="text-ink-900">1.</strong> Recibes nuestro presupuesto con el desglose completo.
            </li>
            <li className="rounded-2xl border border-ink-100 bg-sand-50 p-5">
              <strong className="text-ink-900">2.</strong> Buscas por tu cuenta el mismo viaje: mismas fechas, mismo
              tipo de vuelo y de alojamiento, con el equipaje y los traslados incluidos.
            </li>
            <li className="rounded-2xl border border-ink-100 bg-sand-50 p-5">
              <strong className="text-ink-900">3.</strong> Si tu precio total es igual o mejor que el nuestro, nos
              mandas la captura y te quitamos la tarifa de gestión. Reservas con nosotros a coste cero, o te vas con
              tu opción y tan amigos.
            </li>
          </ol>
          <p className="mt-6 text-sm leading-relaxed text-ink-500">
            La comparación tiene que ser del mismo viaje: no vale una tarifa sin equipaje frente a una con maleta
            facturada, ni un hotel no reembolsable frente a uno cancelable. Escríbenos a{' '}
            <a href={`mailto:${site.contact.email}`} className="font-semibold text-brand-800 underline underline-offset-2">
              {site.contact.email}
            </a>{' '}
            dentro de la validez del presupuesto.
          </p>
        </div>
      </Section>

      <FinalCta />
    </>
  );
}
