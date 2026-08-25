import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card, Section, SectionHeading } from '@/components/ui/Card';
import { differentiators, tricks } from '@/content/differentiators';
import { faqs } from '@/content/faq';
import { testimonials } from '@/content/testimonials';
import { destinations } from '@/lib/catalog';
import { pricing, site } from '@/config/site';
import { eur } from '@/lib/utils';

/* ------------------------------------------------------------------ */

const pains = [
  {
    emoji: '😵‍💫',
    title: '«Miro un vuelo y me sale por un ojo de la cara»',
    body: 'Normalmente no es que la ruta sea cara: es la fecha exacta, el aeropuerto o el día de la semana. Cambiando una sola de esas variables el precio suele caer de golpe.',
  },
  {
    emoji: '🧨',
    title: '«En la agencia de siempre me clavan la comisión»',
    body: 'Y no la ves, porque va dentro del precio del paquete. Al no poder separarla, tampoco puedes juzgar si el viaje está bien de precio o no.',
  },
  {
    emoji: '🕳️',
    title: '«Paso horas buscando y acabo peor que al empezar»',
    body: 'Veinte pestañas abiertas, precios que cambian, y al final reservas por agotamiento. Buscar bien es un oficio, y lleva tiempo que casi nadie tiene.',
  },
];

