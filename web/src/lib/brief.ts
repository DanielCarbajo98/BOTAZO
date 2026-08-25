import { z } from 'zod';
import type { RegionId, VibeId } from '@/lib/catalog';

/* ------------------------------------------------------------------ *
 * Uniones del dominio
 * ------------------------------------------------------------------ */

export type DestinationMode = 'known' | 'idea' | 'surprise';
export type DateMode = 'exact' | 'flexible' | 'month' | 'cheapest';
export type StopsPref = 'direct' | 'one' | 'any';
export type BaggagePref = 'personal' | 'cabin' | 'checked' | 'checked-plus';
export type CabinClass = 'economy' | 'premium' | 'business';
export type StayType =
  | 'ninguno'
  | 'hostel'
  | 'apartamento'
  | 'hotel3'
  | 'hotel4'
  | 'hotel5'
  | 'boutique'
  | 'resort'
  | 'rural';
export type BoardPref = 'any' | 'room-only' | 'breakfast' | 'half' | 'full' | 'all-inclusive';
export type StayLocation = 'any' | 'center' | 'beachfront' | 'quiet' | 'transport';
export type Priority = 'cheapest' | 'balanced' | 'comfort';
export type ContactChannel = 'whatsapp' | 'email' | 'phone';

/* ------------------------------------------------------------------ *
 * Catálogos para la interfaz (el id debe coincidir con el enum Zod)
 * ------------------------------------------------------------------ */

export const destinationModes: { id: DestinationMode; label: string; emoji: string; description: string }[] = [
  {
    id: 'known',
    label: 'Sé exactamente a dónde quiero ir',
    emoji: '📍',
    description: 'Tienes el destino (o varios) en la cabeza. Nosotros lo buscamos al mejor precio.',
  },
  {
    id: 'idea',
    label: 'Tengo una idea, pero no lo tengo claro',
    emoji: '💭',
    description: 'Sabes qué tipo de viaje te apetece o la zona. Te proponemos las opciones más baratas que encajan.',
  },
  {
    id: 'surprise',
    label: 'Me da igual el destino: quiero lo más barato',
    emoji: '🎲',
    description: 'Dinos desde dónde sales y cuánto quieres gastar. Buscamos a dónde se vuela barato esos días.',
  },
];

export const dateModes: { id: DateMode; label: string; emoji: string; description: string; savings?: string }[] = [
  { id: 'exact', label: 'Fechas exactas', emoji: '🗓️', description: 'No puedo moverme ni un día.' },
  {
    id: 'flexible',
    label: 'Fechas aproximadas',
    emoji: '↔️',
    description: 'Puedo mover la salida y la vuelta unos días.',
    savings: 'Suele ahorrar bastante',
  },
  {
    id: 'month',
    label: 'Un mes concreto',
    emoji: '📆',
    description: 'Sé el mes y cuántas noches, pero no los días.',
    savings: 'Suele ahorrar mucho',
  },
  {
    id: 'cheapest',
    label: 'Cuando salga más barato',
    emoji: '💸',
    description: 'Ajustamos las fechas al mejor precio del año.',
    savings: 'Máximo ahorro',
  },
];

export const stopsOptions: { id: StopsPref; label: string; description: string; emoji: string }[] = [
  { id: 'direct', label: 'Solo vuelos directos', description: 'Sin escalas, aunque cueste algo más.', emoji: '➡️' },
  { id: 'one', label: 'Acepto una escala', description: 'Si la escala es cómoda y el ahorro merece la pena.', emoji: '🔁' },
  { id: 'any', label: 'Me da igual si ahorro', description: 'Escalas largas, madrugones, lo que sea por el mejor precio.', emoji: '🛬' },
];

