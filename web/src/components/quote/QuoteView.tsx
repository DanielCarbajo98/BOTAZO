import { Badge } from '@/components/ui/Badge';
import { optionAngles, optionSaving, optionTotal, parseFlight, parseLines, parseStay, urlHost } from '@/lib/quote';
import { isAdvisor, modeCopy } from '@/config/mode';
import { trackedHref } from '@/lib/links';
import type { QuoteOptionRow, QuoteRow } from '@/lib/repository';
import { eur, formatDate } from '@/lib/utils';

export function QuoteView({
  quote,
  options,
  travelers,
  unlocked,
  requestId,
}: {
  quote: QuoteRow;
  options: QuoteOptionRow[];
  travelers: number;
  /** Si es false, las opciones llegan ya censuradas desde el servidor. */
  unlocked: boolean;
  requestId: string;
}) {
  return (
    <section aria-labelledby="presupuesto-titulo">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Tu presupuesto</p>
          <h2 id="presupuesto-titulo" className="mt-1.5 text-2xl md:text-3xl">
            {quote.title}
          </h2>
        </div>
        {quote.valid_until ? (
          <Badge tone="amber">Válido hasta el {formatDate(quote.valid_until)}</Badge>
        ) : null}
      </div>

      <p className="mt-4 max-w-3xl leading-relaxed text-ink-600">{modeCopy.quote.intro}</p>

      {quote.message ? (
        <div className="mt-6 rounded-card border border-ink-100 bg-white p-6">
          <p className="whitespace-pre-line text-[0.98rem] leading-relaxed text-ink-700">{quote.message}</p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            travelers={travelers}
            unlocked={unlocked}
            requestId={requestId}
            quoteId={quote.id}
          />
        ))}
      </div>

      <div className="mt-6 space-y-3 text-sm leading-relaxed text-ink-500">
        <p>
          Los precios incluyen tasas, el equipaje que nos pediste y nuestros {modeCopy.feeLabel}, que ves
          desglosados en cada opción. Las tarifas de vuelo y hotel las fijan las compañías:{' '}
          {isAdvisor
            ? 'pueden cambiar hasta que reserves, por eso conviene no dejarlo para dentro de una semana.'
            : 'pueden cambiar hasta que confirmemos la reserva, por eso este documento tiene fecha de validez.'}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <CommissionTag />
          <span>
            marca las reservas por las que el proveedor nos paga una comisión.{' '}
            <strong className="font-semibold text-ink-700">A ti no te cuesta nada más</strong>: pagas el mismo precio
            que si entraras por tu cuenta, y puedes comprobarlo.
          </span>
        </p>
      </div>
    </section>
  );
}

