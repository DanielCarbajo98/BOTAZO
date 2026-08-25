import { pricing } from '@/config/site';
import type { Brief, BoardPref, Priority, StayLocation, StayType } from '@/lib/brief';
import { nightsFromBrief, travelerCount } from '@/lib/brief';
import {
  findDestination,
  regionFallback,
  type DestinationSeed,
  type DistanceBand,
  type RegionId,
} from '@/lib/catalog';

/**
 * Estimador orientativo.
 *
 * NO es un motor de reservas: no consulta ninguna API de vuelos. Aplica
 * medianas de mercado y una serie de factores conocidos (temporada, antelación,
 * flexibilidad, escalas, equipaje…) para dar al cliente una horquilla realista
 * mientras rellena el formulario, y al equipo un punto de partida al preparar
 * el presupuesto real.
 *
 * Todos los factores están aquí, en un solo sitio, para poder recalibrarlos con
 * datos reales conforme la agencia acumule presupuestos cerrados.
 */

export const factors = {
  season: { peak: 1.42, mid: 1, low: 0.79 },
  /** Recargo adicional por fechas "imposibles": agosto, Navidad, Semana Santa. */
  premiumWindow: 1.12,
  stops: { direct: 1.24, one: 1, any: 0.87 },
  baggage: { personal: 1, cabin: 1.09, checked: 1.24, 'checked-plus': 1.4 },
  cabin: { economy: 1, premium: 2.3, business: 4 },
  dateMode: { exact: 1.18, flexible: 1, month: 0.9, cheapest: 0.79 },
  /** Factor extra según cuántos días de margen acepta el cliente. */
  flexDays: (days: number) => Math.max(0.9, 1 - days * 0.022),
  nearbyOrigin: 0.95,
  separateTickets: 0.93,
  noLowCost: 1.26,
  flexibleFare: 1.3,
  leadTime: (days: number) => {
    if (days < 10) return 1.5;
    if (days < 21) return 1.32;
    if (days < 45) return 1.12;
    if (days <= 150) return 1;
    if (days <= 260) return 0.97;
    return 1.04;
  },
  priority: { cheapest: 0.93, balanced: 1, comfort: 1.18 } satisfies Record<Priority, number>,
  stayType: {
    ninguno: 0,
    hostel: 0.42,
    apartamento: 0.9,
    hotel3: 1,
    hotel4: 1.48,
    hotel5: 2.7,
    boutique: 1.95,
    resort: 2.15,
    rural: 1,
  } satisfies Record<StayType, number>,
  board: {
    any: 1,
    'room-only': 1,
    breakfast: 1.13,
    half: 1.32,
    full: 1.48,
    'all-inclusive': 1.78,
  } satisfies Record<BoardPref, number>,
  stayLocation: {
    any: 0.93,
    center: 1.16,
    beachfront: 1.28,
    quiet: 0.96,
    transport: 1,
  } satisfies Record<StayLocation, number>,
  /** Cada "imprescindible" del hotel encarece un poco la búsqueda. */
  mustHave: 1.025,
  /** Precio típico si el cliente reserva por su cuenta sin optimizar nada. */
  unoptimizedMarkup: 1.24,
  /** Horquilla que mostramos alrededor de la estimación central. */
  spread: { low: 0.85, high: 1.19 },
} as const;

const extraUnitCosts: Record<string, { perPerson?: number; perDay?: number; perTrip?: number }> = {
  traslados: { perPerson: 0 }, // se calcula con transferBase del destino
  coche: { perDay: 38 },
  actividades: { perPerson: 45, perDay: 12 },
  seguro: { perPerson: 9, perDay: 3.5 },
  esim: { perPerson: 12 },
  'parking-origen': { perDay: 9 },
  'tren-origen': { perPerson: 40 },
  restaurantes: { perTrip: 0 },
  itinerario: { perTrip: 0 },
};

export type EstimateBreakdown = {
  flights: number;
  stay: number;
  transfers: number;
  extras: number;
  fee: number;
};

export type Estimate = {
  /** Estimación central del coste total del viaje para todo el grupo. */
  total: number;
  low: number;
  high: number;
  perPerson: number;
  breakdown: EstimateBreakdown;
  nights: number;
  travelers: number;
  /** Lo que costaría, según nuestras medianas, reservándolo sin optimizar. */
  marketReference: number;
  estimatedSaving: number;
  /** Nivel de confianza: cuanto menos concreto es el brief, menor. */
  confidence: 'baja' | 'media' | 'alta';
  /** Motivos que mueven el precio, para explicárselo al cliente. */
  drivers: { label: string; effect: 'sube' | 'baja'; weight: number }[];
  destination?: DestinationSeed;
};

function seasonFactorFor(months: number[], destination: DestinationSeed | undefined, band: DistanceBand): number {
  if (months.length === 0) return factors.season.mid;
  const peak = destination?.peakMonths ?? (band === 'corto' ? [7, 8] : [7, 8, 12]);
  const low = destination?.lowMonths ?? [1, 2, 11];
  const values = months.map((m) => {
    if (peak.includes(m)) return factors.season.peak;
    if (low.includes(m)) return factors.season.low;
    return factors.season.mid;
  });
  // Si el cliente da varios meses, buscaremos el más barato de ellos.
  return Math.min(...values);
}