export const baggageOptions: { id: BaggagePref; label: string; description: string; emoji: string }[] = [
  { id: 'personal', label: 'Solo mochila pequeña', description: 'Debajo del asiento. La tarifa más barata.', emoji: '🎒' },
  { id: 'cabin', label: 'Maleta de cabina', description: 'Trolley en el compartimento superior.', emoji: '🧳' },
  { id: 'checked', label: 'Una maleta facturada', description: 'Hasta 20-23 kg en bodega.', emoji: '📦' },
  { id: 'checked-plus', label: 'Varias maletas facturadas', description: 'Viaje largo o con equipo especial.', emoji: '🛅' },
];

export const cabinOptions: { id: CabinClass; label: string; emoji: string }[] = [
  { id: 'economy', label: 'Turista', emoji: '💺' },
  { id: 'premium', label: 'Turista premium', emoji: '✨' },
  { id: 'business', label: 'Business', emoji: '🥂' },
];

export const flightPreferences: { id: string; label: string; hint: string }[] = [
  { id: 'no-madrugones', label: 'Nada de salir antes de las 7:00', hint: 'Evitamos los vuelos de madrugada.' },
  { id: 'no-llegada-noche', label: 'No llegar de madrugada', hint: 'Llegar a destino a hora decente.' },
  { id: 'escala-corta', label: 'Escalas cortas (< 3 h)', hint: 'Nada de esperas eternas.' },
  { id: 'no-low-cost', label: 'Prefiero compañías tradicionales', hint: 'Sin Ryanair/Wizz salvo que el ahorro sea enorme.' },
  { id: 'asientos-juntos', label: 'Queremos ir sentados juntos', hint: 'Reservamos asiento para el grupo.' },
  { id: 'sin-cambio-aeropuerto', label: 'Sin cambiar de aeropuerto en escala', hint: 'Nada de aterrizar en uno y salir de otro.' },
  { id: 'flexible-cancelacion', label: 'Que se pueda cambiar o cancelar', hint: 'Tarifas flexibles aunque cuesten más.' },
];

export const stayTypes: { id: StayType; label: string; description: string; emoji: string }[] = [
  { id: 'hostel', label: 'Hostel / albergue', description: 'Lo más económico, ambiente joven.', emoji: '🛏️' },
  { id: 'apartamento', label: 'Apartamento', description: 'Cocina propia y más espacio.', emoji: '🏠' },
  { id: 'hotel3', label: 'Hotel 3★', description: 'Correcto, limpio y bien situado.', emoji: '🏨' },
  { id: 'hotel4', label: 'Hotel 4★', description: 'El punto dulce calidad/precio.', emoji: '🌟' },
  { id: 'hotel5', label: 'Hotel 5★', description: 'Alta gama, sin restricciones.', emoji: '💎' },
  { id: 'boutique', label: 'Boutique / con encanto', description: 'Pequeño, con personalidad.', emoji: '🕯️' },
  { id: 'resort', label: 'Resort', description: 'Complejo con piscinas y servicios.', emoji: '🏖️' },
  { id: 'rural', label: 'Casa rural / cabaña', description: 'Naturaleza y tranquilidad.', emoji: '🌲' },
  { id: 'ninguno', label: 'No necesito alojamiento', description: 'Solo quiero los vuelos.', emoji: '✈️' },
];

export const boardOptions: { id: BoardPref; label: string }[] = [
  { id: 'any', label: 'Lo que salga más barato' },
  { id: 'room-only', label: 'Solo alojamiento' },
  { id: 'breakfast', label: 'Con desayuno' },
  { id: 'half', label: 'Media pensión' },
  { id: 'full', label: 'Pensión completa' },
  { id: 'all-inclusive', label: 'Todo incluido' },
];

export const stayLocations: { id: StayLocation; label: string; description: string }[] = [
  { id: 'any', label: 'Donde salga mejor de precio', description: 'Buscamos el equilibrio entre precio y transporte.' },
  { id: 'center', label: 'En pleno centro', description: 'Todo a pie.' },
  { id: 'beachfront', label: 'A pie de playa', description: 'Primera línea o muy cerca.' },
  { id: 'quiet', label: 'Zona tranquila', description: 'Lejos del ruido nocturno.' },
  { id: 'transport', label: 'Junto al metro/transporte', description: 'Bien conectado aunque no sea céntrico.' },
];