export function Problem() {
  return (
    <Section tone="white">
      <SectionHeading
        eyebrow="A quién ayudamos"
        title="Si te ha pasado alguna de estas tres cosas, este es tu sitio"
        description="No hacemos viajes de lujo ni catálogos de folleto. Hacemos que pagues por tu viaje lo que de verdad cuesta."
      />
      <div data-reveal-stagger className="mt-12 grid gap-6 md:grid-cols-3">
        {pains.map((pain) => (
          <Card key={pain.title} className="border-ink-100">
            <span aria-hidden className="text-3xl">
              {pain.emoji}
            </span>
            <h3 className="mt-4 text-lg leading-snug">{pain.title}</h3>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-600">{pain.body}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */

const steps = [
  {
    n: '01',
    title: 'Nos cuentas tu viaje',
    body: 'Un formulario de 3 minutos. Si sabes el destino, perfecto. Si solo tienes una idea o te da igual mientras sea barato, también.',
    detail: 'Fechas exactas o flexibles · escalas sí o no · tipo de hotel · presupuesto máximo',
  },
  {
    n: '02',
    title: 'Buscamos de verdad',
    body: 'Cruzamos aeropuertos, calendario completo, compañías, combinaciones de billetes y hoteles en varios canales. Con equipaje y traslados incluidos en la cuenta.',
    detail: 'Entre 1 y 3 horas de trabajo por presupuesto',
  },
  {
    n: '03',
    title: 'Te enviamos tres opciones',
    body: 'La más barata, la equilibrada y la cómoda. Con desglose línea por línea, lo que ganas y lo que pierdes en cada una, y nuestra recomendación.',
    detail: 'Presupuesto gratis · sin compromiso · válido varios días',
  },
  {
    n: '04',
    title: 'Reservamos y te acompañamos',
    body: 'Si te encaja, lo reservamos todo y te mandamos los localizadores a tu nombre. Seguimos vigilando el precio y estamos en tu WhatsApp durante el viaje.',
    detail: 'Radar de precios · soporte durante el viaje',
  },
];

export function HowItWorks() {
  return (
    <Section id="como-funciona" tone="sand">
      <SectionHeading
        eyebrow="Cómo funciona"
        title="Cuatro pasos, y solo uno lo haces tú"
        description="El trabajo pesado es el nuestro: comparar hasta que el precio no baja más."
      />
      <ol data-reveal-stagger className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <li key={step.n} className="relative rounded-card border border-ink-100 bg-white p-6 shadow-soft">
            <span className="font-display text-4xl font-semibold text-brand-200">{step.n}</span>
            <h3 className="mt-3 text-lg">{step.title}</h3>
            <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-600">{step.body}</p>
            <p className="mt-4 border-t border-dashed border-ink-200 pt-3 text-xs leading-relaxed text-ink-400">
              {step.detail}
            </p>
          </li>
        ))}
      </ol>
      <div className="mt-10 text-center">
        <ButtonLink href="/presupuesto" size="lg">
          Empezar por el paso 1
        </ButtonLink>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */

export function WhyCheaper() {
  return (
    <Section tone="night">
      <SectionHeading
        invert
        eyebrow="Sin secretos"
        title="Por qué te sale más barato con nosotros"
        description="Estos son los ocho métodos que aplicamos en cada búsqueda. Los publicamos enteros: si quieres hacerlo tú, tienes aquí el manual."
      />
      <div data-reveal-stagger className="mt-12 grid gap-4 md:grid-cols-2">
        {tricks.map((trick) => (
          <article
            key={trick.id}
            className="rounded-card border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.07]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg text-white">{trick.title}</h3>
              <span className="rounded-pill bg-coral-500/15 px-2.5 py-1 text-xs font-semibold text-coral-400">
                {trick.saving}
              </span>
            </div>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-300">{trick.short}</p>
          </article>
        ))}
      </div>
      <div className="mt-10 text-center">
        <ButtonLink href="/trucos" variant="ghost" size="lg" className="border border-white/15 text-white hover:bg-white/10">
          Leer los trucos al detalle
        </ButtonLink>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */

export function Differentiators() {
  return (
    <Section tone="white">
      <SectionHeading
        eyebrow="Qué nos diferencia"
        title="Ocho cosas que no vas a encontrar en otra agencia"
        description="Cada una responde a algo que nos han contado clientes hartos del sector."
      />
      <div data-reveal-stagger className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {differentiators.map((item) => (
          <article key={item.id} className="flex flex-col rounded-card border border-ink-100 bg-sand-50 p-6">
            <span aria-hidden className="text-3xl">
              {item.emoji}
            </span>
            <h3 className="mt-4 text-base leading-snug">{item.title}</h3>
            <p className="mt-2.5 flex-1 text-sm leading-relaxed text-ink-600">{item.description}</p>
            <p className="mt-4 border-t border-ink-200 pt-3 text-xs leading-relaxed text-ink-400">
              <span className="font-semibold text-ink-500">Lo habitual:</span> {item.versus}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */

const comparisonRows: { feature: string; alone: string; ota: string; agency: string; us: string }[] = [
  {
    feature: 'Tiempo que le dedicas tú',
    alone: '4-8 horas',
    ota: '1-2 horas',
    agency: '1 visita + esperas',
    us: '3 minutos',
  },
  {
    feature: 'Compara aeropuertos alternativos',
    alone: 'Si sabes hacerlo',
    ota: 'Parcialmente',
    agency: 'Casi nunca',
    us: 'Siempre, con el coste de llegar incluido',
  },
  {
    feature: 'Precio final con equipaje y traslados',
    alone: 'Lo calculas tú',
    ota: 'Aparece al final',
    agency: 'A veces',
    us: 'Desglosado desde el principio',
  },
  {
    feature: 'Sabes cuánto se lleva la agencia',
    alone: '—',
    ota: 'No',
    agency: 'No',
    us: 'Sí, línea aparte',
  },
  {
    feature: 'Opciones alternativas para comparar',
    alone: 'Las que abras',
    ota: 'Cientos sin filtrar',
    agency: 'Una',
    us: 'Tres, elegidas y explicadas',
  },
  {
    feature: 'Vigilan el precio después de reservar',
    alone: 'No',
    ota: 'No',
    agency: 'No',
    us: 'Sí, y te devolvemos la diferencia',
  },
  {
    feature: 'Alguien te contesta durante el viaje',
    alone: 'Nadie',
    ota: 'Chatbot',
    agency: 'En horario de oficina',
    us: 'WhatsApp con una persona',
  },
];

export function Comparison() {
  const headers = ['', 'Buscando tú', 'Portal online', 'Agencia de barrio', site.name];
  return (
    <Section tone="sand">
      <SectionHeading
        eyebrow="Comparativa"
        title="Lo mismo, pero sin las partes malas"
        description="Comparado con las tres formas habituales de organizar un viaje."
      />
      <div data-reveal className="mt-12 overflow-x-auto rounded-card border border-ink-100 bg-white shadow-soft">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <caption className="sr-only">
            Comparación entre buscar por tu cuenta, un portal online, una agencia tradicional y {site.name}
          </caption>
          <thead>
            <tr className="border-b border-ink-100">
              {headers.map((header, index) => (
                <th
                  key={header || 'feature'}
                  scope="col"
                  className={
                    index === headers.length - 1
                      ? 'bg-brand-50 px-5 py-4 font-display text-base font-semibold text-brand-900'
                      : 'px-5 py-4 font-semibold text-ink-500'
                  }
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr key={row.feature} className="border-b border-ink-100 last:border-0">
                <th scope="row" className="px-5 py-4 font-semibold text-ink-800">
                  {row.feature}
                </th>
                <td className="px-5 py-4 text-ink-500">{row.alone}</td>
                <td className="px-5 py-4 text-ink-500">{row.ota}</td>
                <td className="px-5 py-4 text-ink-500">{row.agency}</td>
                <td className="bg-brand-50/60 px-5 py-4 font-medium text-brand-900">{row.us}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */

export function PricingTeaser() {
  return (
    <Section tone="white" id="precios">
      <SectionHeading
        eyebrow="Precio transparente"
        title="Una tarifa fija, en una línea aparte"
        description="No va escondida dentro del precio del viaje. La ves, la comparas y decides. Y si no te ahorramos dinero, no la pagas."
      />
      <div data-reveal-stagger className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        {[pricing.escapada, pricing.granViaje].map((tier, index) => (
          <Card key={tier.id} className={index === 1 ? 'border-brand-200 bg-brand-50/50' : ''}>
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-xl">{tier.label}</h3>
              <Badge tone={index === 1 ? 'brand' : 'neutral'}>
                {index === 0 ? 'Europa · hasta 6 noches' : 'Larga distancia o +6 noches'}
              </Badge>
            </div>
            <p className="mt-5 font-display text-4xl font-semibold text-ink-900">
              {eur(tier.feePerPerson)}
              <span className="ml-1 font-sans text-base font-normal text-ink-500">/ persona</span>
            </p>
            <p className="mt-1.5 text-sm text-ink-500">
              Mínimo {eur(tier.minPerBooking)} por reserva · menores de {pricing.childAgeLimit} años, mitad de tarifa
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-ink-600">
              {[
                'Presupuesto con tres opciones comparadas',
                'Búsqueda de vuelos, hotel, traslados y actividades',
                'Gestión completa de las reservas',
                'Radar de precios y soporte durante el viaje',
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span aria-hidden className="mt-0.5 text-brand-600">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div data-reveal className="mx-auto mt-8 max-w-4xl rounded-card border-2 border-dashed border-brand-300 bg-brand-50/60 p-6 text-center">
        <p className="font-display text-xl font-semibold text-brand-900">{pricing.guarantee}</p>
        <p className="mt-2 text-sm text-ink-600">
          Bebés en brazos, gratis · grupos de {pricing.grupoMinSize} o más,{' '}
          {Math.round(pricing.grupoDiscount * 100)} % de descuento · máximo {eur(pricing.feeCap)} por reserva.
        </p>
        <p className="mx-auto mt-4 max-w-2xl border-t border-brand-200 pt-4 text-sm leading-relaxed text-ink-600">
          Una pareja a Roma paga {eur(58)}. Una familia de cuatro, {eur(87)}. Si te ahorramos {eur(200)}, la cuenta
          sale sola; si no, no cobramos.
        </p>
        <ButtonLink href="/precios" variant="outline" size="sm" className="mt-5">
          Ver el detalle de precios
        </ButtonLink>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */

export function Testimonials() {
  return (
    <Section tone="sand">
      <SectionHeading
        eyebrow="Opiniones"
        title="Lo que dice la gente que ya ha viajado con nosotros"
      />
      <div data-reveal-stagger className="mt-12 grid gap-6 md:grid-cols-3">
        {testimonials.map((testimonial, index) => (
          <figure key={index} className="flex flex-col rounded-card border border-ink-100 bg-white p-6 shadow-soft">
            <blockquote className="flex-1 text-[0.98rem] leading-relaxed text-ink-700">
              “{testimonial.quote}”
            </blockquote>
            {testimonial.saving ? (
              <p className="mt-4">
                <Badge tone="coral">{testimonial.saving}</Badge>
              </p>
            ) : null}
            <figcaption className="mt-4 border-t border-ink-100 pt-4 text-sm">
              <span className="font-semibold text-ink-900">{testimonial.name}</span>
              <span className="block text-ink-500">
                {testimonial.detail} · {testimonial.trip}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */

const featuredSlugs = ['lisboa', 'marrakech', 'roma', 'islandia', 'tailandia', 'mexico-riviera'];

export function DestinationIdeas() {
  const featured = featuredSlugs
    .map((slug) => destinations.find((d) => d.slug === slug))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  return (
    <Section tone="white">
      <SectionHeading
        eyebrow="Ideas"
        title="¿No sabes a dónde ir?"
        description="Estas son medianas orientativas de vuelo ida y vuelta desde España en temporada media. El precio real depende de tus fechas: eso es justo lo que calculamos para ti."
      />
      <ul data-reveal-stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((destination) => (
          <li key={destination.slug}>
            <Link
              href={`/presupuesto?destino=${encodeURIComponent(destination.name)}`}
              className="group flex h-full flex-col rounded-card border border-ink-100 bg-sand-50 p-6 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg">{destination.name}</h3>
                  <p className="text-sm text-ink-500">{destination.country}</p>
                </div>
                <span className="rounded-xl bg-white px-3 py-2 text-right shadow-soft">
                  <span className="block text-[0.62rem] font-bold uppercase tracking-wide text-ink-400">
                    Vuelo desde
                  </span>
                  <span className="block font-display text-lg font-semibold leading-none text-brand-800">
                    {eur(destination.flightBase)}
                  </span>
                </span>
              </div>
              <p className="mt-4 flex-1 text-sm text-ink-600">
                Hotel 3★ desde {eur(destination.hotelNight)} la noche · temporada baja en{' '}
                {destination.lowMonths
                  .slice(0, 3)
                  .map((m) => new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2025, m - 1, 1)))
                  .join(', ')}
                .
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-transform group-hover:translate-x-0.5">
                Pedir presupuesto
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ------------------------------------------------------------------ */

export function Faq({ limit }: { limit?: number }) {
  const items = limit ? faqs.slice(0, limit) : faqs;
  return (
    <Section tone="sand" id="faq">
      <SectionHeading eyebrow="Dudas" title="Preguntas frecuentes" />
      <div data-reveal className="mx-auto mt-12 max-w-3xl divide-y divide-ink-100 overflow-hidden rounded-card border border-ink-100 bg-white">
        {items.map((item) => (
          <details key={item.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold text-ink-900 transition-colors hover:bg-ink-50">
              {item.question}
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-full border border-ink-200 text-ink-500 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="px-6 pb-6 text-[0.95rem] leading-relaxed text-ink-600">{item.answer}</p>
          </details>
        ))}
      </div>
      {limit ? (
        <p className="mt-8 text-center">
          <Link href="/faq" className="font-semibold text-brand-800 underline underline-offset-4">
            Ver todas las preguntas
          </Link>
        </p>
      ) : null}
    </Section>
  );
}

/* ------------------------------------------------------------------ */

export function FinalCta() {
  return (
    <Section tone="night">
      <div data-reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl text-white md:text-4xl">
          Cuéntanos tu viaje y deja que hagamos números
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-ink-300">
          Tres minutos de formulario. Presupuesto gratis en {site.contact.responseTimeHours} h. Si no te ahorramos
          dinero, no nos pagas nada.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/presupuesto" size="lg" variant="coral">
            Pedir presupuesto gratis
          </ButtonLink>
          <ButtonLink
            href={`https://wa.me/${site.contact.whatsapp}`}
            size="lg"
            variant="ghost"
            className="border border-white/15 text-white hover:bg-white/10"
          >
            Escribirnos por WhatsApp
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
