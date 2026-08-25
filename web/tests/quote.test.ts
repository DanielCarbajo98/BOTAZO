import { describe, expect, it } from 'vitest';
import { optionSaving, optionTotal, parseFlight, parseLines, parseStay, quoteInputSchema } from '@/lib/quote';

const prices = {
  price_flights: 300,
  price_stay: 250,
  price_transfers: 40,
  price_activities: 60,
  price_other: 0,
  price_fee: 38,
};

describe('cálculo de una opción', () => {
  it('suma todas las partidas', () => {
    expect(optionTotal(prices)).toBe(688);
  });

  it('calcula el ahorro contra la referencia de mercado', () => {
    expect(optionSaving({ ...prices, market_reference: 900 })).toBe(212);
  });

  it('nunca muestra un ahorro negativo ni inventado', () => {
    expect(optionSaving({ ...prices, market_reference: 500 })).toBe(0);
    expect(optionSaving({ ...prices, market_reference: null })).toBe(0);
  });
});

describe('lectura del contenido guardado', () => {
  it('devuelve null con JSON inválido en vez de reventar', () => {
    expect(parseFlight('{no es json')).toBeNull();
    expect(parseStay('{no es json')).toBeNull();
    expect(parseLines('{no es json')).toEqual([]);
    expect(parseFlight(null)).toBeNull();
  });

  it('lee un vuelo bien formado', () => {
    const flight = parseFlight(
      JSON.stringify({ legs: [{ direction: 'ida', from: 'MAD', to: 'FCO', stops: 0 }], baggage: 'cabina' }),
    );
    expect(flight?.legs[0]?.from).toBe('MAD');
    expect(flight?.baggage).toBe('cabina');
  });
});

describe('quoteInputSchema', () => {
  const base = {
    title: 'Roma en abril',
    options: [{ name: 'Equilibrada', angle: 'balanced' }],
  };

  it('acepta lo mínimo imprescindible y rellena el resto', () => {
    const result = quoteInputSchema.safeParse(base);
    expect(result.success).toBe(true);
    expect(result.data?.options[0]?.priceFee).toBe(0);
    expect(result.data?.options[0]?.recommended).toBe(false);
  });

  it('exige título y al menos una opción', () => {
    expect(quoteInputSchema.safeParse({ ...base, title: '' }).success).toBe(false);
    expect(quoteInputSchema.safeParse({ ...base, options: [] }).success).toBe(false);
  });

  it('no acepta más de cuatro opciones ni precios negativos', () => {
    expect(quoteInputSchema.safeParse({ ...base, options: Array(5).fill(base.options[0]) }).success).toBe(false);
    expect(
      quoteInputSchema.safeParse({ ...base, options: [{ ...base.options[0], priceFlights: -5 }] }).success,
    ).toBe(false);
  });
});
