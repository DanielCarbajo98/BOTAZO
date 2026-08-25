import { describe, expect, it } from 'vitest';
import {
  bookingUrlSchema,
  isSafeUrl,
  optionSaving,
  optionTotal,
  parseFlight,
  parseLines,
  parseStay,
  isUnlocked,
  quoteInputSchema,
  redactOption,
  urlHost,
} from '@/lib/quote';

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

describe('enlaces de reserva', () => {
  it('acepta http y https', () => {
    expect(bookingUrlSchema.safeParse('https://www.booking.com/x?aid=123').success).toBe(true);
    expect(bookingUrlSchema.safeParse('http://ejemplo.com').success).toBe(true);
    expect(bookingUrlSchema.safeParse('').success).toBe(true);
  });

  it('rechaza esquemas peligrosos', () => {
    for (const value of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd', 'ftp://x.com']) {
      expect(bookingUrlSchema.safeParse(value).success).toBe(false);
    }
  });

  it('isSafeUrl es la segunda barrera al pintar', () => {
    expect(isSafeUrl('https://civitatis.com/a')).toBe(true);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('no es una url')).toBe(false);
    expect(isSafeUrl(null)).toBe(false);
    expect(isSafeUrl(undefined)).toBe(false);
  });

  it('muestra el dominio sin www para que el cliente sepa a dónde va', () => {
    expect(urlHost('https://www.booking.com/hotel/es/x.html?aid=9')).toBe('booking.com');
    expect(urlHost('https://civitatis.com/es/roma')).toBe('civitatis.com');
    expect(urlHost('roto')).toBe('');
  });

  it('el enlace y la marca de comisión sobreviven al guardado', () => {
    const parsed = quoteInputSchema.safeParse({
      title: 'Roma',
      options: [
        {
          name: 'Equilibrada',
          angle: 'balanced',
          stay: { name: 'Hotel X', bookingUrl: 'https://booking.com/x?aid=1', commission: true },
          activities: [{ name: 'Coliseo', bookingUrl: 'https://civitatis.com/x', commission: true }],
        },
      ],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.options[0]?.stay?.bookingUrl).toBe('https://booking.com/x?aid=1');
    expect(parsed.data?.options[0]?.activities[0]?.commission).toBe(true);
  });
});

describe('muro de pago', () => {
  const option = {
    id: 'o1',
    quote_id: 'q1',
    position: 0,
    name: 'Equilibrada',
    angle: 'balanced' as const,
    summary: 'Directo y hotel céntrico',
    recommended: 1,
    flight_json: JSON.stringify({
      legs: [
        {
          direction: 'ida',
          from: 'Madrid MAD',
          to: 'Roma FCO',
          date: '2026-11-01',
          depart: '10:40',
          arrive: '13:20',
          airline: 'Iberia',
          stops: 0,
          duration: '2 h 40',
          note: 'Terminal 4',
        },
      ],
      baggage: 'Cabina 10 kg',
      bookingNote: 'Reservar en la web de Iberia',
      bookingUrl: 'https://www.iberia.com/?aff=alisio',
      bookingWhere: 'Iberia',
      commission: true,
    }),
    stay_json: JSON.stringify({
      name: 'Hotel del Corso',
      category: 'Hotel 3★',
      area: 'Centro histórico',
      board: 'Desayuno',
      nights: 4,
      rating: '8,7',
      cancellation: 'Gratis hasta 24 h antes',
      note: 'Pedir habitación interior',
      bookingUrl: 'https://booking.com/x?aid=1',
      bookingWhere: 'Booking',
      commission: true,
    }),
    transfers_json: JSON.stringify([{ name: 'Leonardo Express', detail: 'Ida y vuelta', bookingUrl: 'https://omio.es/x', commission: true }]),
    activities_json: JSON.stringify([{ name: 'Coliseo sin cola', bookingUrl: 'https://civitatis.com/x', commission: true }]),
    price_flights: 318,
    price_stay: 344,
    price_transfers: 44,
    price_activities: 96,
    price_other: 0,
    price_fee: 38,
    market_reference: 1110,
    notes: 'El vuelo de Iberia sale de la T4',
  };

  it('bloqueado: no se escapa ni la aerolínea, ni el hotel, ni un solo enlace', () => {
    const serialized = JSON.stringify(redactOption(option, false));
    for (const secret of ['Iberia', 'Hotel del Corso', 'iberia.com', 'booking.com', 'omio.es', 'civitatis.com', '10:40', '2026-11-01', 'T4', 'Terminal 4']) {
      expect(serialized, `se ha filtrado "${secret}"`).not.toContain(secret);
    }
  });

  it('bloqueado: sí se ve lo necesario para decidir', () => {
    const masked = redactOption(option, false);
    const flight = parseFlight(masked.flight_json);
    const stay = parseStay(masked.stay_json);

    expect(flight?.legs[0]?.stops).toBe(0);
    expect(flight?.legs[0]?.duration).toBe('2 h 40');
    expect(flight?.baggage).toBe('Cabina 10 kg');
    expect(stay?.category).toBe('Hotel 3★');
    expect(stay?.area).toBe('Centro histórico');
    expect(stay?.cancellation).toContain('Gratis');
    expect(stay?.name).toBe('');
    // El precio nunca se oculta: es lo que tiene que valorar.
    expect(masked.price_flights).toBe(318);
    expect(masked.market_reference).toBe(1110);
  });

  it('desbloqueado: se devuelve tal cual, sin tocar nada', () => {
    expect(redactOption(option, true)).toBe(option);
  });

  it('no revienta con una opción vacía', () => {
    const empty = { ...option, flight_json: null, stay_json: null, transfers_json: null, activities_json: null };
    expect(() => redactOption(empty, false)).not.toThrow();
    expect(redactOption(empty, false).flight_json).toBeNull();
  });

  it('isUnlocked: gratis o pagado abren, pendiente con precio no', () => {
    expect(isUnlocked({ unlock_fee: 0, unlock_status: 'pendiente' })).toBe(true);
    expect(isUnlocked({ unlock_fee: 38, unlock_status: 'pagado' })).toBe(true);
    expect(isUnlocked({ unlock_fee: 38, unlock_status: 'exento' })).toBe(true);
    expect(isUnlocked({ unlock_fee: 38, unlock_status: 'pendiente' })).toBe(false);
  });
});
