import { z } from 'zod';
import { pricing } from '@/config/site';
import type { QuoteOptionRow, QuoteRow } from '@/lib/repository';

/* ------------------------------------------------------------------ *
 * Contenido de una opción de presupuesto
 * ------------------------------------------------------------------ */

/**
 * Enlace de reserva (normalmente de afiliación).
 *
 * Solo aceptamos http y https: un `javascript:` o un `data:` en un enlace que
 * luego pintamos en la página del cliente sería una inyección de manual.
 */
export const bookingUrlSchema = z
  .string()
  .trim()
  .max(600)
  .refine((value) => value === '' || /^https?:\/\//i.test(value), 'El enlace debe empezar por http:// o https://');

/** Segunda barrera, en el momento de pintar. */
export function isSafeUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Dominio legible, para que el cliente vea a dónde va antes de pulsar. */
export function urlHost(value: string): string {
  try {
    return new URL(value).host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export const flightLegSchema = z.object({
  direction: z.enum(['ida', 'vuelta']),
  from: z.string().trim().max(80).default(''),
  to: z.string().trim().max(80).default(''),
  date: z.string().trim().max(40).default(''),
  depart: z.string().trim().max(20).default(''),
  arrive: z.string().trim().max(20).default(''),
  airline: z.string().trim().max(60).default(''),
  stops: z.number().int().min(0).max(4).default(0),
  duration: z.string().trim().max(30).default(''),
  note: z.string().trim().max(200).optional(),
});

export const quoteFlightSchema = z.object({
  legs: z.array(flightLegSchema).max(8).default([]),
  baggage: z.string().trim().max(160).default(''),
  bookingNote: z.string().trim().max(300).optional(),
  /** Dónde tiene que reservar el cliente este vuelo. */
  bookingUrl: bookingUrlSchema.optional(),
  /** Con quién reserva: aerolínea, buscador, agencia… */
  bookingWhere: z.string().trim().max(80).optional(),
  /** Si esa reserva nos genera comisión. Se lo decimos al cliente. */
  commission: z.boolean().default(false),
});

export const quoteStaySchema = z.object({
  name: z.string().trim().max(120).default(''),
  category: z.string().trim().max(60).default(''),
  area: z.string().trim().max(120).default(''),
  board: z.string().trim().max(60).default(''),
  nights: z.number().int().min(0).max(90).default(0),
  rating: z.string().trim().max(40).optional(),
  cancellation: z.string().trim().max(160).optional(),
  note: z.string().trim().max(300).optional(),
  bookingUrl: bookingUrlSchema.optional(),
  bookingWhere: z.string().trim().max(80).optional(),
  commission: z.boolean().default(false),
});

export const quoteLineSchema = z.object({
  name: z.string().trim().max(120).default(''),
  detail: z.string().trim().max(300).optional(),
  bookingUrl: bookingUrlSchema.optional(),
  commission: z.boolean().default(false),
});

export type QuoteFlight = z.infer<typeof quoteFlightSchema>;
export type QuoteStay = z.infer<typeof quoteStaySchema>;
export type QuoteLine = z.infer<typeof quoteLineSchema>;

export const optionAngles = [
  { id: 'cheapest', label: 'Mínima', description: 'Lo más barato que hemos encontrado' },
  { id: 'balanced', label: 'Equilibrada', description: 'El mejor precio sin sufrir' },
  { id: 'comfort', label: 'Cómoda', description: 'Pagando algo más, viajas mejor' },
] as const;

export type OptionAngle = (typeof optionAngles)[number]['id'];

/** Suma de todas las partidas de una opción. */
export function optionTotal(option: Pick<
  QuoteOptionRow,
  'price_flights' | 'price_stay' | 'price_transfers' | 'price_activities' | 'price_other' | 'price_fee'
>): number {
  return (
    option.price_flights +
    option.price_stay +
    option.price_transfers +
    option.price_activities +
    option.price_other +
    option.price_fee
  );
}

/** Ahorro frente a la referencia de mercado que haya anotado el agente. */
export function optionSaving(option: Pick<QuoteOptionRow, 'market_reference'> & Parameters<typeof optionTotal>[0]): number {
  if (!option.market_reference) return 0;
  return Math.max(0, Math.round(option.market_reference - optionTotal(option)));
}

export function parseFlight(json: string | null): QuoteFlight | null {
  if (!json) return null;
  const parsed = quoteFlightSchema.safeParse(safeJson(json));
  return parsed.success ? parsed.data : null;
}

export function parseStay(json: string | null): QuoteStay | null {
  if (!json) return null;
  const parsed = quoteStaySchema.safeParse(safeJson(json));
  return parsed.success ? parsed.data : null;
}

export function parseLines(json: string | null): QuoteLine[] {
  if (!json) return [];
  const parsed = z.array(quoteLineSchema).max(20).safeParse(safeJson(json));
  return parsed.success ? parsed.data : [];
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Entrada del formulario del backoffice
 * ------------------------------------------------------------------ */

export const quoteOptionInputSchema = z.object({
  name: z.string().trim().min(1, 'Ponle nombre a la opción').max(80),
  angle: z.enum(['cheapest', 'balanced', 'comfort']),
  summary: z.string().trim().max(400).default(''),
  recommended: z.boolean().default(false),
  flight: quoteFlightSchema.optional(),
  stay: quoteStaySchema.optional(),
  transfers: z.array(quoteLineSchema).max(10).default([]),
  activities: z.array(quoteLineSchema).max(20).default([]),
  priceFlights: z.number().min(0).max(1_000_000).default(0),
  priceStay: z.number().min(0).max(1_000_000).default(0),
  priceTransfers: z.number().min(0).max(1_000_000).default(0),
  priceActivities: z.number().min(0).max(1_000_000).default(0),
  priceOther: z.number().min(0).max(1_000_000).default(0),
  priceFee: z.number().min(0).max(100_000).default(0),
  marketReference: z.number().min(0).max(1_000_000).nullable().default(null),
  notes: z.string().trim().max(600).default(''),
});

export const quoteInputSchema = z.object({
  title: z.string().trim().min(1, 'El presupuesto necesita un título').max(120),
  message: z.string().trim().max(2000).default(''),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  /** Lo que cuesta desbloquear los detalles. 0 = plan abierto. */
  unlockFee: z.number().min(0).max(10_000).default(0),
  options: z.array(quoteOptionInputSchema).min(1, 'Añade al menos una opción').max(4),
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type QuoteOptionInput = z.infer<typeof quoteOptionInputSchema>;

/* ------------------------------------------------------------------ *
 * Muro de pago
 * ------------------------------------------------------------------ */

/**
 * Oculta lo que el cliente todavía no ha pagado.
 *
 * El criterio: **se ve la forma del viaje, nunca su identidad.** Sabe si es
 * directo o con escala, cuánto dura, qué categoría de hotel y en qué zona, y
 * cuánto cuesta todo — suficiente para decidir si le compensa. No sabe qué
 * aerolínea, a qué hora, qué hotel ni dónde reservarlo, que es exactamente el
 * trabajo por el que paga.
 *
 * Esto se aplica **en el servidor**. Los datos ocultos no llegan al navegador,
 * así que no basta con mirar el código fuente para saltárselo.
 */
export function redactOption(option: QuoteOptionRow, unlocked: boolean): QuoteOptionRow {
  if (unlocked) return option;

  const flight = parseFlight(option.flight_json);
  const stay = parseStay(option.stay_json);

  const redactedFlight: QuoteFlight | null = flight
    ? {
        legs: flight.legs.map((leg) => ({
          direction: leg.direction,
          from: leg.from,
          to: leg.to,
          stops: leg.stops,
          duration: leg.duration,
          // La fecha exacta, la hora y la compañía son parte de lo que se paga.
          date: '',
          depart: '',
          arrive: '',
          airline: '',
        })),
        baggage: flight.baggage,
        commission: false,
      }
    : null;

  const redactedStay: QuoteStay | null = stay
    ? {
        name: '',
        category: stay.category,
        area: stay.area,
        board: stay.board,
        nights: stay.nights,
        rating: stay.rating,
        cancellation: stay.cancellation,
        commission: false,
      }
    : null;

  const stripLinks = (json: string | null): string | null => {
    const lines = parseLines(json);
    if (lines.length === 0) return null;
    return JSON.stringify(lines.map((line) => ({ name: line.name, detail: line.detail, commission: false })));
  };

  return {
    ...option,
    flight_json: redactedFlight ? JSON.stringify(redactedFlight) : null,
    stay_json: redactedStay ? JSON.stringify(redactedStay) : null,
    transfers_json: stripLinks(option.transfers_json),
    activities_json: stripLinks(option.activities_json),
    // Las notas suelen delatar la compañía o el hotel.
    notes: null,
  };
}

/** ¿Puede el cliente ver los detalles completos de este plan? */
export function isUnlocked(quote: Pick<QuoteRow, 'unlock_fee' | 'unlock_status'>): boolean {
  // Un plan devuelto se cierra otra vez, aunque en su día estuviera pagado.
  if (quote.unlock_status === 'reembolsado') return false;
  if (quote.unlock_status === 'pagado' || quote.unlock_status === 'exento') return true;
  return quote.unlock_fee <= 0;
}

export type RefundEligibility =
  | { eligible: true; hoursLeft: number }
  | { eligible: false; reason: 'no-pagado' | 'fuera-de-plazo' | 'ya-usado' | 'ya-devuelto' };

/**
 * Si toca devolver el dinero o no. Dos criterios, los dos comprobables:
 * el plazo y si ha llegado a pulsar algún enlace de reserva.
 */
export function refundEligibility(
  quote: Pick<QuoteRow, 'unlock_status' | 'paid_at'>,
  clickCount: number,
  nowMs = Date.now(),
): RefundEligibility {
  if (quote.unlock_status === 'reembolsado') return { eligible: false, reason: 'ya-devuelto' };
  if (quote.unlock_status !== 'pagado' || !quote.paid_at) return { eligible: false, reason: 'no-pagado' };
  if (pricing.refund.voidOnClick && clickCount > 0) return { eligible: false, reason: 'ya-usado' };

  const elapsedHours = (nowMs - Date.parse(quote.paid_at)) / 3_600_000;
  if (!Number.isFinite(elapsedHours) || elapsedHours > pricing.refund.hours) {
    return { eligible: false, reason: 'fuera-de-plazo' };
  }
  return { eligible: true, hoursLeft: Math.max(0, Math.ceil(pricing.refund.hours - elapsedHours)) };
}
