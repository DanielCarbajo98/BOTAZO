/**
 * Crea una solicitud y una propuesta de ejemplo para poder ver el producto
 * funcionando antes de tener tráfico real.
 *
 *   npm run db:demo
 *
 * Se niega a ejecutarse si ya hay solicitudes: nunca debe mezclarse con datos
 * de clientes reales.
 */
import { Repository } from '../src/lib/repository';
import { getDb } from '../src/lib/db';
import { estimate } from '../src/lib/estimator';
import { site } from '../src/config/site';
import type { Brief } from '../src/lib/brief';

const repo = new Repository(getDb());

if (repo.listRequests({ limit: 1 }).length > 0) {
  console.error('Ya hay solicitudes en la base de datos. No se añaden datos de ejemplo.');
  console.error('Si quieres verlo en limpio, usa otra ruta: DATABASE_PATH=data/demo.db npm run db:demo');
  process.exit(1);
}

const inDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const brief: Brief = {
  trip: { destinationMode: 'known', destinations: ['Roma'], regions: [], vibes: [] },
  origin: { airports: ['MAD', 'BCN'], nearbyOk: true, maxDriveMinutes: 120 },
  dates: { mode: 'flexible', startDate: inDays(68), endDate: inDays(72), flexDays: 3, months: [] },
  travelers: { adults: 2, childrenAges: [], infants: 0, rooms: 1 },
  flights: {
    stops: 'one',
    baggage: 'cabin',
    cabin: 'economy',
    preferences: ['no-madrugones'],
    separateTicketsOk: true,
  },
  stay: {
    types: ['hotel3', 'apartamento'],
    board: 'breakfast',
    location: 'center',
    mustHaves: ['cancelacion-gratis', 'wifi'],
  },
  extras: { services: ['traslados', 'actividades', 'seguro'], interests: ['gastronomia', 'cultura'] },
  budget: { perPerson: 450, priority: 'balanced', hardLimit: false },
  contact: {
    name: 'Ana García',
    email: 'ana.demo@example.com',
    phone: '+34600111222',
    channel: 'whatsapp',
    priority: false,
    marketingOptIn: true,
    privacyAccepted: true,
  },
} as Brief;

const { request, accessToken } = repo.createRequest({ brief, estimate: estimate(brief), source: 'demo' });
repo.updateStatus(request.id, 'en_estudio', 'demo');
repo.updateInternalNotes(
  request.id,
  'Sale más barato desde BCN con Vueling. Hotel del Corso con cancelación gratis, revisar precio en 2 semanas.',
);

const quote = repo.createQuote(request.id, {
  title: 'Roma · 4 noches · 2 personas',
  message:
    'Ana, he mirado las tres semanas alrededor de tus fechas. Saliendo el jueves en lugar del viernes el vuelo baja 62 € por persona, y el hotel del centro sale mejor que el apartamento con desayuno incluido.\n\nTe recomiendo la equilibrada: vuelo directo a hora decente y hotel a diez minutos andando del Panteón.',
  validUntil: inDays(5),
});

const flight = (airline: string, stops: number, depart: string, arrive: string, url: string) =>
  JSON.stringify({
    legs: [
      {
        direction: 'ida',
        from: 'Madrid MAD',
        to: 'Roma FCO',
        date: inDays(68),
        depart,
        arrive,
        airline,
        stops,
        duration: stops === 0 ? '2 h 40' : '5 h 15',
      },
      {
        direction: 'vuelta',
        from: 'Roma FCO',
        to: 'Madrid MAD',
        date: inDays(72),
        depart: '18:20',
        arrive: '21:10',
        airline,
        stops,
        duration: stops === 0 ? '2 h 50' : '6 h 05',
      },
    ],
    baggage: 'Maleta de cabina 10 kg incluida para los dos',
    bookingUrl: url,
    bookingWhere: airline,
    commission: false,
  });

const stay = (name: string, category: string, area: string, cancel: string, url: string, commission: boolean) =>
  JSON.stringify({
    name,
    category,
    area,
    board: 'Desayuno incluido',
    nights: 4,
    rating: '8,7 en Booking',
    cancellation: cancel,
    bookingUrl: url,
    bookingWhere: 'Booking',
    commission,
  });

const lines = (items: { name: string; detail?: string; bookingUrl?: string; commission?: boolean }[]) =>
  JSON.stringify(items);

