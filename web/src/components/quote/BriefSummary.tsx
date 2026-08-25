import {
  baggageOptions,
  boardOptions,
  extraServices,
  priorities,
  stayLocations,
  stayTypes,
  stopsOptions,
} from '@/lib/brief';
import type { Brief } from '@/lib/brief';
import { datesSummary, destinationSummary, originSummary, travelersSummary } from '@/lib/summary';
import { eur } from '@/lib/utils';

const labelOf = <T extends { id: string; label: string }>(list: T[], id: string) =>
  list.find((item) => item.id === id)?.label ?? id;

export function BriefSummary({ brief }: { brief: Brief }) {
  const rows: [string, string][] = [
    ['Destino', destinationSummary(brief)],
    ['Salida desde', originSummary(brief)],
    ['Fechas', datesSummary(brief)],
    ['Viajeros', travelersSummary(brief)],
    ['Vuelos', `${labelOf(stopsOptions, brief.flights.stops)} · ${labelOf(baggageOptions, brief.flights.baggage)}`],
    [
      'Alojamiento',
      brief.stay.types.includes('ninguno')
        ? 'Solo vuelos'
        : `${brief.stay.types.map((type) => labelOf(stayTypes, type)).join(', ')} · ${labelOf(boardOptions, brief.stay.board)} · ${labelOf(stayLocations, brief.stay.location)}`,
    ],
    [
      'Extras',
      brief.extras.services.length > 0
        ? brief.extras.services.map((service) => labelOf(extraServices, service)).join(', ')
        : 'Ninguno',
    ],
    [
      'Presupuesto',
      brief.budget.perPerson
        ? `${eur(brief.budget.perPerson)}/persona · ${labelOf(priorities, brief.budget.priority)}`
        : labelOf(priorities, brief.budget.priority),
    ],
  ];

  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[9rem_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-ink-500">{label}</dt>
          <dd className="text-ink-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
