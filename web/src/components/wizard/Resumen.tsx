'use client';

import {
  baggageOptions,
  boardOptions,
  contactChannels,
  extraServices,
  flightPreferences,
  priorities,
  stayLocations,
  stayMustHaves,
  stayTypes,
  stopsOptions,
} from '@/lib/brief';
import { regions, vibes } from '@/lib/catalog';
import { datesSummary, destinationSummary, travelersSummary } from '@/lib/summary';
import { toBrief, type StepId, type WizardState } from '@/components/wizard/state';
import { eur } from '@/lib/utils';

const labelOf = <T extends { id: string; label: string }>(list: T[], id: string) =>
  list.find((item) => item.id === id)?.label ?? id;

const labelsOf = <T extends { id: string; label: string }>(list: T[], ids: string[]) =>
  ids.map((id) => labelOf(list, id)).join(', ');

export function Resumen({ state, goTo }: { state: WizardState; goTo: (step: StepId) => void }) {
  const brief = toBrief(state);

  const blocks: { step: StepId; title: string; rows: [string, string][] }[] = [
    {
      step: 'destino',
      title: 'Destino',
      rows: [
        ['A dónde', destinationSummary(brief)],
        ...(state.trip.regions.length
          ? ([['Zonas', state.trip.regions.map((r) => labelOf(regions, r)).join(', ')]] as [string, string][])
          : []),
        ...(state.trip.vibes.length
          ? ([['Tipo de viaje', state.trip.vibes.map((v) => labelOf(vibes, v)).join(', ')]] as [string, string][])
          : []),
        ...(state.trip.avoid ? ([['A evitar', state.trip.avoid]] as [string, string][]) : []),
      ],
    },
    {
      step: 'origen',
      title: 'Origen',
      rows: [
        ['Aeropuertos', state.origin.airports.join(', ') || '—'],
        ['Aeropuertos cercanos', state.origin.nearbyOk ? 'Sí, si sale mejor' : 'No'],
      ],
    },
    {
      step: 'fechas',
      title: 'Fechas',
      rows: [
        ['Cuándo', datesSummary(brief)],
        ...(state.dates.notes ? ([['Restricciones', state.dates.notes]] as [string, string][]) : []),
      ],
    },
    {
      step: 'viajeros',
      title: 'Viajeros',
      rows: [
        ['Quién viaja', travelersSummary(brief)],
        ['Habitaciones', String(state.travelers.rooms)],
        ...(state.travelers.mobilityNeeds
          ? ([['Necesidades especiales', state.travelers.mobilityNeeds]] as [string, string][])
          : []),
      ],
    },
    {
      step: 'vuelos',
      title: 'Vuelos',
      rows: [
        ['Escalas', labelOf(stopsOptions, state.flights.stops)],
        ['Equipaje', labelOf(baggageOptions, state.flights.baggage)],
        ...(state.flights.preferences.length
          ? ([['Límites', labelsOf(flightPreferences, state.flights.preferences)]] as [string, string][])
          : []),
        ['Billetes separados', state.flights.separateTicketsOk ? 'Aceptados' : 'No'],
        ...(state.flights.notes ? ([['Notas', state.flights.notes]] as [string, string][]) : []),
      ],
    },
    {
      step: 'alojamiento',
      title: 'Alojamiento',
      rows: state.stay.types.includes('ninguno')
        ? [['Alojamiento', 'No hace falta, solo vuelos']]
        : [
            ['Tipo', labelsOf(stayTypes, state.stay.types)],
            ['Régimen', labelOf(boardOptions, state.stay.board)],
            ['Ubicación', labelOf(stayLocations, state.stay.location)],
            ...(state.stay.mustHaves.length
              ? ([['Imprescindibles', labelsOf(stayMustHaves, state.stay.mustHaves)]] as [string, string][])
              : []),
            ...(state.stay.notes ? ([['Notas', state.stay.notes]] as [string, string][]) : []),
          ],
    },
    {
      step: 'extras',
      title: 'Extras',
      rows: [
        ['Servicios', state.extras.services.length ? labelsOf(extraServices, state.extras.services) : 'Ninguno'],
        ...(state.extras.notes ? ([['Comentarios', state.extras.notes]] as [string, string][]) : []),
      ],
    },
    {
      step: 'presupuesto',
      title: 'Presupuesto',
      rows: [
        [
          'Por persona',
          state.budget.perPerson
            ? `${eur(state.budget.perPerson)}${state.budget.hardLimit ? ' (límite estricto)' : ''}`
            : 'Sin definir',
        ],
        ['Prioridad', labelOf(priorities, state.budget.priority)],
      ],
    },
    {
      step: 'contacto',
      title: 'Contacto',
      rows: [
        ['Nombre', state.contact.name || '—'],
        ['Email', state.contact.email || '—'],
        ...(state.contact.phone ? ([['Teléfono', state.contact.phone]] as [string, string][]) : []),
        ['Canal preferido', labelOf(contactChannels, state.contact.channel)],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <section key={block.step} className="rounded-2xl border border-ink-100 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-display text-lg font-semibold text-ink-900">{block.title}</h3>
            <button
              type="button"
              onClick={() => goTo(block.step)}
              className="rounded-lg px-2.5 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              Editar
            </button>
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
            {block.rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-ink-500">{label}</dt>
                <dd className="text-ink-800">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
