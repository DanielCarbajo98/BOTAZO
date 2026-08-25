import { ButtonLink } from '@/components/ui/Button';
import { feeTiers } from '@/config/fees';
import { modeCopy, quoteNounCapitalized } from '@/config/mode';
import { eur } from '@/lib/utils';

const trustPoints = [
  { icon: '💸', label: `${quoteNounCapitalized} gratis` },
  { icon: '⏱️', label: 'Respuesta en 24 h' },
  { icon: '🔒', label: 'Sin compromiso' },
  { icon: '🧾', label: 'Tarifa fija y visible' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-night pt-14 pb-20 text-white md:pt-20 md:pb-28">
      <div aria-hidden className="hero-aurora" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent 75%)',
        }}
      />

      <div className="container-page relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-pill border border-brand-400/30 bg-brand-500/10 px-3.5 py-1.5 text-xs font-semibold text-brand-200">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-brand-400" />
            </span>
            {quoteNounCapitalized} gratis y sin compromiso en 24 h
          </span>

          <h1 className="mt-6 text-4xl leading-[1.08] text-white sm:text-5xl lg:text-[3.4rem]">
            Los vuelos no están caros.
            <span className="block text-brand-300">Es que los buscas como todo el mundo.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-300">{modeCopy.heroLead}</p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/presupuesto" size="lg" variant="coral" className="sm:min-w-64">
              {modeCopy.cta}
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </ButtonLink>
            <ButtonLink
              href="/como-funciona"
              size="lg"
              variant="ghost"
              className="border border-white/15 text-white hover:bg-white/10"
            >
              Ver cómo trabajamos
            </ButtonLink>
          </div>

          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
            {trustPoints.map((point) => (
              <li key={point.label} className="flex items-center gap-2 text-sm text-ink-300">
                <span aria-hidden className="text-base">
                  {point.icon}
                </span>
                {point.label}
              </li>
            ))}
          </ul>
        </div>

        <QuoteMock />
      </div>
    </section>
  );
}

/** Maqueta del presupuesto que recibe el cliente: enseña el producto sin explicarlo. */
function QuoteMock() {
  const options = [
    { name: 'Mínima', price: 278, note: '1 escala · hostel céntrico', tone: 'text-ink-500' },
    { name: 'Equilibrada', price: 351, note: 'Directo · hotel 3★ centro', tone: 'text-ink-500', recommended: true },
    { name: 'Cómoda', price: 499, note: 'Directo · hotel 4★ + traslados', tone: 'text-ink-500' },
  ];

  return (
    <div className="relative animate-fade-up lg:justify-self-end">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[2.5rem] bg-brand-500/10 blur-2xl"
      />
      <figure className="hero-float relative w-full max-w-md rounded-[1.75rem] border border-white/10 bg-white p-6 text-ink-900 shadow-lift">
        <figcaption className="sr-only">
          Ejemplo del presupuesto que enviamos: tres opciones comparadas con su desglose.
        </figcaption>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{quoteNounCapitalized} ZP-7K3QP9</p>
            <p className="mt-1 font-display text-xl font-semibold">Roma · 4 noches · 2 personas</p>
          </div>
          <span className="rounded-xl bg-coral-50 px-2.5 py-1.5 text-center">
            <span className="block text-[0.6rem] font-bold uppercase tracking-wider text-coral-600">Ahorras</span>
            <span className="block text-lg font-bold leading-none text-coral-600">{eur(212)}</span>
          </span>
        </div>

        <ul className="mt-5 space-y-2.5">
          {options.map((option) => (
            <li
              key={option.name}
              className={
                option.recommended
                  ? 'flex items-center justify-between gap-3 rounded-2xl border-2 border-brand-600 bg-brand-50 px-4 py-3'
                  : 'flex items-center justify-between gap-3 rounded-2xl border border-ink-100 px-4 py-3'
              }
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold">
                  {option.name}
                  {option.recommended ? (
                    <span className="rounded-pill bg-brand-600 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">
                      Recomendada
                    </span>
                  ) : null}
                </span>
                <span className={`block truncate text-sm ${option.tone}`}>{option.note}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-lg font-bold tabular-nums">{eur(option.price)}</span>
                <span className="block text-[0.7rem] text-ink-400">por persona</span>
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-1.5 border-t border-dashed border-ink-200 pt-4 text-sm">
          {[
            ['Vuelos (2 pax, ida y vuelta)', 318],
            ['Hotel 3★ centro, 4 noches', 344],
            ['Traslados aeropuerto', 44],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between gap-4 text-ink-600">
              <dt>{label}</dt>
              <dd className="tabular-nums">{eur(value as number)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 font-semibold text-brand-800">
            <dt>Nuestra tarifa (2 × {eur(feeTiers.escapada.feePerPerson)})</dt>
            <dd className="tabular-nums">{eur(feeTiers.escapada.feePerPerson * 2)}</dd>
          </div>
        </dl>

        <p className="mt-4 rounded-xl bg-ink-50 p-3 text-xs leading-relaxed text-ink-500">
          Ejemplo ilustrativo del formato. Los precios reales dependen de cada búsqueda.
        </p>
      </figure>
    </div>
  );
}
