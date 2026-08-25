import type { Metadata } from 'next';
import { FinalCta, PricingTeaser } from '@/components/home/Sections';
import { Section, SectionHeading } from '@/components/ui/Card';
import { pricing, site } from '@/config/site';
import { eur } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Precios',
  description: `Tarifa fija por persona desde ${pricing.escapada.feePerPerson} €, en una línea aparte del presupuesto. Sin comisiones ocultas, sin suscripciones y con garantía: si no te ahorramos, no pagas.`,
  alternates: { canonical: '/precios' },
};

const includes = [
  ['Estudio de tu viaje', 'Un agente analiza tu formulario y define la estrategia de búsqueda.'],
  ['Búsqueda completa', 'Aeropuertos alternativos, calendario completo, compañías, combinaciones y alojamientos en varios canales.'],
  ['Presupuesto con tres opciones', 'Con desglose línea por línea y nuestra recomendación razonada.'],
  ['Una ronda de cambios', 'Si nada te encaja, ajustamos y volvemos a buscar sin coste.'],
  ['Gestión de las reservas', 'Emitimos todo y te mandamos los localizadores a tu nombre.'],
  [
    'Radar de precios',
    `Seguimos vigilando y rehacemos la reserva si baja. El ${Math.round(pricing.savingShare.client * 100)} % del ahorro es tuyo.`,
  ],
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
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-400">
            Aquí abajo está también de dónde sale el resto de nuestro dinero, incluida la comisión que nos pagan
            algunos proveedores. Preferimos contarlo a que lo descubras tú.
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
        <SectionHeading
          eyebrow="Sin sorpresas"
          title="De dónde sale exactamente nuestro dinero"
          description="Son tres cosas y no hay una cuarta. Ninguna te encarece el viaje."
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-3">
          {[
            {
              title: 'La tarifa de gestión',
              body: `Lo que ves arriba: ${eur(pricing.escapada.feePerPerson)} o ${eur(pricing.granViaje.feePerPerson)} por persona, en una línea aparte del presupuesto. Es nuestro ingreso principal.`,
            },
            {
              title: 'La comisión del proveedor',
              body: `Algunos hoteles, seguros y empresas de actividades nos pagan hasta un ${pricing.supplierCommissionMax} % por traerles la reserva. Sale de su bolsillo, no del tuyo: pagas exactamente el mismo precio que pagarías reservando directamente.`,
            },
            {
              title: 'El reparto del ahorro',
              body: `Si después de reservar el precio baja y rehacemos la reserva, el ${Math.round(pricing.savingShare.client * 100)} % de lo que se ahorra es para ti y el ${Math.round(pricing.savingShare.agency * 100)} % para nosotros. Si no baja, no cobramos nada por vigilarlo.`,
            },
          ].map((item) => (
            <div key={item.title} className="rounded-card border border-ink-100 bg-sand-50 p-6">
              <h3 className="text-lg leading-snug">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-4xl rounded-card border-2 border-ink-900 bg-ink-900 p-6 text-center text-white">
          <p className="font-display text-xl font-semibold">
            Nuestra recomendación nunca depende de la comisión
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-ink-300">
            En el presupuesto marcamos qué reservas nos pagan comisión y cuáles no. Si la opción que no nos paga
            nada es la mejor para ti, es la que te vamos a recomendar. Como la tarifa es fija, no ganamos más por
            venderte un viaje más caro.
          </p>
        </div>
      </Section>

      <Section tone="sand">
        <SectionHeading
          eyebrow="Extra opcional"
          title={`¿Tienes prisa? ${eur(pricing.priority.fee)}`}
          description={`Presupuesto en ${pricing.priority.hours} horas en lugar de ${site.contact.responseTimeHours}, y hasta ${pricing.priority.revisions} rondas de cambios en vez de una. Se paga al pedirlo y se descuenta de la tarifa si acabas reservando.`}
        />
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-ink-500">
          Solo tiene sentido si sales en menos de dos semanas o estás persiguiendo una tarifa que se va a agotar.
          En cualquier otro caso, el presupuesto normal te llega igual de bien y no cuesta nada.
        </p>
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