repo.replaceOptions(quote.id, [
  {
    position: 0,
    name: 'Mínima',
    angle: 'cheapest',
    summary: 'Una escala de 2 h a la ida y hostel muy bien situado. Lo más barato que he encontrado.',
    recommended: 0,
    flight_json: flight('Ryanair', 1, '09:05', '14:20', 'https://www.ryanair.com/'),
    stay_json: stay(
      'The RomeHello',
      'Hostel · habitación doble privada',
      'Barrio Monti, 12 min al Coliseo',
      'Cancelación gratis hasta 3 días antes',
      'https://www.booking.com/',
      true,
    ),
    transfers_json: null,
    activities_json: lines([
      { name: 'Coliseo y Foro, entrada sin cola', detail: '2 personas', bookingUrl: 'https://www.civitatis.com/es/roma/', commission: true },
    ]),
    price_flights: 196,
    price_stay: 268,
    price_transfers: 0,
    price_activities: 42,
    price_other: 0,
    price_fee: 58,
    market_reference: 720,
    notes: 'La escala es en Milán y son 2 h justas. Si el primer vuelo se retrasa, el segundo no espera.',
  },
  {
    position: 1,
    name: 'Equilibrada',
    angle: 'balanced',
    summary: 'Vuelo directo a hora decente y hotel 3★ a diez minutos andando del Panteón.',
    recommended: 1,
    flight_json: flight('Iberia', 0, '10:40', '13:20', 'https://www.iberia.com/'),
    stay_json: stay(
      'Hotel del Corso',
      'Hotel 3★',
      'Centro histórico, 10 min al Panteón',
      'Cancelación gratis hasta 24 h antes',
      'https://www.booking.com/',
      true,
    ),
    transfers_json: lines([
      { name: 'Leonardo Express, aeropuerto ↔ Termini', detail: 'Ida y vuelta, 2 personas', bookingUrl: 'https://www.omio.es/', commission: true },
    ]),
    activities_json: lines([
      { name: 'Coliseo y Foro, entrada sin cola', detail: '2 personas', bookingUrl: 'https://www.civitatis.com/es/roma/', commission: true },
      { name: 'Tour de comida por Trastevere', detail: 'Nuestra recomendación', bookingUrl: 'https://www.getyourguide.es/', commission: true },
    ]),
    price_flights: 318,
    price_stay: 344,
    price_transfers: 44,
    price_activities: 96,
    price_other: 38,
    price_fee: 58,
    market_reference: 1110,
    notes: 'El hotel admite cancelación gratuita hasta 24 h antes, así que podemos seguir vigilando el precio.',
  },
  {
    position: 2,
    name: 'Cómoda',
    angle: 'comfort',
    summary: 'Directo, hotel 4★ con terraza y traslado privado puerta a puerta.',
    recommended: 0,
    flight_json: flight('Iberia', 0, '12:15', '14:55', 'https://www.iberia.com/'),
    stay_json: stay(
      'Hotel Navona Palace',
      'Hotel 4★',
      'A 3 min de Piazza Navona',
      'Cancelación gratis hasta 48 h antes',
      'https://www.booking.com/',
      true,
    ),
    transfers_json: lines([
      { name: 'Traslado privado ida y vuelta', detail: 'Conductor esperando en llegadas', bookingUrl: 'https://welcomepickups.com/', commission: true },
    ]),
    activities_json: lines([
      { name: 'Vaticano y Capilla Sixtina, acceso temprano', detail: '2 personas', bookingUrl: 'https://www.civitatis.com/es/roma/', commission: true },
      { name: 'Tour de comida por Trastevere', bookingUrl: 'https://www.getyourguide.es/', commission: true },
    ]),
    price_flights: 356,
    price_stay: 612,
    price_transfers: 96,
    price_activities: 148,
    price_other: 38,
    price_fee: 58,
    market_reference: 1580,
    notes: 'Seguro de viaje con cancelación incluido en «otros».',
  },
]);

repo.sendQuote(quote.id, 'demo');

console.log(`Solicitud de ejemplo creada: ${request.reference}`);
console.log(`Enlace del cliente:  ${site.url}/presupuesto/${request.reference}?t=${accessToken}`);
console.log(`Panel:               ${site.url}/admin/solicitudes/${request.id}`);
