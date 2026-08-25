import type {
  BaggagePref,
  BoardPref,
  Brief,
  CabinClass,
  ContactChannel,
  DateMode,
  DestinationMode,
  Priority,
  StayLocation,
  StayType,
  StopsPref,
} from '@/lib/brief';
import type { RegionId, VibeId } from '@/lib/catalog';

/**
 * Estado del wizard. A diferencia de `Brief`, aquí todos los campos existen
 * desde el principio (con valores por defecto) para que los controles del
 * formulario nunca pasen de no-controlados a controlados.
 */
export type WizardState = {
  trip: {
    destinationMode: DestinationMode;
    destinations: string[];
    regions: RegionId[];
    vibes: VibeId[];
    maxFlightHours: number | null;
    avoid: string;
  };
  origin: { airports: string[]; nearbyOk: boolean; maxDriveMinutes: number | null };
  dates: {
    mode: DateMode;
    startDate: string;
    endDate: string;
    flexDays: number;
    months: string[];
    nights: number;
    nightsFlex: number;
    notes: string;
  };
  travelers: {
    adults: number;
    childrenAges: number[];
    infants: number;
    rooms: number;
    mobilityNeeds: string;
  };
  flights: {
    stops: StopsPref;
    baggage: BaggagePref;
    cabin: CabinClass;
    preferences: string[];
    separateTicketsOk: boolean;
    notes: string;
  };
  stay: {
    types: StayType[];
    board: BoardPref;
    location: StayLocation;
    mustHaves: string[];
    notes: string;
  };
  extras: { services: string[]; interests: VibeId[]; notes: string };
  budget: { perPerson: number | null; priority: Priority; hardLimit: boolean };
  contact: {
    name: string;
    email: string;
    phone: string;
    channel: ContactChannel;
    bestTime: string;
    marketingOptIn: boolean;
    privacyAccepted: boolean;
  };
};

export const STORAGE_KEY = 'vl-wizard-v1';

export function initialState(presetDestination?: string): WizardState {
  return {
    trip: {
      destinationMode: presetDestination ? 'known' : 'known',
      destinations: presetDestination ? [presetDestination] : [],
      regions: [],
      vibes: [],
      maxFlightHours: null,
      avoid: '',
    },
    origin: { airports: [], nearbyOk: true, maxDriveMinutes: 120 },
    dates: {
      mode: 'flexible',
      startDate: '',
      endDate: '',
      flexDays: 3,
      months: [],
      nights: 4,
      nightsFlex: 1,
      notes: '',
    },
    travelers: { adults: 2, childrenAges: [], infants: 0, rooms: 1, mobilityNeeds: '' },
    flights: {
      stops: 'one',
      baggage: 'cabin',
      cabin: 'economy',
      preferences: [],
      separateTicketsOk: false,
      notes: '',
    },
    stay: { types: ['hotel3'], board: 'any', location: 'any', mustHaves: [], notes: '' },
    extras: { services: [], interests: [], notes: '' },
    budget: { perPerson: null, priority: 'balanced', hardLimit: false },
    contact: {
      name: '',
      email: '',
      phone: '',
      channel: 'whatsapp',
      bestTime: '',
      marketingOptIn: false,
      privacyAccepted: false,
    },
  };
}