export const stayMustHaves: { id: string; label: string }[] = [
  { id: 'cancelacion-gratis', label: 'Cancelación gratuita' },
  { id: 'wifi', label: 'Wifi bueno' },
  { id: 'piscina', label: 'Piscina' },
  { id: 'aire', label: 'Aire acondicionado' },
  { id: 'desayuno', label: 'Desayuno incluido' },
  { id: 'parking', label: 'Parking' },
  { id: 'cocina', label: 'Cocina' },
  { id: 'lavadora', label: 'Lavadora' },
  { id: 'gimnasio', label: 'Gimnasio' },
  { id: 'spa', label: 'Spa' },
  { id: 'accesible', label: 'Accesible / sin escaleras' },
  { id: 'mascotas', label: 'Admite mascotas' },
  { id: 'solo-adultos', label: 'Solo adultos' },
  { id: 'familiar', label: 'Habitación familiar' },
];

export const extraServices: { id: string; label: string; description: string; emoji: string }[] = [
  { id: 'traslados', label: 'Traslados aeropuerto', description: 'Privado o compartido, ida y vuelta.', emoji: '🚐' },
  { id: 'coche', label: 'Coche de alquiler', description: 'Comparamos con seguro incluido y sin franquicia.', emoji: '🚗' },
  { id: 'actividades', label: 'Excursiones y actividades', description: 'Entradas, tours y experiencias.', emoji: '🎟️' },
  { id: 'seguro', label: 'Seguro de viaje', description: 'Médico, cancelación y equipaje.', emoji: '🛡️' },
  { id: 'esim', label: 'eSIM / datos móviles', description: 'Internet en destino sin roaming.', emoji: '📶' },
  { id: 'parking-origen', label: 'Parking en el aeropuerto de salida', description: 'Dejar el coche los días del viaje.', emoji: '🅿️' },
  { id: 'tren-origen', label: 'Tren o bus hasta el aeropuerto', description: 'Si sales de otra ciudad.', emoji: '🚆' },
  { id: 'restaurantes', label: 'Reservas de restaurantes', description: 'Sitios buenos y no turísticos.', emoji: '🍴' },
  { id: 'itinerario', label: 'Itinerario día a día', description: 'Plan detallado para no perder tiempo.', emoji: '🗺️' },
];

export const priorities: { id: Priority; label: string; description: string; emoji: string }[] = [
  { id: 'cheapest', label: 'Precio por encima de todo', description: 'Aguanto escalas, madrugones y hoteles sencillos.', emoji: '💸' },
  { id: 'balanced', label: 'Equilibrio', description: 'Barato, pero sin sufrir. La opción que elige casi todo el mundo.', emoji: '⚖️' },
  { id: 'comfort', label: 'Comodidad', description: 'Prefiero pagar más y viajar cómodo.', emoji: '🛋️' },
];

export const contactChannels: { id: ContactChannel; label: string; emoji: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { id: 'email', label: 'Email', emoji: '✉️' },
  { id: 'phone', label: 'Llamada', emoji: '📞' },
];

/* ------------------------------------------------------------------ *
 * Esquema de validación
 * ------------------------------------------------------------------ */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha no válido')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Fecha inexistente');

const isoMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato de mes no válido');

const regionEnum = z.enum([
  'espana',
  'europa-occidental',
  'europa-este',
  'europa-norte',
  'islas',
  'norte-africa',
  'oriente-medio',
  'asia',
  'norteamerica',
  'centroamerica-caribe',
  'sudamerica',
  'africa-subsahariana',
  'oceania',
]) satisfies z.ZodType<RegionId>;

