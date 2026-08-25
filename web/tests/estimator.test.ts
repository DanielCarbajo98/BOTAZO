import { describe, expect, it } from 'vitest';
import { calculateFee, estimate, resolveBaseline } from '@/lib/estimator';
import { pricing } from '@/config/site';
import { feeTiers } from '@/config/fees';
import { makeBrief, futureDate } from './factories';

describe('estimate', () => {
  it('devuelve una horquilla coherente alrededor del total', () => {
    const result = estimate(makeBrief());
    expect(result.low).toBeLessThan(result.total);
    expect(result.high).toBeGreaterThan(result.total);
    expect(result.total).toBe(
      result.breakdown.flights +
        result.breakdown.stay +
        result.breakdown.transfers +
        result.breakdown.extras +
        result.breakdown.fee,
    );
  });

  it('la flexibilidad de fechas abarata el viaje', () => {
    const rigid = estimate(makeBrief({ dates: { mode: 'exact', startDate: futureDate(90), endDate: futureDate(94), months: [] } }));
    const flexible = estimate(
      makeBrief({ dates: { mode: 'cheapest', nights: 4, nightsFlex: 2, months: [] } }),
    );
    expect(flexible.breakdown.flights).toBeLessThan(rigid.breakdown.flights);
  });

  it('exigir vuelo directo encarece frente a aceptar cualquier escala', () => {
    const direct = estimate(
      makeBrief({ flights: { stops: 'direct', baggage: 'cabin', cabin: 'economy', preferences: [], separateTicketsOk: false } }),
    );
    const any = estimate(
      makeBrief({ flights: { stops: 'any', baggage: 'cabin', cabin: 'economy', preferences: [], separateTicketsOk: false } }),
    );
    expect(direct.breakdown.flights).toBeGreaterThan(any.breakdown.flights);
  });

  it('más equipaje sube el precio del vuelo', () => {
    const light = estimate(
      makeBrief({ flights: { stops: 'one', baggage: 'personal', cabin: 'economy', preferences: [], separateTicketsOk: false } }),
    );
    const heavy = estimate(
      makeBrief({ flights: { stops: 'one', baggage: 'checked-plus', cabin: 'economy', preferences: [], separateTicketsOk: false } }),
    );
    expect(heavy.breakdown.flights).toBeGreaterThan(light.breakdown.flights);
  });

  it('un hotel de 5 estrellas cuesta más que un hostel', () => {
    const hostel = estimate(makeBrief({ stay: { types: ['hostel'], board: 'any', location: 'any', mustHaves: [] } }));
    const luxury = estimate(makeBrief({ stay: { types: ['hotel5'], board: 'any', location: 'any', mustHaves: [] } }));
    expect(luxury.breakdown.stay).toBeGreaterThan(hostel.breakdown.stay * 2);
  });

  it('no cobra alojamiento si el cliente solo quiere vuelos', () => {
    const result = estimate(makeBrief({ stay: { types: ['ninguno'], board: 'any', location: 'any', mustHaves: [] } }));
    expect(result.breakdown.stay).toBe(0);
  });

  it('reservar con poca antelación sale más caro', () => {
    const soon = estimate(makeBrief({ dates: { mode: 'exact', startDate: futureDate(5), endDate: futureDate(9), months: [] } }));
    const planned = estimate(makeBrief({ dates: { mode: 'exact', startDate: futureDate(120), endDate: futureDate(124), months: [] } }));
    expect(soon.breakdown.flights).toBeGreaterThan(planned.breakdown.flights);
  });

  it('marca confianza baja cuando el destino está abierto', () => {
    const result = estimate(
      makeBrief({
        trip: { destinationMode: 'surprise', destinations: [], regions: [], vibes: ['playa'] },
        dates: { mode: 'cheapest', nights: 4, months: [] },
      }),
    );
    expect(result.confidence).toBe('baja');
  });

  it('nunca propone un ahorro negativo', () => {
    const result = estimate(makeBrief({ budget: { priority: 'comfort', hardLimit: false } }));
    expect(result.estimatedSaving).toBeGreaterThanOrEqual(0);
  });
});

