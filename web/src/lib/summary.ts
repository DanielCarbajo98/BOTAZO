import type { Brief } from '@/lib/brief';
import { nightsFromBrief, travelerCount } from '@/lib/brief';
import { regions } from '@/lib/catalog';
import { formatDate } from '@/lib/utils';

const monthFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

export function monthLabel(value: string): string {
  const [year, month] = value.split('-');
  if (!year || !month) return value;
  const label = monthFormatter.format(new Date(Number(year), Number(month) - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Una línea que describe a dónde quiere ir el cliente. */
export function destinationSummary(brief: Brief): string {
  const { trip } = brief;
  if (trip.destinationMode === 'known' && trip.destinations.length > 0) {
    return trip.destinations.join(' · ');
  }
  if (trip.destinationMode === 'idea') {
    const regionLabels = trip.regions
      .map((id) => regions.find((r) => r.id === id)?.label)
      .filter(Boolean) as string[];
    if (regionLabels.length > 0) return `Idea: ${regionLabels.join(', ')}`;
    if (trip.vibes.length > 0) return `Idea: ${trip.vibes.join(', ')}`;
    return 'Idea sin concretar';
  }
  return 'Destino abierto (lo más barato)';
}

/** Una línea que describe cuándo quiere viajar. */
export function datesSummary(brief: Brief): string {
  const { dates } = brief;
  const nights = nightsFromBrief(dates);
  const nightsText = `${nights} ${nights === 1 ? 'noche' : 'noches'}`;

  switch (dates.mode) {
    case 'exact':
      return dates.startDate && dates.endDate
        ? `${formatDate(dates.startDate, { day: 'numeric', month: 'short' })} → ${formatDate(dates.endDate, { day: 'numeric', month: 'short', year: 'numeric' })} · ${nightsText}`
        : `Fechas exactas · ${nightsText}`;
    case 'flexible':
      return dates.startDate
        ? `Sobre el ${formatDate(dates.startDate, { day: 'numeric', month: 'short' })} ±${dates.flexDays ?? 3} días · ${nightsText}`
        : `Fechas flexibles · ${nightsText}`;
    case 'month':
      return `${dates.months.map(monthLabel).join(' / ') || 'Mes por definir'} · ${nightsText}`;
    case 'cheapest':
      return `Cuando salga más barato · ${nightsText}`;
  }
}

export function travelersSummary(brief: Brief): string {
  const people = travelerCount(brief.travelers);
  const parts = [`${people.adults} ${people.adults === 1 ? 'adulto' : 'adultos'}`];
  if (people.children > 0) parts.push(`${people.children} ${people.children === 1 ? 'niño' : 'niños'}`);
  if (people.infants > 0) parts.push(`${people.infants} ${people.infants === 1 ? 'bebé' : 'bebés'}`);
  return parts.join(', ');
}

export function originSummary(brief: Brief): string {
  const list = brief.origin.airports.join(' / ');
  return brief.origin.nearbyOk ? `${list} (o cercanos)` : list;
}
