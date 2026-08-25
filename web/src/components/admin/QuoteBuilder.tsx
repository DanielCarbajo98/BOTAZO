'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveQuoteAction } from '@/app/admin/actions';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Field';
import { optionAngles, type OptionAngle } from '@/lib/quote';
import type { QuoteOptionRow, QuoteRow } from '@/lib/repository';
import type { Estimate } from '@/lib/estimator';
import { eur } from '@/lib/utils';

type LegDraft = {
  direction: 'ida' | 'vuelta';
  from: string;
  to: string;
  date: string;
  depart: string;
  arrive: string;
  airline: string;
  stops: number;
  duration: string;
  note: string;
};

type LineDraft = { name: string; detail: string; bookingUrl: string; commission: boolean };

type OptionDraft = {
  key: string;
  name: string;
  angle: OptionAngle;
  summary: string;
  recommended: boolean;
  legs: LegDraft[];
  baggage: string;
  bookingNote: string;
  flightUrl: string;
  flightWhere: string;
  flightCommission: boolean;
  stayName: string;
  stayCategory: string;
  stayArea: string;
  stayBoard: string;
  stayNights: number;
  stayRating: string;
  stayCancellation: string;
  stayNote: string;
  stayUrl: string;
  stayWhere: string;
  stayCommission: boolean;
  transfers: LineDraft[];
  activities: LineDraft[];
  priceFlights: number;
  priceStay: number;
  priceTransfers: number;
  priceActivities: number;
  priceOther: number;
  priceFee: number;
  marketReference: number | null;
  notes: string;
};

let keyCounter = 0;
const nextKey = () => {
  keyCounter += 1;
  return `opt-${keyCounter}`;
};

function emptyLeg(direction: 'ida' | 'vuelta'): LegDraft {
  return { direction, from: '', to: '', date: '', depart: '', arrive: '', airline: '', stops: 0, duration: '', note: '' };
}

function emptyOption(angle: OptionAngle, nights: number, fee: number): OptionDraft {
  const preset = optionAngles.find((item) => item.id === angle)!;
  return {
    key: nextKey(),
    name: preset.label,
    angle,
    summary: preset.description,
    recommended: angle === 'balanced',
    legs: [emptyLeg('ida'), emptyLeg('vuelta')],
    baggage: '',
    bookingNote: '',
    flightUrl: '',
    flightWhere: '',
    flightCommission: false,
    stayName: '',
    stayCategory: '',
    stayArea: '',
    stayBoard: '',
    stayNights: nights,
    stayRating: '',
    stayCancellation: '',
    stayNote: '',
    stayUrl: '',
    stayWhere: '',
    stayCommission: false,
    transfers: [],
    activities: [],
    priceFlights: 0,
    priceStay: 0,
    priceTransfers: 0,
    priceActivities: 0,
    priceOther: 0,
    priceFee: fee,
    marketReference: null,
    notes: '',
  };
}

function fromRow(row: QuoteOptionRow): OptionDraft {
  const flight = row.flight_json
    ? (JSON.parse(row.flight_json) as {
        legs?: LegDraft[];
        baggage?: string;
        bookingNote?: string;
        bookingUrl?: string;
        bookingWhere?: string;
        commission?: boolean;
      })
    : null;
  const stay = row.stay_json ? (JSON.parse(row.stay_json) as Record<string, unknown>) : null;
  const parseLines = (json: string | null): LineDraft[] =>
    json
      ? (JSON.parse(json) as { name?: string; detail?: string; bookingUrl?: string; commission?: boolean }[]).map(
          (item) => ({
            name: item.name ?? '',
            detail: item.detail ?? '',
            bookingUrl: item.bookingUrl ?? '',
            commission: item.commission ?? false,
          }),
        )
      : [];

  return {
    key: nextKey(),
    name: row.name,
    angle: row.angle,
    summary: row.summary ?? '',
    recommended: row.recommended === 1,
    legs:
      flight?.legs && flight.legs.length > 0
        ? flight.legs.map((leg) => ({ ...emptyLeg(leg.direction ?? 'ida'), ...leg, note: leg.note ?? '' }))
        : [emptyLeg('ida'), emptyLeg('vuelta')],
    baggage: flight?.baggage ?? '',
    bookingNote: flight?.bookingNote ?? '',
    flightUrl: flight?.bookingUrl ?? '',
    flightWhere: flight?.bookingWhere ?? '',
    flightCommission: flight?.commission ?? false,
    stayName: String(stay?.name ?? ''),
    stayCategory: String(stay?.category ?? ''),
    stayArea: String(stay?.area ?? ''),
    stayBoard: String(stay?.board ?? ''),
    stayNights: Number(stay?.nights ?? 0),
    stayRating: String(stay?.rating ?? ''),
    stayCancellation: String(stay?.cancellation ?? ''),
    stayNote: String(stay?.note ?? ''),
    stayUrl: String(stay?.bookingUrl ?? ''),
    stayWhere: String(stay?.bookingWhere ?? ''),
    stayCommission: Boolean(stay?.commission ?? false),
    transfers: parseLines(row.transfers_json),
    activities: parseLines(row.activities_json),
    priceFlights: row.price_flights,
    priceStay: row.price_stay,
    priceTransfers: row.price_transfers,
    priceActivities: row.price_activities,
    priceOther: row.price_other,
    priceFee: row.price_fee,
    marketReference: row.market_reference,
    notes: row.notes ?? '',
  };
}

