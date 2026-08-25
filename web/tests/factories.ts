import type { Brief } from '@/lib/brief';

/** Brief mínimo y válido, con puntos de extensión para cada test. */
export function makeBrief(overrides: Partial<Brief> = {}): Brief {
  const base: Brief = {
    trip: {
      destinationMode: 'known',
      destinations: ['Roma'],
      regions: [],
      vibes: [],
    },
    origin: { airports: ['MAD'], nearbyOk: false },
    dates: {
      mode: 'exact',
      startDate: futureDate(90),
      endDate: futureDate(94),
      months: [],
    },
    travelers: { adults: 2, childrenAges: [], infants: 0, rooms: 1 },
    flights: {
      stops: 'one',
      baggage: 'cabin',
      cabin: 'economy',
      preferences: [],
      separateTicketsOk: false,
    },
    stay: { types: ['hotel3'], board: 'any', location: 'any', mustHaves: [] },
    extras: { services: [], interests: [] },
    budget: { priority: 'balanced', hardLimit: false },
    contact: {
      name: 'Ana',
      email: 'ana@example.com',
      channel: 'email',
      priority: false,
      marketingOptIn: false,
      privacyAccepted: true,
    },
  };

  return { ...base, ...overrides } as Brief;
}

export function futureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}