function monthsFromDates(dates: Brief['dates']): number[] {
  if (dates.months.length > 0) {
    return dates.months.map((m) => Number(m.slice(5, 7)));
  }
  if (dates.startDate) return [Number(dates.startDate.slice(5, 7))];
  return [];
}

function leadTimeDays(dates: Brief['dates']): number {
  if (dates.startDate) {
    return Math.max(0, Math.round((Date.parse(`${dates.startDate}T00:00:00`) - Date.now()) / 86_400_000));
  }
  if (dates.months.length > 0) {
    const first = [...dates.months].sort()[0]!;
    return Math.max(0, Math.round((Date.parse(`${first}-01T00:00:00`) - Date.now()) / 86_400_000));
  }
  // Sin fechas asumimos una antelación cómoda: es el escenario que buscaremos.
  return 120;
}

function isPremiumWindow(months: number[], dates: Brief['dates']): boolean {
  if (dates.mode === 'cheapest') return false;
  if (months.includes(8)) return true;
  if (dates.startDate) {
    const md = dates.startDate.slice(5);
    if (md >= '12-20' || md <= '01-06') return true;
  }
  return false;
}

/** Resuelve los precios base a partir del destino escrito o de la región elegida. */
export function resolveBaseline(brief: Brief): {
  destination?: DestinationSeed;
  flightBase: number;
  hotelNight: number;
  transferBase: number;
  band: DistanceBand;
} {
  const named = brief.trip.destinations
    .map((d) => findDestination(d))
    .find((d): d is DestinationSeed => Boolean(d));

  if (named) {
    return {
      destination: named,
      flightBase: named.flightBase,
      hotelNight: named.hotelNight,
      transferBase: named.transferBase ?? regionFallback[named.region].transferBase,
      band: named.band,
    };
  }

  const regions: RegionId[] = brief.trip.regions.length > 0 ? brief.trip.regions : ['europa-occidental'];
  // Con varias regiones nos quedamos con la más barata: es la que propondríamos.
  const cheapest = regions
    .map((r) => regionFallback[r])
    .reduce((a, b) => (a.flightBase <= b.flightBase ? a : b));

  return {
    flightBase: cheapest.flightBase,
    hotelNight: cheapest.hotelNight,
    transferBase: cheapest.transferBase,
    band: cheapest.band,
  };
}