/** Los campos vacíos no viajan al servidor: el esquema los quiere ausentes, no en blanco. */
const cleanLine = (line: LineDraft) => ({
  name: line.name,
  detail: line.detail || undefined,
  bookingUrl: line.bookingUrl || undefined,
  commission: line.commission,
});

const totalOf = (option: OptionDraft) =>
  option.priceFlights + option.priceStay + option.priceTransfers + option.priceActivities + option.priceOther + option.priceFee;

/** Dónde reserva el cliente esta partida y si nos deja comisión. */
function BookingLinkFields({
  legend,
  where,
  url,
  commission,
  onChange,
}: {
  legend: string;
  where: string;
  url: string;
  commission: boolean;
  onChange: (changes: { where?: string; url?: string; commission?: boolean }) => void;
}) {
  const invalid = url.trim() !== '' && !/^https?:\/\//i.test(url.trim());
  return (
    <div className="mt-3 rounded-xl border border-dashed border-ink-300 bg-ink-50/60 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-500">{legend}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Input
          className="h-10 w-44 text-sm"
          placeholder="Proveedor (Booking…)"
          aria-label={`${legend}: proveedor`}
          value={where}
          onChange={(event) => onChange({ where: event.target.value })}
        />
        <Input
          className="h-10 min-w-64 flex-1 text-sm"
          placeholder="Enlace de afiliado (https://…)"
          aria-label={`${legend}: enlace`}
          invalid={invalid}
          value={url}
          onChange={(event) => onChange({ url: event.target.value })}
        />
        <label className="flex h-10 items-center gap-2 whitespace-nowrap px-1 text-sm text-ink-600">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-brand-600)]"
            checked={commission}
            onChange={(event) => onChange({ commission: event.target.checked })}
          />
          nos deja comisión
        </label>
      </div>
      {invalid ? (
        <p className="mt-1.5 text-sm text-coral-600">El enlace tiene que empezar por http:// o https://</p>
      ) : null}
    </div>
  );
}

