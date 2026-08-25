import { z } from 'zod';
import type { QuoteOptionRow } from '@/lib/repository';

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
  options: z.array(quoteOptionInputSchema).min(1, 'Añade al menos una opción').max(4),
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type QuoteOptionInput = z.infer<typeof quoteOptionInputSchema>;
