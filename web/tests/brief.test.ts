import { describe, expect, it } from 'vitest';
import { briefSchema, nightsFromBrief, travelerCount } from '@/lib/brief';
import { makeBrief, futureDate } from './factories';

const parse = (brief: unknown) => briefSchema.safeParse(brief);

describe('briefSchema', () => {
  it('acepta un brief correcto', () => {
    expect(parse(makeBrief()).success).toBe(true);
  });

  it('exige destino cuando el cliente dice saber a dónde va', () => {
    const result = parse(makeBrief({ trip: { destinationMode: 'known', destinations: [], regions: [], vibes: [] } }));
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes('destinations'))).toBe(true);
  });

  it('exige zona o tipo de viaje cuando solo tiene una idea', () => {
    const result = parse(makeBrief({ trip: { destinationMode: 'idea', destinations: [], regions: [], vibes: [] } }));
    expect(result.success).toBe(false);
  });

  it('no acepta que la vuelta sea anterior a la ida', () => {
    const result = parse(
      makeBrief({ dates: { mode: 'exact', startDate: futureDate(30), endDate: futureDate(20), months: [] } }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes('endDate'))).toBe(true);
  });

  it('rechaza fechas pasadas', () => {
    const result = parse(
      makeBrief({ dates: { mode: 'exact', startDate: futureDate(-10), endDate: futureDate(-5), months: [] } }),
    );
    expect(result.success).toBe(false);
  });

  it('exige noches cuando la fecha es "lo más barato"', () => {
    const result = parse(makeBrief({ dates: { mode: 'cheapest', months: [] } }));
    expect(result.success).toBe(false);
  });

  it('no permite más habitaciones que viajeros', () => {
    const result = parse(makeBrief({ travelers: { adults: 1, childrenAges: [], infants: 0, rooms: 3 } }));
    expect(result.success).toBe(false);
  });

  it('no permite combinar "sin alojamiento" con un hotel', () => {
    const result = parse(makeBrief({ stay: { types: ['ninguno', 'hotel4'], board: 'any', location: 'any', mustHaves: [] } }));
    expect(result.success).toBe(false);
  });

  it('exige teléfono si el canal preferido no es el email', () => {
    const result = parse(
      makeBrief({
        contact: {
          name: 'Ana',
          email: 'ana@example.com',
          channel: 'whatsapp',
          marketingOptIn: false,
          privacyAccepted: true,
        },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('exige el consentimiento de privacidad', () => {
    const result = parse(
      makeBrief({
        contact: {
          name: 'Ana',
          email: 'ana@example.com',
          channel: 'email',
          marketingOptIn: false,
          // @ts-expect-error comprobamos justo el caso que el tipo prohíbe
          privacyAccepted: false,
        },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rechaza emails mal formados', () => {
    const result = parse(
      makeBrief({
        contact: {
          name: 'Ana',
          email: 'no-es-un-email',
          channel: 'email',
          marketingOptIn: false,
          privacyAccepted: true,
        },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('recorta los espacios del nombre y del destino', () => {
    const result = parse(
      makeBrief({
        trip: { destinationMode: 'known', destinations: ['  Roma  '], regions: [], vibes: [] },
      }),
    );
    expect(result.success).toBe(true);
    expect(result.data?.trip.destinations[0]).toBe('Roma');
  });
});

describe('helpers del brief', () => {
  it('calcula las noches a partir de las fechas', () => {
    const brief = makeBrief({ dates: { mode: 'exact', startDate: futureDate(10), endDate: futureDate(15), months: [] } });
    expect(nightsFromBrief(brief.dates)).toBe(5);
  });

  it('usa las noches explícitas cuando no hay fechas', () => {
    const brief = makeBrief({ dates: { mode: 'cheapest', nights: 7, months: [] } });
    expect(nightsFromBrief(brief.dates)).toBe(7);
  });

  it('cuenta viajeros facturables sin contar bebés', () => {
    const counts = travelerCount({ adults: 2, childrenAges: [5, 9], infants: 1, rooms: 2 });
    expect(counts.billable).toBe(4);
    expect(counts.total).toBe(5);
  });
});
