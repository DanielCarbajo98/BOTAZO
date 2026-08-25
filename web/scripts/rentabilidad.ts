/**
 * Modelo de rentabilidad de la tarifa.
 *
 *   npm run analiza:precios
 *   npm run analiza:precios -- --conversion 0.45 --horas 120
 *
 * Usa `calculateFee` de la propia aplicación, así que siempre refleja lo que
 * hay configurado en `src/config/site.ts`. Si cambias las tarifas, vuelve a
 * ejecutarlo y verás al momento qué le pasa al euro por hora.
 *
 * La idea que sostiene todo el cálculo: cada reserva cerrada arrastra el
 * trabajo de los presupuestos que NO se cerraron. Con una conversión del 33 %,
 * cada venta lleva detrás tres búsquedas completas.
 */
import { calculateFee, feeTierLabel } from '../src/lib/estimator';
import { pricing } from '../src/config/site';
import type { Brief } from '../src/lib/brief';

const arg = (name: string, fallback: number): number => {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : fallback;
};

/** Presupuestos que acaban en reserva. Ajústalo con tus datos reales. */
const CONVERSION = arg('conversion', 0.33);
/** Horas de trabajo facturable al mes. */
const HOURS_PER_MONTH = arg('horas', 110);
/** Gastos fijos mensuales (cuota, gestoría, hosting). */
const FIXED_COSTS = arg('gastos', 400);
/** Parte del viaje que deja comisión de proveedor (hotel, seguro, actividades). */
const COMMISSIONABLE_SHARE = 0.35;
const COMMISSION_RATE = pricing.supplierCommissionMax / 100;

type Scenario = {
  name: string;
  adults: number;
  childrenAges: number[];
  infants: number;
  longHaul: boolean;
  nights: number;
  /** Importe total del viaje, para estimar la comisión de proveedor. */
  tripValue: number;
  /** Horas de búsqueda por presupuesto y de gestión por reserva cerrada. */
  quoteHours: number;
  mgmtHours: number;
  /** Peso de este perfil en la cartera de clientes. */
  weight: number;
};

const scenarios: Scenario[] = [
  { name: 'Solo, escapada', adults: 1, childrenAges: [], infants: 0, longHaul: false, nights: 4, tripValue: 420, quoteHours: 1.0, mgmtHours: 0.7, weight: 0.1 },
  { name: 'Pareja, escapada', adults: 2, childrenAges: [], infants: 0, longHaul: false, nights: 4, tripValue: 760, quoteHours: 1.2, mgmtHours: 0.8, weight: 0.3 },
  { name: 'Familia 2+2, escapada', adults: 2, childrenAges: [6, 9], infants: 0, longHaul: false, nights: 5, tripValue: 1450, quoteHours: 1.6, mgmtHours: 1.0, weight: 0.2 },
  { name: 'Pareja, gran viaje', adults: 2, childrenAges: [], infants: 0, longHaul: true, nights: 12, tripValue: 3300, quoteHours: 2.8, mgmtHours: 1.8, weight: 0.15 },
  { name: 'Familia 2+2, gran viaje', adults: 2, childrenAges: [6, 9], infants: 0, longHaul: true, nights: 12, tripValue: 5400, quoteHours: 3.4, mgmtHours: 2.2, weight: 0.15 },
  { name: 'Grupo de 10, escapada', adults: 10, childrenAges: [], infants: 0, longHaul: false, nights: 4, tripValue: 3900, quoteHours: 2.4, mgmtHours: 2.0, weight: 0.1 },
];

function briefFor(scenario: Scenario): Brief {
  return {
    trip: {
      destinationMode: 'known',
      destinations: [scenario.longHaul ? 'Tailandia' : 'Roma'],
      regions: [],
      vibes: [],
    },
    origin: { airports: ['MAD'], nearbyOk: false },
    dates: { mode: 'cheapest', nights: scenario.nights, months: [] },
    travelers: {
      adults: scenario.adults,
      childrenAges: scenario.childrenAges,
      infants: scenario.infants,
      rooms: Math.max(1, Math.ceil((scenario.adults + scenario.childrenAges.length) / 2)),
    },
    flights: { stops: 'one', baggage: 'cabin', cabin: 'economy', preferences: [], separateTicketsOk: false },
    stay: { types: ['hotel3'], board: 'any', location: 'any', mustHaves: [] },
    extras: { services: [], interests: [] },
    budget: { priority: 'balanced', hardLimit: false },
    contact: {
      name: 'modelo',
      email: 'modelo@example.com',
      channel: 'email',
      priority: false,
      marketingOptIn: false,
      privacyAccepted: true,
    },
  } as Brief;
}

const euro = (value: number) => `${Math.round(value)} €`;
const padr = (value: string, width: number) => value.padEnd(width);
const padl = (value: string | number, width: number) => String(value).padStart(width);

console.log(
  `\nConversión ${(CONVERSION * 100).toFixed(0)} % · comisión efectiva ${(COMMISSIONABLE_SHARE * COMMISSION_RATE * 100).toFixed(1)} % del viaje\n`,
);
console.log(
  padr('Perfil de cliente', 26),
  padl('tarifa', 9),
  padl('comisión', 10),
  padl('h/reserva', 11),
  padl('€/hora', 9),
  '  tramo',
);
console.log('-'.repeat(84));

let weightedRevenue = 0;
let weightedHours = 0;

for (const scenario of scenarios) {
  const brief = briefFor(scenario);
  const fee = calculateFee(brief);
  const commission = scenario.tripValue * COMMISSIONABLE_SHARE * COMMISSION_RATE;
  // Los presupuestos que no se cierran también consumen horas.
  const hours = scenario.quoteHours / CONVERSION + scenario.mgmtHours;
  const perHour = (fee + commission) / hours;

  weightedRevenue += (fee + commission) * scenario.weight;
  weightedHours += hours * scenario.weight;

  console.log(
    padr(scenario.name, 26),
    padl(euro(fee), 9),
    padl(euro(commission), 10),
    padl(hours.toFixed(1), 11),
    padl(perHour.toFixed(1), 9),
    '  ' + feeTierLabel(brief),
  );
}

const blended = weightedRevenue / weightedHours;
const monthly = blended * HOURS_PER_MONTH - FIXED_COSTS;

console.log('-'.repeat(84));
console.log(`Media ponderada: ${blended.toFixed(1)} €/hora`);
console.log(
  `Con ${HOURS_PER_MONTH} h/mes y ${euro(FIXED_COSTS)} de gastos fijos: ${euro(monthly)} netos al mes (antes de impuestos)`,
);

if (blended < 18) {
  console.log('\n⚠️  Por debajo de 18 €/hora el negocio no paga tu tiempo. Sube la tarifa o mejora la conversión.');
} else if (blended < 25) {
  console.log('\nℹ️  Zona de arranque: funciona, pero depende de que mantengas el volumen.');
} else {
  console.log('\n✅ Margen sano para un operador solo.');
}
