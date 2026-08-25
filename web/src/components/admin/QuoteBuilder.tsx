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

type LineDraft = { name: string; detail: string };

type OptionDraft = {
  key: string;
  name: string;
  angle: OptionAngle;
  summary: string;
  recommended: boolean;
  legs: LegDraft[];
  baggage: string;
  bookingNote: string;
  stayName: string;
  stayCategory: string;
  stayArea: string;
  stayBoard: string;
  stayNights: number;
  stayRating: string;
  stayCancellation: string;
  stayNote: string;
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
    stayName: '',
    stayCategory: '',
    stayArea: '',
    stayBoard: '',
    stayNights: nights,
    stayRating: '',
    stayCancellation: '',
    stayNote: '',
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
  const flight = row.flight_json ? (JSON.parse(row.flight_json) as { legs?: LegDraft[]; baggage?: string; bookingNote?: string }) : null;
  const stay = row.stay_json ? (JSON.parse(row.stay_json) as Record<string, unknown>) : null;
  const parseLines = (json: string | null): LineDraft[] =>
    json ? (JSON.parse(json) as { name?: string; detail?: string }[]).map((item) => ({ name: item.name ?? '', detail: item.detail ?? '' })) : [];

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
    stayName: String(stay?.name ?? ''),
    stayCategory: String(stay?.category ?? ''),
    stayArea: String(stay?.area ?? ''),
    stayBoard: String(stay?.board ?? ''),
    stayNights: Number(stay?.nights ?? 0),
    stayRating: String(stay?.rating ?? ''),
    stayCancellation: String(stay?.cancellation ?? ''),
    stayNote: String(stay?.note ?? ''),
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

const totalOf = (option: OptionDraft) =>
  option.priceFlights + option.priceStay + option.priceTransfers + option.priceActivities + option.priceOther + option.priceFee;

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
      },
      transfers: option.transfers.filter((line) => line.name),
      activities: option.activities.filter((line) => line.name),
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
                          [field]: [...option[field], { name: '', detail: '' }],
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