export function QuoteBuilder({
  requestId,
  quote,
  options: existing,
  estimate,
  travelers,
  nights,
  suggestedFee,
  destination,
}: {
  requestId: string;
  quote: QuoteRow | null;
  options: QuoteOptionRow[];
  estimate: Estimate | null;
  travelers: number;
  nights: number;
  suggestedFee: number;
  destination: string;
}) {
  const router = useRouter();
  const [quoteId, setQuoteId] = useState<string | null>(quote?.id ?? null);
  const [title, setTitle] = useState(quote?.title ?? `${destination} · ${nights} noches`);
  const [message, setMessage] = useState(quote?.message ?? '');
  const [unlockFee, setUnlockFee] = useState(quote?.unlock_fee ?? suggestedFee);
  const [validUntil, setValidUntil] = useState(
    quote?.valid_until ?? new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
  );
  const [options, setOptions] = useState<OptionDraft[]>(() =>
    existing.length > 0
      ? existing.map(fromRow)
      : [emptyOption('cheapest', nights, suggestedFee), emptyOption('balanced', nights, suggestedFee), emptyOption('comfort', nights, suggestedFee)],
  );
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const patch = (key: string, changes: Partial<OptionDraft>) => {
    setOptions((current) => current.map((option) => (option.key === key ? { ...option, ...changes } : option)));
  };

  const grandTotals = useMemo(() => options.map(totalOf), [options]);

  const prefillFromEstimate = () => {
    if (!estimate) return;
    const factors: Record<OptionAngle, number> = { cheapest: 0.85, balanced: 1, comfort: 1.28 };
    setOptions((current) =>
      current.map((option) => {
        const factor = factors[option.angle];
        return {
          ...option,
          priceFlights: Math.round(estimate.breakdown.flights * factor),
          priceStay: Math.round(estimate.breakdown.stay * factor),
          priceTransfers: estimate.breakdown.transfers,
          priceActivities: estimate.breakdown.extras,
          priceFee: suggestedFee,
          marketReference: Math.round(estimate.marketReference * factor),
        };
      }),
    );
    setFeedback({ tone: 'ok', text: 'Importes rellenados con la estimación. Ajústalos con los precios reales.' });
  };

  const buildPayload = () => ({
    title,
    message,
    validUntil: validUntil || null,
    unlockFee,
    options: options.map((option) => ({
      name: option.name,
      angle: option.angle,
      summary: option.summary,
      recommended: option.recommended,
      flight: {
        legs: option.legs
          .filter((leg) => leg.from || leg.to || leg.airline)
          .map((leg) => ({ ...leg, note: leg.note || undefined })),
        baggage: option.baggage,
        bookingNote: option.bookingNote || undefined,
        bookingUrl: option.flightUrl || undefined,
        bookingWhere: option.flightWhere || undefined,
        commission: option.flightCommission,
      },
      stay: {
        name: option.stayName,
        category: option.stayCategory,
        area: option.stayArea,
        board: option.stayBoard,
        nights: option.stayNights,
        rating: option.stayRating || undefined,
        cancellation: option.stayCancellation || undefined,
        note: option.stayNote || undefined,
        bookingUrl: option.stayUrl || undefined,
        bookingWhere: option.stayWhere || undefined,
        commission: option.stayCommission,
      },
      transfers: option.transfers.filter((line) => line.name).map(cleanLine),
      activities: option.activities.filter((line) => line.name).map(cleanLine),
      priceFlights: option.priceFlights,
      priceStay: option.priceStay,
      priceTransfers: option.priceTransfers,
      priceActivities: option.priceActivities,
      priceOther: option.priceOther,
      priceFee: option.priceFee,
      marketReference: option.marketReference,
      notes: option.notes,
    })),
  });

  const save = (send: boolean) => {
    if (send && !window.confirm('Se enviará al cliente y aparecerá en su enlace privado. ¿Continuamos?')) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await saveQuoteAction(requestId, quoteId, buildPayload(), send);
      if (result.error) {
        setFeedback({ tone: 'error', text: result.error });
        return;
      }
      if (result.quoteId) setQuoteId(result.quoteId);
      setFeedback({ tone: 'ok', text: send ? 'Presupuesto enviado al cliente.' : 'Borrador guardado.' });
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">Constructor de presupuesto</h2>
          <p className="mt-1 text-sm text-ink-500">
            {quote ? `Presupuesto actual: ${quote.status}` : 'Todavía no hay presupuesto para esta solicitud.'}
          </p>
        </div>
        {estimate ? (
          <Button variant="outline" size="sm" onClick={prefillFromEstimate} disabled={pending}>
            Rellenar con la estimación
          </Button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div>
          <Label htmlFor="quote-title">Título</Label>
          <Input id="quote-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} />
        </div>
        <div>
          <Label htmlFor="quote-valid">Válido hasta</Label>
          <Input
            id="quote-valid"
            type="date"
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 p-4">
        <Label htmlFor="quote-unlock" hint="0 = plan abierto, sin muro de pago">
          Precio del desbloqueo
        </Label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            id="quote-unlock"
            type="number"
            min={0}
            step={1}
            className="w-32"
            value={unlockFee}
            onChange={(event) => setUnlockFee(Number(event.target.value) || 0)}
          />
          <p className="text-sm text-ink-600">
            Sugerido para este viaje: <strong>{eur(suggestedFee)}</strong>. Hasta que lo pague, el cliente ve los
            precios y la forma del viaje, pero no la compañía, el hotel ni los enlaces.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="quote-message">Mensaje para el cliente</Label>
        <Textarea
          id="quote-message"
          value={message}
          maxLength={2000}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Explica en dos líneas qué has encontrado, qué opción recomiendas y por qué."
        />
      </div>

      <div className="mt-8 space-y-4">
        {options.map((option, index) => (
          <details key={option.key} open={index === 0} className="rounded-2xl border border-ink-200 bg-ink-50/60">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4">
              <span className="font-semibold text-ink-900">
                {option.name || 'Opción sin nombre'}
                {option.recommended ? (
                  <span className="ml-2 rounded-pill bg-brand-600 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-white">
                    Recomendada
                  </span>
                ) : null}
              </span>
              <span className="font-mono text-sm tabular-nums text-ink-600">
                {eur(grandTotals[index] ?? 0)} · {eur((grandTotals[index] ?? 0) / Math.max(1, travelers))}/pax
              </span>
            </summary>

            <div className="space-y-6 border-t border-ink-200 bg-white p-5">
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <div>
                  <Label htmlFor={`${option.key}-name`}>Nombre de la opción</Label>
                  <Input
                    id={`${option.key}-name`}
                    value={option.name}
                    onChange={(event) => patch(option.key, { name: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={`${option.key}-angle`}>Tipo</Label>
                  <Select
                    id={`${option.key}-angle`}
                    value={option.angle}
                    onChange={(event) => patch(option.key, { angle: event.target.value as OptionAngle })}
                  >
                    {optionAngles.map((angle) => (
                      <option key={angle.id} value={angle.id}>
                        {angle.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor={`${option.key}-summary`}>Resumen en una línea</Label>
                <Input
                  id={`${option.key}-summary`}
                  value={option.summary}
                  maxLength={400}
                  onChange={(event) => patch(option.key, { summary: event.target.value })}
                />
              </div>

              <label className="flex items-center gap-2.5 text-sm font-medium text-ink-800">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--color-brand-600)]"
                  checked={option.recommended}
                  onChange={(event) => {
                    // Solo puede haber una recomendada.
                    setOptions((current) =>
                      current.map((item) => ({ ...item, recommended: item.key === option.key ? event.target.checked : false })),
                    );
                  }}
                />
                Marcar como recomendada
              </label>

              {/* Vuelos */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-brand-700">Vuelos</h3>
                <div className="mt-3 space-y-3">
                  {option.legs.map((leg, legIndex) => (
                    <div key={legIndex} className="grid gap-2 rounded-xl border border-ink-200 p-3 sm:grid-cols-4">
                      <Select
                        aria-label="Sentido"
                        className="h-10 text-sm"
                        value={leg.direction}
                        onChange={(event) => {
                          const legs = [...option.legs];
                          legs[legIndex] = { ...leg, direction: event.target.value as 'ida' | 'vuelta' };
                          patch(option.key, { legs });
                        }}
                      >
                        <option value="ida">Ida</option>
                        <option value="vuelta">Vuelta</option>
                      </Select>
                      {(
                        [
                          ['from', 'Origen'],
                          ['to', 'Destino'],
                          ['date', 'Fecha'],
                          ['depart', 'Sale'],
                          ['arrive', 'Llega'],
                          ['airline', 'Compañía'],
                          ['duration', 'Duración'],
                        ] as const
                      ).map(([field, placeholder]) => (
                        <Input
                          key={field}
                          className="h-10 text-sm"
                          placeholder={placeholder}
                          aria-label={placeholder}
                          value={leg[field]}
                          onChange={(event) => {
                            const legs = [...option.legs];
                            legs[legIndex] = { ...leg, [field]: event.target.value };
                            patch(option.key, { legs });
                          }}
                        />
                      ))}
                      <Input
                        type="number"
                        min={0}
                        max={4}
                        className="h-10 text-sm"
                        placeholder="Escalas"
                        aria-label="Escalas"
                        value={leg.stops}
                        onChange={(event) => {
                          const legs = [...option.legs];
                          legs[legIndex] = { ...leg, stops: Number(event.target.value) };
                          patch(option.key, { legs });
                        }}
                      />
                      <Input
                        className="h-10 text-sm sm:col-span-3"
                        placeholder="Nota (escala, terminal, equipaje…)"
                        aria-label="Nota del vuelo"
                        value={leg.note}
                        onChange={(event) => {
                          const legs = [...option.legs];
                          legs[legIndex] = { ...leg, note: event.target.value };
                          patch(option.key, { legs });
                        }}
                      />
                      <button
                        type="button"
                        className="h-10 rounded-xl border border-ink-200 text-sm text-ink-500 hover:bg-ink-100"
                        onClick={() => patch(option.key, { legs: option.legs.filter((_, i) => i !== legIndex) })}
                      >
                        Quitar tramo
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="rounded-xl border border-dashed border-ink-300 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
                    onClick={() => patch(option.key, { legs: [...option.legs, emptyLeg('ida')] })}
                  >
                    + Añadir tramo
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Equipaje incluido"
                    aria-label="Equipaje incluido"
                    value={option.baggage}
                    onChange={(event) => patch(option.key, { baggage: event.target.value })}
                  />
                  <Input
                    placeholder="Aviso de reserva (p. ej. billetes separados)"
                    aria-label="Aviso de reserva"
                    value={option.bookingNote}
                    onChange={(event) => patch(option.key, { bookingNote: event.target.value })}
                  />
                </div>
                <BookingLinkFields
                  legend="Dónde reserva el vuelo"
                  where={option.flightWhere}
                  url={option.flightUrl}
                  commission={option.flightCommission}
                  onChange={(changes) =>
                    patch(option.key, {
                      ...(changes.where !== undefined ? { flightWhere: changes.where } : {}),
                      ...(changes.url !== undefined ? { flightUrl: changes.url } : {}),
                      ...(changes.commission !== undefined ? { flightCommission: changes.commission } : {}),
                    })
                  }
                />
              </div>

              {/* Alojamiento */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-brand-700">Alojamiento</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ['stayName', 'Nombre del hotel'],
                      ['stayCategory', 'Categoría (4★, apartamento…)'],
                      ['stayArea', 'Zona'],
                      ['stayBoard', 'Régimen'],
                      ['stayRating', 'Valoración (8,6 en Booking)'],
                      ['stayCancellation', 'Cancelación (gratis hasta el…)'],
                    ] as const
                  ).map(([field, placeholder]) => (
                    <Input
                      key={field}
                      placeholder={placeholder}
                      aria-label={placeholder}
                      value={option[field]}
                      onChange={(event) => patch(option.key, { [field]: event.target.value } as Partial<OptionDraft>)}
                    />
                  ))}
                  <Input
                    type="number"
                    min={0}
                    placeholder="Noches"
                    aria-label="Noches"
                    value={option.stayNights}
                    onChange={(event) => patch(option.key, { stayNights: Number(event.target.value) })}
                  />
                  <Input
                    placeholder="Nota del alojamiento"
                    aria-label="Nota del alojamiento"
                    value={option.stayNote}
                    onChange={(event) => patch(option.key, { stayNote: event.target.value })}
                  />
                </div>
                <BookingLinkFields
                  legend="Dónde reserva el alojamiento"
                  where={option.stayWhere}
                  url={option.stayUrl}
                  commission={option.stayCommission}
                  onChange={(changes) =>
                    patch(option.key, {
                      ...(changes.where !== undefined ? { stayWhere: changes.where } : {}),
                      ...(changes.url !== undefined ? { stayUrl: changes.url } : {}),
                      ...(changes.commission !== undefined ? { stayCommission: changes.commission } : {}),
                    })
                  }
                />
              </div>

              {/* Traslados y actividades */}
              {(
                [
                  ['transfers', 'Traslados'],
                  ['activities', 'Actividades'],
                ] as const
              ).map(([field, legend]) => (
                <div key={field}>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-brand-700">{legend}</h3>
                  <div className="mt-3 space-y-2">
                    {option[field].map((line, lineIndex) => (
                      <div key={lineIndex} className="flex flex-wrap gap-2">
                        <Input
                          className="h-10 min-w-40 flex-1 text-sm"
                          placeholder="Concepto"
                          aria-label={`${legend}: concepto`}
                          value={line.name}
                          onChange={(event) => {
                            const lines = [...option[field]];
                            lines[lineIndex] = { ...line, name: event.target.value };
                            patch(option.key, { [field]: lines } as Partial<OptionDraft>);
                          }}
                        />
                        <Input
                          className="h-10 min-w-40 flex-1 text-sm"
                          placeholder="Detalle"
                          aria-label={`${legend}: detalle`}
                          value={line.detail}
                          onChange={(event) => {
                            const lines = [...option[field]];
                            lines[lineIndex] = { ...line, detail: event.target.value };
                            patch(option.key, { [field]: lines } as Partial<OptionDraft>);
                          }}
                        />
                        <Input
                          className="h-10 min-w-56 flex-1 text-sm"
                          placeholder="Enlace de reserva (https://…)"
                          aria-label={`${legend}: enlace de reserva`}
                          value={line.bookingUrl}
                          onChange={(event) => {
                            const lines = [...option[field]];
                            lines[lineIndex] = { ...line, bookingUrl: event.target.value };
                            patch(option.key, { [field]: lines } as Partial<OptionDraft>);
                          }}
                        />
                        <label className="flex h-10 items-center gap-2 whitespace-nowrap px-1 text-sm text-ink-600">
                          <input
                            type="checkbox"
                            className="size-4 accent-[var(--color-brand-600)]"
                            checked={line.commission}
                            onChange={(event) => {
                              const lines = [...option[field]];
                              lines[lineIndex] = { ...line, commission: event.target.checked };
                              patch(option.key, { [field]: lines } as Partial<OptionDraft>);
                            }}
                          />
                          comisión
                        </label>
                        <button
                          type="button"
                          className="h-10 rounded-xl border border-ink-200 px-3 text-sm text-ink-500 hover:bg-ink-100"
                          onClick={() =>
                            patch(option.key, {
                              [field]: option[field].filter((_, i) => i !== lineIndex),
                            } as Partial<OptionDraft>)
                          }
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="rounded-xl border border-dashed border-ink-300 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
                      onClick={() =>
                        patch(option.key, {
                          [field]: [...option[field], { name: '', detail: '', bookingUrl: '', commission: false }],
                        } as Partial<OptionDraft>)
                      }
                    >
                      + Añadir línea
                    </button>
                  </div>
                </div>
              ))}

              {/* Precios */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-brand-700">Precios (total del grupo)</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ['priceFlights', 'Vuelos'],
                      ['priceStay', 'Alojamiento'],
                      ['priceTransfers', 'Traslados'],
                      ['priceActivities', 'Actividades'],
                      ['priceOther', 'Otros'],
                      ['priceFee', 'Nuestra tarifa'],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field}>
                      <Label htmlFor={`${option.key}-${field}`}>{label}</Label>
                      <Input
                        id={`${option.key}-${field}`}
                        type="number"
                        min={0}
                        step={1}
                        value={option[field]}
                        onChange={(event) =>
                          patch(option.key, { [field]: Number(event.target.value) || 0 } as Partial<OptionDraft>)
                        }
                      />
                    </div>
                  ))}
                  <div>
                    <Label htmlFor={`${option.key}-market`} hint="para el «ahorras X»">
                      Precio de referencia
                    </Label>
                    <Input
                      id={`${option.key}-market`}
                      type="number"
                      min={0}
                      value={option.marketReference ?? ''}
                      onChange={(event) =>
                        patch(option.key, { marketReference: event.target.value ? Number(event.target.value) : null })
                      }
                    />
                  </div>
                </div>
                <p className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900">
                  Total {eur(grandTotals[index] ?? 0)} · {eur((grandTotals[index] ?? 0) / Math.max(1, travelers))} por
                  persona
                  {option.marketReference
                    ? ` · ahorro mostrado ${eur(Math.max(0, option.marketReference - (grandTotals[index] ?? 0)))}`
                    : ''}
                </p>
              </div>

              <div>
                <Label htmlFor={`${option.key}-notes`}>Letra pequeña de esta opción</Label>
                <Textarea
                  id={`${option.key}-notes`}
                  value={option.notes}
                  maxLength={600}
                  onChange={(event) => patch(option.key, { notes: event.target.value })}
                  placeholder="Condiciones de cancelación, avisos, qué no incluye…"
                />
              </div>

              {options.length > 1 ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-coral-600 hover:underline"
                  onClick={() => setOptions((current) => current.filter((item) => item.key !== option.key))}
                >
                  Eliminar esta opción
                </button>
              ) : null}
            </div>
          </details>
        ))}
      </div>

      {options.length < 4 ? (
        <button
          type="button"
          className="mt-4 rounded-xl border border-dashed border-ink-300 px-4 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-100"
          onClick={() => setOptions((current) => [...current, emptyOption('balanced', nights, suggestedFee)])}
        >
          + Añadir otra opción
        </button>
      ) : null}

      {feedback ? (
        <p
          role="status"
          className={
            feedback.tone === 'ok'
              ? 'mt-6 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900'
              : 'mt-6 rounded-xl bg-coral-50 px-4 py-3 text-sm text-coral-700'
          }
        >
          {feedback.text}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 border-t border-ink-200 pt-6 sm:flex-row">
        <Button variant="outline" onClick={() => save(false)} disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar borrador'}
        </Button>
        <Button variant="coral" onClick={() => save(true)} disabled={pending}>
          Guardar y enviar al cliente
        </Button>
      </div>
    </section>
  );
}
