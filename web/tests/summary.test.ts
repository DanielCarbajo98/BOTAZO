import { describe, expect, it } from 'vitest';
import { datesSummary, destinationSummary, monthLabel, originSummary, travelersSummary } from '@/lib/summary';
import { findDestination, suggestDestinations } from '@/lib/catalog';
import { makeBrief, futureDate } from './factories';

describe('resúmenes', () => {
  it('describe un destino concreto', () => {
    expect(destinationSummary(makeBrief())).toBe('Roma');
  });

  it('describe una idea por zona', () => {
    const summary = destinationSummary(
      makeBrief({ trip: { destinationMode: 'idea', destinations: [], regions: ['asia'], vibes: [] } }),
    );
    expect(summary).toContain('Asia');
  });

  it('describe el destino abierto', () => {
    expect(
      destinationSummary(makeBrief({ trip: { destinationMode: 'surprise', destinations: [], regions: [], vibes: [] } })),
    ).toContain('abierto');
  });

  it('describe fechas exactas con las noches', () => {
    const summary = datesSummary(
      makeBrief({ dates: { mode: 'exact', startDate: futureDate(30), endDate: futureDate(34), months: [] } }),
    );
    expect(summary).toContain('4 noches');
  });

  it('describe fechas flexibles con el margen', () => {
    const summary = datesSummary(
      makeBrief({ dates: { mode: 'flexible', startDate: futureDate(30), endDate: futureDate(33), flexDays: 5, months: [] } }),
    );
    expect(summary).toContain('±5');
  });

  it('describe los meses elegidos', () => {
    const summary = datesSummary(makeBrief({ dates: { mode: 'month', months: ['2026-09'], nights: 6 } }));
    expect(summary).toContain('Septiembre');
    expect(summary).toContain('6 noches');
  });

  it('cuenta viajeros en singular y plural', () => {
    expect(travelersSummary(makeBrief({ travelers: { adults: 1, childrenAges: [], infants: 0, rooms: 1 } }))).toBe('1 adulto');
    expect(
      travelersSummary(makeBrief({ travelers: { adults: 2, childrenAges: [6], infants: 1, rooms: 1 } })),
    ).toBe('2 adultos, 1 niño, 1 bebé');
  });

  it('marca cuando se aceptan aeropuertos cercanos', () => {
    expect(originSummary(makeBrief({ origin: { airports: ['MAD'], nearbyOk: true } }))).toContain('cercanos');
  });

  it('formatea el mes en español', () => {
    expect(monthLabel('2026-01')).toBe('Enero de 2026');
  });
});

describe('catálogo', () => {
  it('encuentra destinos ignorando tildes y mayúsculas', () => {
    expect(findDestination('MALAGA')).toBeUndefined();
    expect(findDestination('napoles')?.slug).toBe('napoles');
    expect(findDestination('Nápoles')?.slug).toBe('napoles');
  });

  it('sugiere por prefijo del nombre antes que por país', () => {
    const suggestions = suggestDestinations('lis', 3);
    expect(suggestions[0]?.slug).toBe('lisboa');
  });

  it('no devuelve nada raro con una búsqueda sin coincidencias', () => {
    expect(suggestDestinations('zzzzzz')).toEqual([]);
  });
});