function OptionCard({
  option,
  travelers,
  unlocked,
  requestId,
  quoteId,
}: {
  option: QuoteOptionRow;
  travelers: number;
  unlocked: boolean;
  requestId: string;
  quoteId: string;
}) {
  const link = (url: string | undefined, label: string) =>
    unlocked && url ? trackedHref({ u: url, r: requestId, q: quoteId, o: option.id, l: label }) : null;
  const total = optionTotal(option);
  const saving = optionSaving(option);
  const perPerson = travelers > 0 ? total / travelers : total;
  const flight = parseFlight(option.flight_json);
  const stay = parseStay(option.stay_json);
  const transfers = parseLines(option.transfers_json);
  const activities = parseLines(option.activities_json);
  const angle = optionAngles.find((item) => item.id === option.angle);
  const recommended = option.recommended === 1;

  const lines: [string, number][] = [
    ['Vuelos', option.price_flights],
    ['Alojamiento', option.price_stay],
    ['Traslados', option.price_transfers],
    ['Actividades', option.price_activities],
    ['Otros', option.price_other],
  ];

  return (
    <article
      className={
        recommended
          ? 'relative flex flex-col rounded-card border-2 border-brand-600 bg-white p-6 shadow-lift'
          : 'relative flex flex-col rounded-card border border-ink-100 bg-white p-6 shadow-soft'
      }
    >
      {recommended ? (
        <span className="absolute -top-3 left-6 rounded-pill bg-brand-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          Nuestra recomendación
        </span>
      ) : null}

      <header>
        {/* El rótulo del tipo sobra si el agente ya lo ha usado como nombre. */}
        {angle && angle.label.toLowerCase() !== option.name.trim().toLowerCase() ? (
          <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{angle.label}</p>
        ) : null}
        <h3 className="text-xl">{option.name}</h3>
        {option.summary ? <p className="mt-2 text-sm leading-relaxed text-ink-600">{option.summary}</p> : null}
      </header>

      <div className="mt-5 rounded-2xl bg-sand-100 p-4">
        <p className="font-display text-3xl font-semibold leading-none text-ink-900">{eur(total)}</p>
        <p className="mt-1.5 text-sm text-ink-500">
          Total para {travelers} {travelers === 1 ? 'persona' : 'personas'} · {eur(perPerson)} por persona
        </p>
        {saving > 0 ? (
          <p className="mt-2.5 inline-flex flex-col gap-0.5 rounded-xl bg-coral-100 px-2.5 py-1.5 text-coral-700">
            <span className="text-xs font-bold">
              Ahorras {eur(saving)} sobre {eur(option.market_reference ?? 0)}
            </span>
            <span className="text-[0.68rem] font-medium opacity-80">
              con nuestros honorarios ya descontados
            </span>
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex-1 space-y-5 text-sm">
        {flight && flight.legs.length > 0 ? (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">Vuelos</h4>
            <ul className="mt-2 space-y-2.5">
              {flight.legs.map((leg, index) => (
                <li key={index} className="rounded-xl border border-ink-100 p-3">
                  <p className="flex items-center justify-between gap-2 font-semibold text-ink-900">
                    <span>
                      {leg.from} → {leg.to}
                    </span>
                    <span className="text-xs font-normal uppercase text-ink-400">{leg.direction}</span>
                  </p>
                  <p className="mt-1 text-ink-600">
                    {[leg.date, leg.depart && leg.arrive ? `${leg.depart}–${leg.arrive}` : '', leg.duration]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="text-ink-500">
                    {leg.airline}
                    {leg.stops > 0 ? ` · ${leg.stops} escala${leg.stops > 1 ? 's' : ''}` : ' · directo'}
                  </p>
                  {leg.note ? <p className="mt-1 text-xs text-ink-400">{leg.note}</p> : null}
                </li>
              ))}
            </ul>
            {flight.baggage ? <p className="mt-2 text-ink-600">🧳 {flight.baggage}</p> : null}
            {flight.bookingNote ? (
              <p className="mt-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{flight.bookingNote}</p>
            ) : null}
            <BookingLink
              href={link(flight.bookingUrl, 'Vuelo')}
              where={flight.bookingWhere || urlHost(flight.bookingUrl ?? '')}
              commission={flight.commission}
            />
            <LockedHint show={!unlocked} what="la compañía, los horarios y dónde reservarlo" />
          </div>
        ) : null}

        {stay && (stay.name || stay.category || stay.area) ? (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">Alojamiento</h4>
            <div className="mt-2 rounded-xl border border-ink-100 p-3">
              {/* Con el plan bloqueado no hay nombre, pero sí todo lo demás:
                  el cliente tiene que poder juzgar lo que está comprando. */}
              <p className="font-semibold text-ink-900">
                {stay.name || <span className="text-ink-400">Alojamiento seleccionado 🔒</span>}
              </p>
              <p className="mt-0.5 text-ink-600">
                {[stay.category, stay.area].filter(Boolean).join(' · ')}
              </p>
              <p className="text-ink-500">
                {[stay.nights ? `${stay.nights} noches` : '', stay.board, stay.rating].filter(Boolean).join(' · ')}
              </p>
              {stay.cancellation ? <p className="mt-1 text-xs text-brand-700">✓ {stay.cancellation}</p> : null}
              {stay.note ? <p className="mt-1 text-xs text-ink-400">{stay.note}</p> : null}
            </div>
            <BookingLink
              href={link(stay.bookingUrl, 'Alojamiento')}
              where={stay.bookingWhere || urlHost(stay.bookingUrl ?? '')}
              commission={stay.commission}
            />
            <LockedHint show={!unlocked} what="el nombre del alojamiento y dónde reservarlo" />
          </div>
        ) : null}

        {transfers.length > 0 ? (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">Traslados</h4>
            <ul className="mt-2 space-y-1 text-ink-600">
              {transfers.map((line, index) => (
                <li key={index}>
                  🚐 {line.name}
                  {line.detail ? <span className="text-ink-400"> · {line.detail}</span> : null}
                  <LineLink href={link(line.bookingUrl, line.name)} commission={line.commission} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {activities.length > 0 ? (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">Actividades</h4>
            <ul className="mt-2 space-y-1 text-ink-600">
              {activities.map((line, index) => (
                <li key={index}>
                  🎟️ {line.name}
                  {line.detail ? <span className="text-ink-400"> · {line.detail}</span> : null}
                  <LineLink href={link(line.bookingUrl, line.name)} commission={line.commission} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <details className="mt-5 border-t border-dashed border-ink-200 pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink-700">Ver desglose del precio</summary>
        <dl className="mt-3 space-y-1.5 text-sm">
          {lines
            .filter(([, value]) => value > 0)
            .map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 text-ink-600">
                <dt>{label}</dt>
                <dd className="tabular-nums">{eur(value, true)}</dd>
              </div>
            ))}
          <div className="flex justify-between gap-4 font-semibold text-brand-800">
            <dt>Nuestros {modeCopy.feeLabel}</dt>
            <dd className="tabular-nums">{eur(option.price_fee, true)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-ink-200 pt-2 text-base font-bold text-ink-900">
            <dt>Total</dt>
            <dd className="tabular-nums">{eur(total, true)}</dd>
          </div>
        </dl>
        {option.notes ? <p className="mt-3 text-xs leading-relaxed text-ink-500">{option.notes}</p> : null}
      </details>
    </article>
  );
}


/** Sello que avisa de que esa reserva nos genera comisión. */
function CommissionTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-brand-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-brand-900">
      ◆ comisión
    </span>
  );
}

/**
 * Botón de reserva.
 *
 * `rel="sponsored"` es lo que Google pide para los enlaces de afiliación, y
 * `noopener noreferrer` evita que la pestaña de destino pueda tocar la nuestra.
 */
function BookingLink({
  href,
  where,
  commission,
}: {
  href: string | null;
  where?: string;
  commission?: boolean;
}) {
  if (!href) return null;
  return (
    <p className="mt-3 flex flex-wrap items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-xl bg-ink-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
      >
        Reservar en {where || 'el proveedor'}
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      </a>
      {commission ? <CommissionTag /> : null}
    </p>
  );
}

function LineLink({ href, commission }: { href: string | null; commission?: boolean }) {
  if (!href) return null;
  return (
    <>
      {' '}
      <a
        href={href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="font-semibold text-brand-800 underline underline-offset-2"
      >
        reservar ↗
      </a>
      {commission ? <> <CommissionTag /></> : null}
    </>
  );
}


/** Aviso de lo que falta por ver mientras el plan está bloqueado. */
function LockedHint({ show, what }: { show: boolean; what: string }) {
  if (!show) return null;
  return (
    <p className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-ink-300 bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-500">
      <span aria-hidden>🔒</span>
      <span>Al desbloquear verás {what}.</span>
    </p>
  );
}