const vibeEnum = z.enum([
  'playa',
  'ciudad',
  'naturaleza',
  'cultura',
  'fiesta',
  'nieve',
  'gastronomia',
  'romantico',
  'familia',
  'aventura',
  'relax',
  'exotico',
]) satisfies z.ZodType<VibeId>;

const tagList = (max: number) => z.array(z.string().min(1).max(48)).max(max).default([]);

export const briefSchema = z
  .object({
    trip: z.object({
      destinationMode: z.enum(['known', 'idea', 'surprise']),
      destinations: z.array(z.string().trim().min(2).max(80)).max(5).default([]),
      regions: z.array(regionEnum).max(8).default([]),
      vibes: z.array(vibeEnum).max(8).default([]),
      maxFlightHours: z.number().int().min(1).max(30).optional(),
      avoid: z.string().trim().max(400).optional(),
    }),

    origin: z.object({
      airports: z.array(z.string().trim().min(2).max(60)).min(1, 'Dinos desde dónde sales').max(4),
      nearbyOk: z.boolean().default(false),
      maxDriveMinutes: z.number().int().min(0).max(600).optional(),
    }),

    dates: z.object({
      mode: z.enum(['exact', 'flexible', 'month', 'cheapest']),
      startDate: isoDate.optional(),
      endDate: isoDate.optional(),
      flexDays: z.number().int().min(1).max(14).optional(),
      months: z.array(isoMonth).max(6).default([]),
      nights: z.number().int().min(1).max(60).optional(),
      nightsFlex: z.number().int().min(0).max(10).optional(),
      notes: z.string().trim().max(400).optional(),
    }),

    travelers: z.object({
      adults: z.number().int().min(1, 'Al menos un adulto').max(20),
      childrenAges: z.array(z.number().int().min(2).max(17)).max(10).default([]),
      infants: z.number().int().min(0).max(6).default(0),
      rooms: z.number().int().min(1).max(10).default(1),
      mobilityNeeds: z.string().trim().max(300).optional(),
    }),

    flights: z.object({
      stops: z.enum(['direct', 'one', 'any']),
      baggage: z.enum(['personal', 'cabin', 'checked', 'checked-plus']),
      cabin: z.enum(['economy', 'premium', 'business']).default('economy'),
      preferences: tagList(12),
      separateTicketsOk: z.boolean().default(false),
      notes: z.string().trim().max(400).optional(),
    }),

    stay: z.object({
      types: z.array(
        z.enum(['ninguno', 'hostel', 'apartamento', 'hotel3', 'hotel4', 'hotel5', 'boutique', 'resort', 'rural']),
      ).min(1, 'Elige al menos un tipo de alojamiento').max(5),
      board: z.enum(['any', 'room-only', 'breakfast', 'half', 'full', 'all-inclusive']).default('any'),
      location: z.enum(['any', 'center', 'beachfront', 'quiet', 'transport']).default('any'),
      mustHaves: tagList(14),
      minRating: z.number().min(0).max(10).optional(),
      notes: z.string().trim().max(400).optional(),
    }),

    extras: z.object({
      services: tagList(12),
      interests: z.array(vibeEnum).max(8).default([]),
      notes: z.string().trim().max(600).optional(),
    }),

    budget: z.object({
      perPerson: z.number().int().min(0).max(50_000).optional(),
      priority: z.enum(['cheapest', 'balanced', 'comfort']),
      hardLimit: z.boolean().default(false),
    }),

    contact: z.object({
      name: z.string().trim().min(2, 'Dinos tu nombre').max(80),
      email: z.email('Revisa el email').max(160),
      phone: z
        .string()
        .trim()
        .max(30)
        .refine((v) => v === '' || /^[+0-9 ()-]{7,}$/.test(v), 'Revisa el teléfono')
        .optional(),
      channel: z.enum(['whatsapp', 'email', 'phone']).default('whatsapp'),
      bestTime: z.string().trim().max(80).optional(),
      /** Servicio prioritario de pago: respuesta rápida y más rondas de cambios. */
      priority: z.boolean().default(false),
      marketingOptIn: z.boolean().default(false),
      privacyAccepted: z.literal(true, { message: 'Necesitamos tu consentimiento para tratar tus datos' }),
    }),
  })
  .superRefine((data, ctx) => {
    const { trip, dates, stay, travelers } = data;

    if (trip.destinationMode === 'known' && trip.destinations.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['trip', 'destinations'], message: 'Añade al menos un destino' });
    }
    if (trip.destinationMode === 'idea' && trip.regions.length === 0 && trip.vibes.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['trip', 'vibes'], message: 'Elige una zona o un tipo de viaje' });
    }

    if (dates.mode === 'exact' || dates.mode === 'flexible') {
      if (!dates.startDate) {
        ctx.addIssue({ code: 'custom', path: ['dates', 'startDate'], message: 'Indica la fecha de ida' });
      }
      if (!dates.endDate) {
        ctx.addIssue({ code: 'custom', path: ['dates', 'endDate'], message: 'Indica la fecha de vuelta' });
      }
      if (dates.startDate && dates.endDate && dates.endDate < dates.startDate) {
        ctx.addIssue({ code: 'custom', path: ['dates', 'endDate'], message: 'La vuelta no puede ser antes de la ida' });
      }
      if (dates.startDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(`${dates.startDate}T00:00:00`) < today) {
          ctx.addIssue({ code: 'custom', path: ['dates', 'startDate'], message: 'La fecha de ida ya ha pasado' });
        }
      }
    }

    if (dates.mode === 'month') {
      if (dates.months.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['dates', 'months'], message: 'Elige al menos un mes' });
      }
      if (!dates.nights) {
        ctx.addIssue({ code: 'custom', path: ['dates', 'nights'], message: 'Dinos cuántas noches quieres' });
      }
    }

    if (dates.mode === 'cheapest' && !dates.nights) {
      ctx.addIssue({ code: 'custom', path: ['dates', 'nights'], message: 'Dinos cuántas noches quieres' });
    }

    if (stay.types.includes('ninguno') && stay.types.length > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['stay', 'types'],
        message: 'Si no necesitas alojamiento no puedes elegir además un tipo de hotel',
      });
    }

    if (travelers.rooms > travelers.adults + travelers.childrenAges.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['travelers', 'rooms'],
        message: 'No puedes pedir más habitaciones que viajeros',
      });
    }

    if (data.contact.channel !== 'email' && !data.contact.phone) {
      ctx.addIssue({
        code: 'custom',
        path: ['contact', 'phone'],
        message: 'Para contactarte por ese canal necesitamos tu teléfono',
      });
    }
  });

export type Brief = z.infer<typeof briefSchema>;
/** Estado del wizard: igual que Brief pero con todo opcional mientras se rellena. */
export type BriefDraft = z.input<typeof briefSchema>;

/** Número de noches deducido del brief, con un valor razonable por defecto. */
export function nightsFromBrief(dates: Brief['dates']): number {
  if (dates.nights) return dates.nights;
  if (dates.startDate && dates.endDate) {
    const ms = Date.parse(`${dates.endDate}T00:00:00`) - Date.parse(`${dates.startDate}T00:00:00`);
    const nights = Math.round(ms / 86_400_000);
    if (nights > 0) return nights;
  }
  return 4;
}

export function travelerCount(travelers: Brief['travelers']): {
  adults: number;
  children: number;
  infants: number;
  billable: number;
  total: number;
} {
  const children = travelers.childrenAges.length;
  return {
    adults: travelers.adults,
    children,
    infants: travelers.infants,
    billable: travelers.adults + children,
    total: travelers.adults + children + travelers.infants,
  };
}