/** Convierte el estado del wizard en el `Brief` que espera el servidor. */
export function toBrief(state: WizardState): Brief {
  return {
    trip: {
      destinationMode: state.trip.destinationMode,
      destinations: state.trip.destinations.filter(Boolean),
      regions: state.trip.regions,
      vibes: state.trip.vibes,
      ...(state.trip.maxFlightHours ? { maxFlightHours: state.trip.maxFlightHours } : {}),
      ...(state.trip.avoid ? { avoid: state.trip.avoid } : {}),
    },
    origin: {
      airports: state.origin.airports.filter(Boolean),
      nearbyOk: state.origin.nearbyOk,
      ...(state.origin.maxDriveMinutes !== null ? { maxDriveMinutes: state.origin.maxDriveMinutes } : {}),
    },
    dates: {
      mode: state.dates.mode,
      ...(state.dates.startDate ? { startDate: state.dates.startDate } : {}),
      ...(state.dates.endDate ? { endDate: state.dates.endDate } : {}),
      ...(state.dates.mode === 'flexible' ? { flexDays: state.dates.flexDays } : {}),
      months: state.dates.months,
      ...(state.dates.mode === 'month' || state.dates.mode === 'cheapest'
        ? { nights: state.dates.nights, nightsFlex: state.dates.nightsFlex }
        : {}),
      ...(state.dates.notes ? { notes: state.dates.notes } : {}),
    },
    travelers: {
      adults: state.travelers.adults,
      childrenAges: state.travelers.childrenAges,
      infants: state.travelers.infants,
      rooms: state.travelers.rooms,
      ...(state.travelers.mobilityNeeds ? { mobilityNeeds: state.travelers.mobilityNeeds } : {}),
    },
    flights: {
      stops: state.flights.stops,
      baggage: state.flights.baggage,
      cabin: state.flights.cabin,
      preferences: state.flights.preferences,
      separateTicketsOk: state.flights.separateTicketsOk,
      ...(state.flights.notes ? { notes: state.flights.notes } : {}),
    },
    stay: {
      types: state.stay.types,
      board: state.stay.board,
      location: state.stay.location,
      mustHaves: state.stay.mustHaves,
      ...(state.stay.notes ? { notes: state.stay.notes } : {}),
    },
    extras: {
      services: state.extras.services,
      interests: state.extras.interests,
      ...(state.extras.notes ? { notes: state.extras.notes } : {}),
    },
    budget: {
      ...(state.budget.perPerson !== null ? { perPerson: state.budget.perPerson } : {}),
      priority: state.budget.priority,
      hardLimit: state.budget.hardLimit,
    },
    contact: {
      name: state.contact.name.trim(),
      email: state.contact.email.trim(),
      ...(state.contact.phone ? { phone: state.contact.phone.trim() } : {}),
      channel: state.contact.channel,
      ...(state.contact.bestTime ? { bestTime: state.contact.bestTime } : {}),
      marketingOptIn: state.contact.marketingOptIn,
      privacyAccepted: true,
    },
  } as Brief;
}

/**
 * Brief "de trabajo" para el estimador en vivo: rellena lo que aún no ha
 * contestado el cliente para poder enseñar una horquilla desde el primer paso.
 */
export function toDraftBrief(state: WizardState): Brief {
  const brief = toBrief(state);
  if (brief.origin.airports.length === 0) brief.origin.airports = ['MAD'];
  if (brief.trip.destinationMode !== 'known' && brief.trip.regions.length === 0) {
    brief.trip.regions = ['europa-occidental'];
  }
  brief.contact.name = brief.contact.name || 'borrador';
  brief.contact.email = brief.contact.email || 'borrador@example.com';
  return brief;
}

/* ------------------------------------------------------------------ *
 * Pasos y validación
 * ------------------------------------------------------------------ */

export type StepId =
  | 'destino'
  | 'origen'
  | 'fechas'
  | 'viajeros'
  | 'vuelos'
  | 'alojamiento'
  | 'extras'
  | 'presupuesto'
  | 'contacto'
  | 'resumen';

export type StepDef = { id: StepId; title: string; short: string; description: string };

export const steps: StepDef[] = [
  {
    id: 'destino',
    title: '¿A dónde quieres ir?',
    short: 'Destino',
    description: 'No hace falta que lo tengas decidido. Con una idea nos vale, y si te da igual, mejor todavía.',
  },
  {
    id: 'origen',
    title: '¿Desde dónde sales?',
    short: 'Origen',
    description: 'Cuantos más aeropuertos aceptes, más margen tenemos para bajar el precio.',
  },
  {
    id: 'fechas',
    title: '¿Cuándo quieres viajar?',
    short: 'Fechas',
    description: 'Esta es la pregunta que más dinero mueve de todo el formulario.',
  },
  {
    id: 'viajeros',
    title: '¿Quién viaja?',
    short: 'Viajeros',
    description: 'Necesitamos las edades de los niños porque cambian el precio del vuelo y del hotel.',
  },
  {
    id: 'vuelos',
    title: 'Tus vuelos',
    short: 'Vuelos',
    description: 'Dinos qué estás dispuesto a aguantar y qué no. Respetamos tus límites.',
  },
  {
    id: 'alojamiento',
    title: 'Tu alojamiento',
    short: 'Hotel',
    description: 'Marca todo lo que te valdría: cuantas más opciones, más barato lo encontraremos.',
  },
  {
    id: 'extras',
    title: '¿Necesitas algo más?',
    short: 'Extras',
    description: 'Traslados, coche, actividades, seguro… Lo buscamos también, o lo dejamos fuera.',
  },
  {
    id: 'presupuesto',
    title: 'Tu presupuesto',
    short: 'Presupuesto',
    description: 'Saber tu techo nos ahorra proponerte cosas que no te encajan.',
  },
  {
    id: 'contacto',
    title: '¿Cómo te avisamos?',
    short: 'Contacto',
    description: 'Te enviamos el presupuesto por donde te venga mejor.',
  },
  {
    id: 'resumen',
    title: 'Revisa y envía',
    short: 'Resumen',
    description: 'Comprueba que está todo bien. Puedes volver a cualquier paso.',
  },
];