describe('resolveBaseline', () => {
  it('reconoce destinos del catálogo escritos con otra grafía', () => {
    expect(resolveBaseline(makeBrief({ trip: { destinationMode: 'known', destinations: ['roma'], regions: [], vibes: [] } })).destination?.slug).toBe('roma');
  });

  it('cae en la región cuando el destino no está en el catálogo', () => {
    const baseline = resolveBaseline(
      makeBrief({ trip: { destinationMode: 'known', destinations: ['Un pueblo inventado'], regions: ['asia'], vibes: [] } }),
    );
    expect(baseline.destination).toBeUndefined();
    expect(baseline.band).toBe('ultralargo');
  });
});

describe('calculateFee', () => {
  it('aplica tarifa de escapada a un viaje corto en Europa', () => {
    expect(calculateFee(makeBrief())).toBe(feeTiers.escapada.feePerPerson * 2);
  });

  it('aplica tarifa de gran viaje a larga distancia', () => {
    const fee = calculateFee(
      makeBrief({ trip: { destinationMode: 'known', destinations: ['Tailandia'], regions: [], vibes: [] } }),
    );
    expect(fee).toBe(feeTiers.granViaje.feePerPerson * 2);
  });

  it('cobra más por un viaje de más de 6 noches aunque sea cerca', () => {
    const largo = calculateFee(
      makeBrief({ dates: { mode: 'cheapest', nights: 10, months: [] } }),
    );
    expect(largo).toBe(feeTiers.granViaje.feePerPerson * 2);
  });

  it('respeta el mínimo por reserva de quien viaja solo', () => {
    const solo = calculateFee(makeBrief({ travelers: { adults: 1, childrenAges: [], infants: 0, rooms: 1 } }));
    // Una persona sola da el mismo trabajo que una pareja: por eso hay suelo.
    expect(solo).toBe(feeTiers.escapada.minPerBooking);
    expect(solo).toBeGreaterThan(feeTiers.escapada.feePerPerson);
  });

  it('aplica también el mínimo en gran viaje', () => {
    const solo = calculateFee(
      makeBrief({
        trip: { destinationMode: 'known', destinations: ['Tailandia'], regions: [], vibes: [] },
        travelers: { adults: 1, childrenAges: [], infants: 0, rooms: 1 },
      }),
    );
    expect(solo).toBe(feeTiers.granViaje.minPerBooking);
  });

  it('cobra media tarifa por los niños pequeños', () => {
    const withKid = calculateFee(makeBrief({ travelers: { adults: 2, childrenAges: [4], infants: 0, rooms: 1 } }));
    expect(withKid).toBe(Math.round(feeTiers.escapada.feePerPerson * 2.5));
  });

  it('cobra tarifa completa a partir de la edad límite', () => {
    const teen = calculateFee(
      makeBrief({ travelers: { adults: 2, childrenAges: [pricing.childAgeLimit], infants: 0, rooms: 2 } }),
    );
    expect(teen).toBe(feeTiers.escapada.feePerPerson * 3);
  });

  it('no cobra nada por los bebés en brazos', () => {
    const conBebe = calculateFee(makeBrief({ travelers: { adults: 2, childrenAges: [], infants: 2, rooms: 1 } }));
    expect(conBebe).toBe(calculateFee(makeBrief()));
  });

  it('descuenta en grupos grandes y respeta el tope', () => {
    const group = calculateFee(makeBrief({ travelers: { adults: 12, childrenAges: [], infants: 0, rooms: 6 } }));
    expect(group).toBeLessThan(feeTiers.escapada.feePerPerson * 12);
    expect(group).toBeLessThanOrEqual(pricing.feeCap);

    // El tope se comprueba con un gran viaje, que es donde la tarifa llega a él
    // en cualquiera de las dos escalas (asesor y agencia).
    const huge = calculateFee(
      makeBrief({
        trip: { destinationMode: 'known', destinations: ['Tailandia'], regions: [], vibes: [] },
        travelers: { adults: 20, childrenAges: [], infants: 0, rooms: 10 },
      }),
    );
    expect(huge).toBe(pricing.feeCap);
  });

  it('nunca baja del mínimo ni supera el tope, sea cual sea el grupo', () => {
    for (let adults = 1; adults <= 20; adults += 1) {
      const fee = calculateFee(makeBrief({ travelers: { adults, childrenAges: [], infants: 0, rooms: 1 } }));
      expect(fee).toBeGreaterThanOrEqual(feeTiers.escapada.minPerBooking);
      expect(fee).toBeLessThanOrEqual(pricing.feeCap);
    }
  });

  it('la tarifa entra en el total estimado', () => {
    const brief = makeBrief();
    expect(estimate(brief).breakdown.fee).toBe(calculateFee(brief));
  });
});