export function estimate(brief: Brief): Estimate {
  const drivers: Estimate['drivers'] = [];
  const track = (label: string, factor: number) => {
    if (Math.abs(factor - 1) < 0.02) return;
    drivers.push({ label, effect: factor > 1 ? 'sube' : 'baja', weight: Math.abs(factor - 1) });
  };

  const { destination, flightBase, hotelNight, transferBase, band } = resolveBaseline(brief);
  const nights = nightsFromBrief(brief.dates);
  const people = travelerCount(brief.travelers);
  const months = monthsFromDates(brief.dates);

  /* ---------------- Vuelos ---------------- */
  const season = seasonFactorFor(months, destination, band);
  track(season > 1 ? 'Temporada alta en ese destino' : 'Temporada baja: buen momento', season);

  const stops = factors.stops[brief.flights.stops];
  track(brief.flights.stops === 'direct' ? 'Exiges vuelo directo' : 'Aceptas escalas', stops);

  const baggage = factors.baggage[brief.flights.baggage];
  track(brief.flights.baggage === 'personal' ? 'Viajas solo con mochila' : 'Equipaje extra', baggage);

  const cabin = factors.cabin[brief.flights.cabin];
  if (brief.flights.cabin !== 'economy') track('Clase superior', cabin);

  let dateFactor = factors.dateMode[brief.dates.mode];
  if (brief.dates.mode === 'flexible' && brief.dates.flexDays) {
    dateFactor *= factors.flexDays(brief.dates.flexDays);
  }
  track(dateFactor > 1 ? 'Fechas cerradas' : 'Flexibilidad en las fechas', dateFactor);

  const lead = leadTimeDays(brief.dates);
  const leadFactor = factors.leadTime(lead);
  track(leadFactor > 1 ? 'Poca antelación' : 'Reservas con buena antelación', leadFactor);

  const nearby = brief.origin.nearbyOk ? factors.nearbyOrigin : 1;
  track('Aceptas otros aeropuertos cercanos', nearby);

  const separate = brief.flights.separateTicketsOk ? factors.separateTickets : 1;
  track('Aceptas billetes por separado', separate);

  const noLowCost = brief.flights.preferences.includes('no-low-cost') ? factors.noLowCost : 1;
  track('Solo compañías tradicionales', noLowCost);

  const flexFare = brief.flights.preferences.includes('flexible-cancelacion') ? factors.flexibleFare : 1;
  track('Tarifas cambiables', flexFare);

  const premium = isPremiumWindow(months, brief.dates) ? factors.premiumWindow : 1;
  track('Fechas de máxima demanda (agosto/Navidad)', premium);

  const priority = factors.priority[brief.budget.priority];
  track(brief.budget.priority === 'cheapest' ? 'Priorizas el precio' : 'Priorizas la comodidad', priority);

  const flightPerPerson =
    flightBase * season * stops * baggage * cabin * dateFactor * leadFactor * nearby * separate * noLowCost * flexFare * premium * priority;

  // Los niños suelen pagar tarifa casi completa; los bebés, mucho menos.
  const flightsTotal = flightPerPerson * (people.adults + people.children) + flightPerPerson * 0.15 * people.infants;

  /* ---------------- Alojamiento ---------------- */
  let stayTotal = 0;
  const wantsStay = !brief.stay.types.includes('ninguno');
  if (wantsStay) {
    const typeFactor =
      brief.stay.types.reduce((min, t) => Math.min(min, factors.stayType[t] || 1), Number.POSITIVE_INFINITY) || 1;
    const boardFactor = factors.board[brief.stay.board];
    const locationFactor = factors.stayLocation[brief.stay.location];
    const mustHaveFactor = factors.mustHave ** brief.stay.mustHaves.length;
    track('Nivel de alojamiento', typeFactor);
    track('Régimen de comidas', boardFactor);
    track('Ubicación del alojamiento', locationFactor);

    stayTotal =
      hotelNight *
      typeFactor *
      boardFactor *
      locationFactor *
      mustHaveFactor *
      season *
      priority *
      nights *
      brief.travelers.rooms;
  }

  /* ---------------- Traslados y extras ---------------- */
  let transfers = 0;
  if (brief.extras.services.includes('traslados')) {
    transfers = transferBase * people.billable;
  }

  let extras = 0;
  const days = nights + 1;
  for (const service of brief.extras.services) {
    if (service === 'traslados') continue;
    const cost = extraUnitCosts[service];
    if (!cost) continue;
    extras += (cost.perPerson ?? 0) * people.billable;
    extras += (cost.perDay ?? 0) * days * (service === 'coche' || service === 'parking-origen' ? 1 : people.billable);
    extras += cost.perTrip ?? 0;
  }

  /* ---------------- Nuestra tarifa ---------------- */
  const fee = calculateFee(brief);

  const breakdown: EstimateBreakdown = {
    flights: Math.round(flightsTotal),
    stay: Math.round(stayTotal),
    transfers: Math.round(transfers),
    extras: Math.round(extras),
    fee: Math.round(fee),
  };

  const total = breakdown.flights + breakdown.stay + breakdown.transfers + breakdown.extras + breakdown.fee;
  const travelPart = total - breakdown.fee;

  const confidence: Estimate['confidence'] = destination
    ? brief.dates.mode === 'exact' || brief.dates.mode === 'flexible'
      ? 'alta'
      : 'media'
    : brief.trip.destinationMode === 'surprise'
      ? 'baja'
      : 'media';

  drivers.sort((a, b) => b.weight - a.weight);

  return {
    total: Math.round(total),
    low: Math.round(total * factors.spread.low),
    high: Math.round(total * factors.spread.high),
    perPerson: Math.round(total / Math.max(1, people.billable)),
    breakdown,
    nights,
    travelers: people.total,
    marketReference: Math.round(travelPart * factors.unoptimizedMarkup),
    estimatedSaving: Math.max(0, Math.round(travelPart * factors.unoptimizedMarkup - total)),
    confidence,
    drivers: drivers.slice(0, 5),
    destination,
  };
}

/**
 * Tarifa de gestión. Fija, visible y por persona: es el único ingreso de la
 * agencia sobre el viaje, en lugar de una comisión escondida en el precio.
 */
export function calculateFee(brief: Brief): number {
  const people = travelerCount(brief.travelers);
  const nights = nightsFromBrief(brief.dates);
  const { band } = resolveBaseline(brief);

  const isBigTrip =
    band === 'largo' ||
    band === 'ultralargo' ||
    nights > 6 ||
    brief.trip.destinations.length > 1;

  const tier = isBigTrip ? pricing.granViaje : pricing.escapada;

  const payingTravelers =
    people.adults + brief.travelers.childrenAges.filter((age) => age >= pricing.freeFeeUnderAge).length;

  let perPerson = tier.feePerPerson;
  if (people.billable >= pricing.grupoMinSize) {
    perPerson = perPerson * (1 - pricing.grupoDiscount);
  }

  return Math.min(pricing.feeCap, Math.round(perPerson * Math.max(1, payingTravelers)));
}

export function feeTierLabel(brief: Brief): string {
  const { band } = resolveBaseline(brief);
  const nights = nightsFromBrief(brief.dates);
  const isBigTrip = band === 'largo' || band === 'ultralargo' || nights > 6 || brief.trip.destinations.length > 1;
  return isBigTrip ? pricing.granViaje.label : pricing.escapada.label;
}