export type Errors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+0-9 ()-]{7,}$/;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function validateStep(step: StepId, state: WizardState): Errors {
  const errors: Errors = {};

  switch (step) {
    case 'destino': {
      if (state.trip.destinationMode === 'known' && state.trip.destinations.filter(Boolean).length === 0) {
        errors.destinations = 'Escribe al menos un destino, o cambia arriba a "tengo una idea".';
      }
      if (
        state.trip.destinationMode === 'idea' &&
        state.trip.regions.length === 0 &&
        state.trip.vibes.length === 0
      ) {
        errors.vibes = 'Elige al menos una zona o un tipo de viaje.';
      }
      break;
    }

    case 'origen': {
      if (state.origin.airports.filter(Boolean).length === 0) {
        errors.airports = 'Dinos desde qué ciudad o aeropuerto sales.';
      }
      break;
    }

    case 'fechas': {
      const { dates } = state;
      if (dates.mode === 'exact' || dates.mode === 'flexible') {
        if (!dates.startDate) errors.startDate = 'Indica la fecha de ida.';
        if (!dates.endDate) errors.endDate = 'Indica la fecha de vuelta.';
        if (dates.startDate && dates.startDate < today()) errors.startDate = 'Esa fecha ya ha pasado.';
        if (dates.startDate && dates.endDate && dates.endDate < dates.startDate) {
          errors.endDate = 'La vuelta no puede ser anterior a la ida.';
        }
      }
      if (dates.mode === 'month' && dates.months.length === 0) {
        errors.months = 'Elige al menos un mes.';
      }
      if ((dates.mode === 'month' || dates.mode === 'cheapest') && (!dates.nights || dates.nights < 1)) {
        errors.nights = 'Dinos cuántas noches quieres.';
      }
      break;
    }

    case 'viajeros': {
      if (state.travelers.adults < 1) errors.adults = 'Tiene que viajar al menos un adulto.';
      const people = state.travelers.adults + state.travelers.childrenAges.length;
      if (state.travelers.rooms > people) {
        errors.rooms = 'No puedes pedir más habitaciones que viajeros.';
      }
      break;
    }

    case 'alojamiento': {
      if (state.stay.types.length === 0) errors.types = 'Elige al menos un tipo de alojamiento.';
      break;
    }

    case 'contacto': {
      if (state.contact.name.trim().length < 2) errors.name = 'Dinos tu nombre.';
      if (!EMAIL_RE.test(state.contact.email.trim())) errors.email = 'Revisa el email: parece incompleto.';
      if (state.contact.channel !== 'email' && !state.contact.phone.trim()) {
        errors.phone = 'Para ese canal necesitamos tu teléfono.';
      }
      if (state.contact.phone.trim() && !PHONE_RE.test(state.contact.phone.trim())) {
        errors.phone = 'Ese teléfono no parece válido.';
      }
      if (!state.contact.privacyAccepted) {
        errors.privacyAccepted = 'Necesitamos tu consentimiento para poder tratar tus datos.';
      }
      break;
    }

    default:
      break;
  }

  return errors;
}

/** Pasos completados, para la barra de progreso. */
export function completedSteps(state: WizardState): Set<StepId> {
  const done = new Set<StepId>();
  for (const step of steps) {
    if (step.id === 'resumen') continue;
    if (Object.keys(validateStep(step.id, state)).length === 0) done.add(step.id);
  }
  return done;
}
