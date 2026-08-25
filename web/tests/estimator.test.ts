import { describe, expect, it } from 'vitest';
import { calculateFee, estimate, resolveBaseline } from '@/lib/estimator';
import { pricing } from '@/config/site';
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
    expect(calculateFee(makeBrief())).toBe(pricing.escapada.feePerPerson * 2);
  });

  it('aplica tarifa de gran viaje a larga distancia', () => {
    const fee = calculateFee(
      makeBrief({ trip: { destinationMode: 'known', destinations: ['Tailandia'], regions: [], vibes: [] } }),
    );
    expect(fee).toBe(pricing.granViaje.feePerPerson * 2);
  });

  it('no cobra tarifa por los niños pequeños', () => {
    const withKid = calculateFee(
      makeBrief({ travelers: { adults: 2, childrenAges: [4], infants: 0, rooms: 1 } }),
    );
    expect(withKid).toBe(pricing.escapada.feePerPerson * 2);
  });

  it('descuenta en grupos grandes y respeta el tope', () => {
    const group = calculateFee(makeBrief({ travelers: { adults: 12, childrenAges: [], infants: 0, rooms: 6 } }));
    expect(group).toBeLessThan(pricing.escapada.feePerPerson * 12);
    expect(group).toBeLessThanOrEqual(pricing.feeCap);
  });
});
