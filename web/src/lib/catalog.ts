/**
 * Catálogos del dominio: aeropuertos de salida, regiones, "vibes" y destinos
 * con precios base. Todo esto alimenta el wizard y el estimador orientativo.
 *
 * Los precios base son medianas observadas de vuelo ida y vuelta desde España
 * en temporada media, con compañía low cost y equipaje de mano. Se usan
 * ÚNICAMENTE para dar una horquilla orientativa al cliente, nunca como precio
 * de venta.
 */

export type RegionId =
  | 'espana'
  | 'europa-occidental'
  | 'europa-este'
  | 'europa-norte'
  | 'islas'
  | 'norte-africa'
  | 'oriente-medio'
  | 'asia'
  | 'norteamerica'
  | 'centroamerica-caribe'
  | 'sudamerica'
  | 'africa-subsahariana'
  | 'oceania';

export type VibeId =
  | 'playa'
  | 'ciudad'
  | 'naturaleza'
  | 'cultura'
  | 'fiesta'
  | 'nieve'
  | 'gastronomia'
  | 'romantico'
  | 'familia'
  | 'aventura'
  | 'relax'
  | 'exotico';

export type DistanceBand = 'corto' | 'medio' | 'largo' | 'ultralargo';

export const regions: { id: RegionId; label: string; emoji: string }[] = [
  { id: 'espana', label: 'España', emoji: '🇪🇸' },
  { id: 'europa-occidental', label: 'Europa occidental', emoji: '🇪🇺' },
  { id: 'europa-este', label: 'Europa del este', emoji: '🏰' },
  { id: 'europa-norte', label: 'Europa del norte', emoji: '🌲' },
  { id: 'islas', label: 'Islas (Canarias, Baleares, Madeira…)', emoji: '🏝️' },
  { id: 'norte-africa', label: 'Norte de África', emoji: '🕌' },
  { id: 'oriente-medio', label: 'Oriente Medio', emoji: '🐫' },
  { id: 'asia', label: 'Asia', emoji: '🏯' },
  { id: 'norteamerica', label: 'Norteamérica', emoji: '🗽' },
  { id: 'centroamerica-caribe', label: 'Caribe y Centroamérica', emoji: '🌴' },
  { id: 'sudamerica', label: 'Sudamérica', emoji: '🦙' },
  { id: 'africa-subsahariana', label: 'África subsahariana', emoji: '🦁' },
  { id: 'oceania', label: 'Oceanía', emoji: '🦘' },
];

export const vibes: { id: VibeId; label: string; emoji: string; hint: string }[] = [
  { id: 'playa', label: 'Playa y mar', emoji: '🏖️', hint: 'Costa, calas, snorkel' },
  { id: 'ciudad', label: 'Ciudad', emoji: '🏙️', hint: 'Museos, barrios, terrazas' },
  { id: 'naturaleza', label: 'Naturaleza', emoji: '🌄', hint: 'Rutas, parques, paisajes' },
  { id: 'cultura', label: 'Historia y cultura', emoji: '🏛️', hint: 'Patrimonio y monumentos' },
  { id: 'fiesta', label: 'Fiesta', emoji: '🎉', hint: 'Vida nocturna y festivales' },
  { id: 'nieve', label: 'Nieve y esquí', emoji: '🎿', hint: 'Estaciones y montaña' },
  { id: 'gastronomia', label: 'Gastronomía', emoji: '🍽️', hint: 'Comer muy bien' },
  { id: 'romantico', label: 'Romántico', emoji: '💞', hint: 'Escapada en pareja' },
  { id: 'familia', label: 'Con niños', emoji: '👨‍👩‍👧', hint: 'Planes para toda la familia' },
  { id: 'aventura', label: 'Aventura', emoji: '🧗', hint: 'Adrenalina y deporte' },
  { id: 'relax', label: 'Desconexión', emoji: '🧘', hint: 'Spa, ritmo lento' },
  { id: 'exotico', label: 'Exótico y lejano', emoji: '🌏', hint: 'Algo muy distinto' },
];

export type OriginAirport = {
  iata: string;
  city: string;
  name: string;
  /** Aeropuertos alternativos razonables en coche (< 2 h). */
  nearby?: string[];
  popular?: boolean;
};

export const originAirports: OriginAirport[] = [
  { iata: 'MAD', city: 'Madrid', name: 'Adolfo Suárez Madrid-Barajas', popular: true },
  { iata: 'BCN', city: 'Barcelona', name: 'Josep Tarradellas El Prat', nearby: ['GRO', 'REU'], popular: true },
  { iata: 'AGP', city: 'Málaga', name: 'Costa del Sol', nearby: ['GRX'], popular: true },
  { iata: 'VLC', city: 'Valencia', name: 'Manises', nearby: ['ALC'], popular: true },
  { iata: 'SVQ', city: 'Sevilla', name: 'San Pablo', nearby: ['XRY', 'AGP'], popular: true },
  { iata: 'ALC', city: 'Alicante', name: 'Alicante-Elche', nearby: ['VLC', 'MJV'], popular: true },
  { iata: 'BIO', city: 'Bilbao', name: 'Loiu', nearby: ['SDR', 'EAS', 'VIT'] },
  { iata: 'PMI', city: 'Palma de Mallorca', name: 'Son Sant Joan', popular: true },
  { iata: 'LPA', city: 'Las Palmas', name: 'Gran Canaria' },
  { iata: 'TFN', city: 'Tenerife Norte', name: 'Tenerife Norte-Ciudad de La Laguna', nearby: ['TFS'] },
  { iata: 'TFS', city: 'Tenerife Sur', name: 'Tenerife Sur-Reina Sofía', nearby: ['TFN'] },
  { iata: 'SCQ', city: 'Santiago de Compostela', name: 'Rosalía de Castro', nearby: ['VGO', 'LCG', 'OPO'] },
  { iata: 'VGO', city: 'Vigo', name: 'Peinador', nearby: ['OPO', 'SCQ'] },
  { iata: 'OVD', city: 'Asturias', name: 'Asturias', nearby: ['SDR', 'LEN'] },
  { iata: 'ZAZ', city: 'Zaragoza', name: 'Zaragoza', nearby: ['MAD', 'BCN'] },
  { iata: 'GRX', city: 'Granada', name: 'Federico García Lorca', nearby: ['AGP'] },
  { iata: 'MJV', city: 'Murcia', name: 'Región de Murcia', nearby: ['ALC'] },
  { iata: 'IBZ', city: 'Ibiza', name: 'Ibiza', nearby: ['PMI'] },
  { iata: 'MAH', city: 'Menorca', name: 'Menorca', nearby: ['PMI'] },
  { iata: 'ACE', city: 'Lanzarote', name: 'César Manrique', nearby: ['FUE'] },
  { iata: 'FUE', city: 'Fuerteventura', name: 'Fuerteventura', nearby: ['ACE', 'LPA'] },
  { iata: 'SPC', city: 'La Palma', name: 'La Palma' },
  { iata: 'XRY', city: 'Jerez', name: 'Jerez de la Frontera', nearby: ['SVQ', 'AGP'] },
  { iata: 'LEI', city: 'Almería', name: 'Almería', nearby: ['AGP', 'GRX'] },
  { iata: 'SDR', city: 'Santander', name: 'Seve Ballesteros', nearby: ['BIO', 'OVD'] },
  { iata: 'EAS', city: 'San Sebastián', name: 'San Sebastián', nearby: ['BIO', 'BIQ', 'PNA'] },
  { iata: 'PNA', city: 'Pamplona', name: 'Pamplona', nearby: ['BIO', 'ZAZ'] },
  { iata: 'VIT', city: 'Vitoria', name: 'Foronda', nearby: ['BIO'] },
  { iata: 'LCG', city: 'A Coruña', name: 'Alvedro', nearby: ['SCQ', 'VGO'] },
  { iata: 'VLL', city: 'Valladolid', name: 'Villanubla', nearby: ['MAD'] },
  { iata: 'REU', city: 'Reus', name: 'Reus', nearby: ['BCN'] },
  { iata: 'GRO', city: 'Girona', name: 'Costa Brava', nearby: ['BCN'] },
  { iata: 'OPO', city: 'Oporto (PT)', name: 'Francisco Sá Carneiro', nearby: ['VGO', 'SCQ'] },
  { iata: 'LIS', city: 'Lisboa (PT)', name: 'Humberto Delgado', nearby: ['OPO'] },
  { iata: 'BIQ', city: 'Biarritz (FR)', name: 'Biarritz-Pays Basque', nearby: ['EAS', 'BIO'] },
  { iata: 'TLS', city: 'Toulouse (FR)', name: 'Blagnac', nearby: ['BCN'] },
];

export type DestinationSeed = {
  slug: string;
  name: string;
  country: string;
  region: RegionId;
  band: DistanceBand;
  /** Vuelo ida y vuelta por persona, temporada media, low cost, solo equipaje de mano. */
  flightBase: number;
  /** Hotel 3★ habitación doble por noche, temporada media. */
  hotelNight: number;
  /** Meses (1-12) de temporada alta / baja. */
  peakMonths: number[];
  lowMonths: number[];
  vibes: VibeId[];
  /** Coste típico del traslado aeropuerto-centro ida y vuelta, por persona. */
  transferBase?: number;
};

export const destinations: DestinationSeed[] = [
  // ---- España e islas -------------------------------------------------
  { slug: 'mallorca', name: 'Mallorca', country: 'España', region: 'islas', band: 'corto', flightBase: 70, hotelNight: 95, peakMonths: [7, 8], lowMonths: [11, 12, 1, 2], vibes: ['playa', 'relax', 'familia'], transferBase: 18 },
  { slug: 'ibiza', name: 'Ibiza', country: 'España', region: 'islas', band: 'corto', flightBase: 85, hotelNight: 140, peakMonths: [7, 8], lowMonths: [11, 12, 1, 2, 3], vibes: ['playa', 'fiesta'], transferBase: 18 },
  { slug: 'menorca', name: 'Menorca', country: 'España', region: 'islas', band: 'corto', flightBase: 80, hotelNight: 100, peakMonths: [7, 8], lowMonths: [11, 12, 1, 2, 3], vibes: ['playa', 'relax', 'familia'], transferBase: 16 },
  { slug: 'tenerife', name: 'Tenerife', country: 'España', region: 'islas', band: 'corto', flightBase: 95, hotelNight: 85, peakMonths: [7, 8, 12], lowMonths: [5, 6, 9], vibes: ['playa', 'naturaleza', 'familia'], transferBase: 20 },
  { slug: 'gran-canaria', name: 'Gran Canaria', country: 'España', region: 'islas', band: 'corto', flightBase: 92, hotelNight: 82, peakMonths: [7, 8, 12], lowMonths: [5, 6, 9], vibes: ['playa', 'relax', 'familia'], transferBase: 20 },
  { slug: 'lanzarote', name: 'Lanzarote', country: 'España', region: 'islas', band: 'corto', flightBase: 90, hotelNight: 80, peakMonths: [7, 8, 12], lowMonths: [5, 6, 9], vibes: ['playa', 'naturaleza'], transferBase: 16 },
  { slug: 'fuerteventura', name: 'Fuerteventura', country: 'España', region: 'islas', band: 'corto', flightBase: 88, hotelNight: 78, peakMonths: [7, 8], lowMonths: [5, 6, 9, 11], vibes: ['playa', 'aventura', 'relax'], transferBase: 16 },
  { slug: 'madrid', name: 'Madrid', country: 'España', region: 'espana', band: 'corto', flightBase: 60, hotelNight: 95, peakMonths: [4, 5, 9, 10], lowMonths: [1, 8], vibes: ['ciudad', 'cultura', 'gastronomia'], transferBase: 12 },
  { slug: 'barcelona', name: 'Barcelona', country: 'España', region: 'espana', band: 'corto', flightBase: 62, hotelNight: 115, peakMonths: [6, 7, 9], lowMonths: [1, 2, 11], vibes: ['ciudad', 'playa', 'gastronomia'], transferBase: 12 },
  { slug: 'san-sebastian', name: 'San Sebastián', country: 'España', region: 'espana', band: 'corto', flightBase: 70, hotelNight: 130, peakMonths: [7, 8, 9], lowMonths: [1, 2, 11], vibes: ['gastronomia', 'playa', 'romantico'], transferBase: 12 },
  { slug: 'sierra-nevada', name: 'Sierra Nevada', country: 'España', region: 'espana', band: 'corto', flightBase: 75, hotelNight: 105, peakMonths: [12, 1, 2, 3], lowMonths: [5, 6, 9, 10], vibes: ['nieve', 'aventura'], transferBase: 25 },
  { slug: 'picos-de-europa', name: 'Picos de Europa', country: 'España', region: 'espana', band: 'corto', flightBase: 70, hotelNight: 85, peakMonths: [7, 8], lowMonths: [11, 1, 2], vibes: ['naturaleza', 'aventura', 'relax'], transferBase: 20 },

  // ---- Europa occidental ---------------------------------------------
  { slug: 'lisboa', name: 'Lisboa', country: 'Portugal', region: 'europa-occidental', band: 'corto', flightBase: 75, hotelNight: 95, peakMonths: [6, 7, 8, 9], lowMonths: [1, 2, 11], vibes: ['ciudad', 'gastronomia', 'romantico'], transferBase: 10 },
  { slug: 'oporto', name: 'Oporto', country: 'Portugal', region: 'europa-occidental', band: 'corto', flightBase: 70, hotelNight: 85, peakMonths: [6, 7, 8, 9], lowMonths: [1, 2, 11], vibes: ['ciudad', 'gastronomia', 'cultura'], transferBase: 9 },
  { slug: 'madeira', name: 'Madeira', country: 'Portugal', region: 'islas', band: 'corto', flightBase: 110, hotelNight: 90, peakMonths: [7, 8, 12], lowMonths: [2, 3, 11], vibes: ['naturaleza', 'relax', 'aventura'], transferBase: 22 },
  { slug: 'azores', name: 'Azores', country: 'Portugal', region: 'islas', band: 'medio', flightBase: 175, hotelNight: 95, peakMonths: [7, 8], lowMonths: [11, 12, 1, 2], vibes: ['naturaleza', 'aventura', 'exotico'], transferBase: 25 },
  { slug: 'paris', name: 'París', country: 'Francia', region: 'europa-occidental', band: 'corto', flightBase: 95, hotelNight: 145, peakMonths: [5, 6, 7, 9, 12], lowMonths: [1, 2, 11], vibes: ['ciudad', 'romantico', 'cultura'], transferBase: 24 },
  { slug: 'roma', name: 'Roma', country: 'Italia', region: 'europa-occidental', band: 'corto', flightBase: 90, hotelNight: 120, peakMonths: [4, 5, 6, 9, 10], lowMonths: [1, 2, 11], vibes: ['cultura', 'gastronomia', 'ciudad'], transferBase: 22 },
  { slug: 'milan', name: 'Milán', country: 'Italia', region: 'europa-occidental', band: 'corto', flightBase: 80, hotelNight: 125, peakMonths: [4, 6, 9], lowMonths: [1, 8, 11], vibes: ['ciudad', 'gastronomia'], transferBase: 22 },
  { slug: 'napoles', name: 'Nápoles y costa Amalfitana', country: 'Italia', region: 'europa-occidental', band: 'corto', flightBase: 95, hotelNight: 115, peakMonths: [6, 7, 8, 9], lowMonths: [1, 2, 11], vibes: ['gastronomia', 'playa', 'cultura'], transferBase: 20 },
  { slug: 'sicilia', name: 'Sicilia', country: 'Italia', region: 'europa-occidental', band: 'corto', flightBase: 110, hotelNight: 105, peakMonths: [7, 8], lowMonths: [11, 12, 1, 2, 3], vibes: ['playa', 'gastronomia', 'cultura'], transferBase: 25 },
  { slug: 'venecia', name: 'Venecia', country: 'Italia', region: 'europa-occidental', band: 'corto', flightBase: 95, hotelNight: 155, peakMonths: [4, 5, 6, 9, 10], lowMonths: [1, 2, 11], vibes: ['romantico', 'cultura'], transferBase: 26 },
  { slug: 'amsterdam', name: 'Ámsterdam', country: 'Países Bajos', region: 'europa-occidental', band: 'corto', flightBase: 105, hotelNight: 165, peakMonths: [4, 5, 6, 7, 12], lowMonths: [1, 2, 11], vibes: ['ciudad', 'cultura', 'fiesta'], transferBase: 14 },
  { slug: 'londres', name: 'Londres', country: 'Reino Unido', region: 'europa-occidental', band: 'corto', flightBase: 95, hotelNight: 175, peakMonths: [6, 7, 8, 12], lowMonths: [1, 2, 11], vibes: ['ciudad', 'cultura', 'gastronomia'], transferBase: 26 },
  { slug: 'edimburgo', name: 'Edimburgo', country: 'Reino Unido', region: 'europa-occidental', band: 'corto', flightBase: 110, hotelNight: 140, peakMonths: [7, 8, 12], lowMonths: [1, 2, 11], vibes: ['cultura', 'naturaleza', 'ciudad'], transferBase: 16 },
  { slug: 'berlin', name: 'Berlín', country: 'Alemania', region: 'europa-occidental', band: 'corto', flightBase: 100, hotelNight: 110, peakMonths: [6, 7, 9, 12], lowMonths: [1, 2, 11], vibes: ['ciudad', 'fiesta', 'cultura'], transferBase: 14 },
  { slug: 'munich', name: 'Múnich', country: 'Alemania', region: 'europa-occidental', band: 'corto', flightBase: 105, hotelNight: 135, peakMonths: [9, 10, 12], lowMonths: [1, 2, 11], vibes: ['ciudad', 'gastronomia', 'nieve'], transferBase: 20 },
  { slug: 'viena', name: 'Viena', country: 'Austria', region: 'europa-occidental', band: 'corto', flightBase: 110, hotelNight: 120, peakMonths: [5, 6, 9, 12], lowMonths: [1, 2, 11], vibes: ['cultura', 'romantico', 'ciudad'], transferBase: 16 },
  { slug: 'alpes-austriacos', name: 'Alpes austriacos (esquí)', country: 'Austria', region: 'europa-occidental', band: 'corto', flightBase: 120, hotelNight: 145, peakMonths: [12, 1, 2, 3], lowMonths: [5, 6, 10, 11], vibes: ['nieve', 'aventura', 'naturaleza'], transferBase: 55 },
  { slug: 'suiza', name: 'Suiza (Interlaken/Zúrich)', country: 'Suiza', region: 'europa-occidental', band: 'corto', flightBase: 120, hotelNight: 210, peakMonths: [7, 8, 12, 1, 2], lowMonths: [4, 5, 11], vibes: ['naturaleza', 'nieve', 'romantico'], transferBase: 30 },
  { slug: 'bruselas', name: 'Bruselas y Brujas', country: 'Bélgica', region: 'europa-occidental', band: 'corto', flightBase: 90, hotelNight: 120, peakMonths: [6, 7, 12], lowMonths: [1, 2, 11], vibes: ['ciudad', 'gastronomia', 'cultura'], transferBase: 16 },
  { slug: 'dublin', name: 'Dublín', country: 'Irlanda', region: 'europa-occidental', band: 'corto', flightBase: 95, hotelNight: 155, peakMonths: [6, 7, 8], lowMonths: [1, 2, 11], vibes: ['ciudad', 'fiesta', 'naturaleza'], transferBase: 14 },
  { slug: 'grecia-atenas', name: 'Atenas', country: 'Grecia', region: 'europa-occidental', band: 'medio', flightBase: 130, hotelNight: 100, peakMonths: [6, 7, 8, 9], lowMonths: [1, 2, 11], vibes: ['cultura', 'playa', 'gastronomia'], transferBase: 18 },
  { slug: 'islas-griegas', name: 'Islas griegas (Santorini/Mykonos)', country: 'Grecia', region: 'europa-occidental', band: 'medio', flightBase: 165, hotelNight: 175, peakMonths: [6, 7, 8, 9], lowMonths: [11, 12, 1, 2, 3], vibes: ['playa', 'romantico', 'relax'], transferBase: 28 },
  { slug: 'croacia', name: 'Croacia (Dubrovnik/Split)', country: 'Croacia', region: 'europa-este', band: 'corto', flightBase: 125, hotelNight: 115, peakMonths: [7, 8], lowMonths: [11, 12, 1, 2, 3], vibes: ['playa', 'cultura', 'naturaleza'], transferBase: 20 },
  { slug: 'malta', name: 'Malta', country: 'Malta', region: 'europa-occidental', band: 'corto', flightBase: 110, hotelNight: 95, peakMonths: [7, 8], lowMonths: [11, 12, 1, 2], vibes: ['playa', 'cultura', 'fiesta'], transferBase: 15 },

  // ---- Europa del este y norte ---------------------------------------
  { slug: 'praga', name: 'Praga', country: 'Chequia', region: 'europa-este', band: 'corto', flightBase: 105, hotelNight: 85, peakMonths: [5, 6, 9, 12], lowMonths: [1, 2, 11], vibes: ['ciudad', 'cultura', 'fiesta'], transferBase: 12 },
  { slug: 'budapest', name: 'Budapest', country: 'Hungría', region: 'europa-este', band: 'corto', flightBase: 105, hotelNight: 78, peakMonths: [6, 7, 8, 12], lowMonths: [1, 2, 11], vibes: ['ciudad', 'relax', 'fiesta'], transferBase: 12 },
  { slug: 'cracovia', name: 'Cracovia', country: 'Polonia', region: 'europa-este', band: 'corto', flightBase: 95, hotelNight: 70, peakMonths: [6, 7, 8, 12], lowMonths: [1, 2, 11], vibes: ['cultura', 'ciudad'], transferBase: 10 },
  { slug: 'varsovia', name: 'Varsovia', country: 'Polonia', region: 'europa-este', band: 'corto', flightBase: 95, hotelNight: 75, peakMonths: [6, 7, 8], lowMonths: [1, 2, 11], vibes: ['ciudad', 'cultura'], transferBase: 10 },
  { slug: 'bucarest', name: 'Bucarest y Transilvania', country: 'Rumanía', region: 'europa-este', band: 'corto', flightBase: 100, hotelNight: 65, peakMonths: [6, 7, 8], lowMonths: [1, 2, 11], vibes: ['cultura', 'naturaleza'], transferBase: 10 },
  { slug: 'albania', name: 'Albania', country: 'Albania', region: 'europa-este', band: 'medio', flightBase: 130, hotelNight: 60, peakMonths: [7, 8], lowMonths: [11, 12, 1, 2, 3], vibes: ['playa', 'naturaleza', 'aventura'], transferBase: 14 },
  { slug: 'estambul', name: 'Estambul', country: 'Turquía', region: 'oriente-medio', band: 'medio', flightBase: 155, hotelNight: 85, peakMonths: [4, 5, 9, 10], lowMonths: [1, 2, 11], vibes: ['ciudad', 'cultura', 'gastronomia'], transferBase: 16 },
  { slug: 'capadocia', name: 'Capadocia', country: 'Turquía', region: 'oriente-medio', band: 'medio', flightBase: 190, hotelNight: 90, peakMonths: [4, 5, 9, 10], lowMonths: [1, 2, 11], vibes: ['exotico', 'aventura', 'romantico'], transferBase: 20 },
  { slug: 'copenhague', name: 'Copenhague', country: 'Dinamarca', region: 'europa-norte', band: 'corto', flightBase: 120, hotelNight: 165, peakMonths: [6, 7, 8, 12], lowMonths: [1, 2, 11], vibes: ['ciudad', 'gastronomia'], transferBase: 14 },
  { slug: 'estocolmo', name: 'Estocolmo', country: 'Suecia', region: 'europa-norte', band: 'corto', flightBase: 125, hotelNight: 150, peakMonths: [6, 7, 8, 12], lowMonths: [1, 2, 11], vibes: ['ciudad', 'naturaleza'], transferBase: 20 },
  { slug: 'laponia', name: 'Laponia (auroras)', country: 'Finlandia', region: 'europa-norte', band: 'medio', flightBase: 250, hotelNight: 190, peakMonths: [12, 1, 2, 3], lowMonths: [5, 6, 9, 10], vibes: ['nieve', 'aventura', 'romantico'], transferBase: 45 },
  { slug: 'islandia', name: 'Islandia', country: 'Islandia', region: 'europa-norte', band: 'medio', flightBase: 215, hotelNight: 175, peakMonths: [6, 7, 8], lowMonths: [1, 2, 10, 11], vibes: ['naturaleza', 'aventura', 'exotico'], transferBase: 45 },
  { slug: 'noruega-fiordos', name: 'Noruega (fiordos)', country: 'Noruega', region: 'europa-norte', band: 'medio', flightBase: 175, hotelNight: 170, peakMonths: [6, 7, 8], lowMonths: [1, 2, 11], vibes: ['naturaleza', 'aventura'], transferBase: 35 },

  // ---- Norte de África y Oriente Medio -------------------------------
  { slug: 'marrakech', name: 'Marrakech', country: 'Marruecos', region: 'norte-africa', band: 'corto', flightBase: 90, hotelNight: 70, peakMonths: [3, 4, 10, 11, 12], lowMonths: [7, 8], vibes: ['exotico', 'cultura', 'relax'], transferBase: 14 },
  { slug: 'fez-chefchaouen', name: 'Fez y Chefchaouen', country: 'Marruecos', region: 'norte-africa', band: 'corto', flightBase: 95, hotelNight: 60, peakMonths: [3, 4, 10, 11], lowMonths: [7, 8], vibes: ['cultura', 'exotico', 'aventura'], transferBase: 20 },
  { slug: 'egipto', name: 'Egipto (Nilo y pirámides)', country: 'Egipto', region: 'norte-africa', band: 'medio', flightBase: 240, hotelNight: 85, peakMonths: [10, 11, 12, 1, 3], lowMonths: [6, 7, 8], vibes: ['cultura', 'exotico', 'aventura'], transferBase: 25 },
  { slug: 'jordania', name: 'Jordania (Petra y Wadi Rum)', country: 'Jordania', region: 'oriente-medio', band: 'medio', flightBase: 300, hotelNight: 95, peakMonths: [3, 4, 10, 11], lowMonths: [7, 8], vibes: ['aventura', 'cultura', 'exotico'], transferBase: 40 },
  { slug: 'dubai', name: 'Dubái', country: 'EAU', region: 'oriente-medio', band: 'largo', flightBase: 380, hotelNight: 140, peakMonths: [11, 12, 1, 2, 3], lowMonths: [6, 7, 8], vibes: ['ciudad', 'relax', 'exotico'], transferBase: 30 },

  // ---- Asia ------------------------------------------------------------
  { slug: 'tailandia', name: 'Tailandia', country: 'Tailandia', region: 'asia', band: 'ultralargo', flightBase: 560, hotelNight: 60, peakMonths: [12, 1, 2], lowMonths: [5, 6, 9, 10], vibes: ['playa', 'exotico', 'gastronomia'], transferBase: 25 },
  { slug: 'vietnam', name: 'Vietnam', country: 'Vietnam', region: 'asia', band: 'ultralargo', flightBase: 580, hotelNight: 50, peakMonths: [12, 1, 2, 3], lowMonths: [5, 6, 9], vibes: ['exotico', 'gastronomia', 'aventura'], transferBase: 22 },
  { slug: 'japon', name: 'Japón', country: 'Japón', region: 'asia', band: 'ultralargo', flightBase: 680, hotelNight: 115, peakMonths: [3, 4, 10, 11], lowMonths: [1, 2, 6], vibes: ['cultura', 'gastronomia', 'exotico'], transferBase: 35 },
  { slug: 'indonesia-bali', name: 'Bali e Indonesia', country: 'Indonesia', region: 'asia', band: 'ultralargo', flightBase: 640, hotelNight: 65, peakMonths: [7, 8, 12], lowMonths: [2, 3, 11], vibes: ['playa', 'relax', 'exotico'], transferBase: 25 },
  { slug: 'india-norte', name: 'India (triángulo de oro)', country: 'India', region: 'asia', band: 'largo', flightBase: 520, hotelNight: 55, peakMonths: [11, 12, 1, 2], lowMonths: [5, 6, 7], vibes: ['cultura', 'exotico', 'aventura'], transferBase: 25 },
  { slug: 'sri-lanka', name: 'Sri Lanka', country: 'Sri Lanka', region: 'asia', band: 'ultralargo', flightBase: 580, hotelNight: 55, peakMonths: [12, 1, 2, 3], lowMonths: [5, 6, 10], vibes: ['naturaleza', 'playa', 'exotico'], transferBase: 25 },
  { slug: 'maldivas', name: 'Maldivas', country: 'Maldivas', region: 'asia', band: 'ultralargo', flightBase: 620, hotelNight: 260, peakMonths: [12, 1, 2, 3], lowMonths: [5, 6, 9, 10], vibes: ['playa', 'romantico', 'relax'], transferBase: 120 },

  // ---- América --------------------------------------------------------
  { slug: 'nueva-york', name: 'Nueva York', country: 'EE. UU.', region: 'norteamerica', band: 'largo', flightBase: 420, hotelNight: 210, peakMonths: [5, 6, 9, 10, 12], lowMonths: [1, 2], vibes: ['ciudad', 'cultura', 'gastronomia'], transferBase: 30 },
  { slug: 'california', name: 'California (ruta costa oeste)', country: 'EE. UU.', region: 'norteamerica', band: 'largo', flightBase: 540, hotelNight: 175, peakMonths: [6, 7, 8], lowMonths: [1, 2, 11], vibes: ['aventura', 'naturaleza', 'ciudad'], transferBase: 40 },
  { slug: 'canada', name: 'Canadá (Rocosas / Quebec)', country: 'Canadá', region: 'norteamerica', band: 'largo', flightBase: 500, hotelNight: 165, peakMonths: [7, 8], lowMonths: [1, 2, 11], vibes: ['naturaleza', 'aventura', 'nieve'], transferBase: 35 },
  { slug: 'mexico-riviera', name: 'Riviera Maya', country: 'México', region: 'centroamerica-caribe', band: 'largo', flightBase: 480, hotelNight: 130, peakMonths: [12, 1, 2, 3, 7, 8], lowMonths: [5, 6, 9], vibes: ['playa', 'relax', 'familia'], transferBase: 35 },
  { slug: 'mexico-df', name: 'Ciudad de México y Oaxaca', country: 'México', region: 'centroamerica-caribe', band: 'largo', flightBase: 460, hotelNight: 90, peakMonths: [10, 11, 12], lowMonths: [5, 6, 9], vibes: ['cultura', 'gastronomia', 'ciudad'], transferBase: 22 },
  { slug: 'cuba', name: 'Cuba', country: 'Cuba', region: 'centroamerica-caribe', band: 'largo', flightBase: 470, hotelNight: 85, peakMonths: [12, 1, 2, 3], lowMonths: [5, 6, 9, 10], vibes: ['playa', 'cultura', 'fiesta'], transferBase: 30 },
  { slug: 'republica-dominicana', name: 'República Dominicana', country: 'R. Dominicana', region: 'centroamerica-caribe', band: 'largo', flightBase: 450, hotelNight: 120, peakMonths: [12, 1, 2, 3, 7, 8], lowMonths: [5, 6, 9, 10], vibes: ['playa', 'relax', 'familia'], transferBase: 30 },
  { slug: 'costa-rica', name: 'Costa Rica', country: 'Costa Rica', region: 'centroamerica-caribe', band: 'largo', flightBase: 550, hotelNight: 105, peakMonths: [12, 1, 2, 3], lowMonths: [5, 6, 9, 10], vibes: ['naturaleza', 'aventura', 'playa'], transferBase: 40 },
  { slug: 'colombia', name: 'Colombia', country: 'Colombia', region: 'sudamerica', band: 'largo', flightBase: 520, hotelNight: 80, peakMonths: [12, 1, 7, 8], lowMonths: [4, 5, 9, 10], vibes: ['cultura', 'playa', 'fiesta'], transferBase: 25 },
  { slug: 'peru', name: 'Perú (Machu Picchu)', country: 'Perú', region: 'sudamerica', band: 'largo', flightBase: 620, hotelNight: 85, peakMonths: [6, 7, 8], lowMonths: [1, 2, 3], vibes: ['cultura', 'aventura', 'naturaleza'], transferBase: 30 },
  { slug: 'argentina', name: 'Argentina y Patagonia', country: 'Argentina', region: 'sudamerica', band: 'ultralargo', flightBase: 700, hotelNight: 95, peakMonths: [12, 1, 2], lowMonths: [5, 6, 7], vibes: ['naturaleza', 'aventura', 'gastronomia'], transferBase: 35 },
  { slug: 'brasil', name: 'Brasil', country: 'Brasil', region: 'sudamerica', band: 'ultralargo', flightBase: 620, hotelNight: 100, peakMonths: [12, 1, 2], lowMonths: [5, 6, 9], vibes: ['playa', 'fiesta', 'naturaleza'], transferBase: 30 },
  { slug: 'chile', name: 'Chile y Atacama', country: 'Chile', region: 'sudamerica', band: 'ultralargo', flightBase: 720, hotelNight: 100, peakMonths: [12, 1, 2], lowMonths: [5, 6, 7], vibes: ['naturaleza', 'aventura', 'exotico'], transferBase: 35 },

  // ---- África subsahariana y Oceanía ----------------------------------
  { slug: 'cabo-verde', name: 'Cabo Verde', country: 'Cabo Verde', region: 'africa-subsahariana', band: 'medio', flightBase: 300, hotelNight: 95, peakMonths: [12, 1, 2, 7, 8], lowMonths: [5, 6, 9], vibes: ['playa', 'relax', 'aventura'], transferBase: 20 },
  { slug: 'kenia-tanzania', name: 'Safari en Kenia/Tanzania', country: 'Kenia', region: 'africa-subsahariana', band: 'largo', flightBase: 620, hotelNight: 185, peakMonths: [7, 8, 12, 1], lowMonths: [4, 5, 11], vibes: ['aventura', 'naturaleza', 'exotico'], transferBase: 60 },
  { slug: 'sudafrica', name: 'Sudáfrica', country: 'Sudáfrica', region: 'africa-subsahariana', band: 'ultralargo', flightBase: 650, hotelNight: 110, peakMonths: [12, 1, 2], lowMonths: [5, 6, 7], vibes: ['naturaleza', 'aventura', 'gastronomia'], transferBase: 35 },
  { slug: 'zanzibar', name: 'Zanzíbar', country: 'Tanzania', region: 'africa-subsahariana', band: 'largo', flightBase: 600, hotelNight: 110, peakMonths: [12, 1, 2, 7, 8], lowMonths: [4, 5, 11], vibes: ['playa', 'relax', 'exotico'], transferBase: 30 },
  { slug: 'australia', name: 'Australia', country: 'Australia', region: 'oceania', band: 'ultralargo', flightBase: 950, hotelNight: 140, peakMonths: [12, 1, 2], lowMonths: [5, 6, 7], vibes: ['playa', 'aventura', 'naturaleza'], transferBase: 40 },
];

/** Precios base por región cuando el destino escrito no está en el catálogo. */
export const regionFallback: Record<RegionId, { flightBase: number; hotelNight: number; band: DistanceBand; transferBase: number }> = {
  espana: { flightBase: 70, hotelNight: 95, band: 'corto', transferBase: 14 },
  islas: { flightBase: 95, hotelNight: 95, band: 'corto', transferBase: 18 },
  'europa-occidental': { flightBase: 105, hotelNight: 130, band: 'corto', transferBase: 18 },
  'europa-este': { flightBase: 105, hotelNight: 80, band: 'corto', transferBase: 12 },
  'europa-norte': { flightBase: 165, hotelNight: 165, band: 'medio', transferBase: 25 },
  'norte-africa': { flightBase: 130, hotelNight: 70, band: 'corto', transferBase: 18 },
  'oriente-medio': { flightBase: 260, hotelNight: 105, band: 'medio', transferBase: 25 },
  asia: { flightBase: 600, hotelNight: 70, band: 'ultralargo', transferBase: 28 },
  norteamerica: { flightBase: 480, hotelNight: 180, band: 'largo', transferBase: 33 },
  'centroamerica-caribe': { flightBase: 480, hotelNight: 110, band: 'largo', transferBase: 30 },
  sudamerica: { flightBase: 620, hotelNight: 90, band: 'largo', transferBase: 30 },
  'africa-subsahariana': { flightBase: 600, hotelNight: 125, band: 'largo', transferBase: 35 },
  oceania: { flightBase: 950, hotelNight: 140, band: 'ultralargo', transferBase: 40 },
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Busca un destino del catálogo a partir de texto libre del cliente. */
export function findDestination(query: string): DestinationSeed | undefined {
  const q = normalize(query);
  if (!q) return undefined;
  const exact = destinations.find((d) => normalize(d.name) === q || d.slug === q);
  if (exact) return exact;
  return destinations.find(
    (d) => normalize(d.name).includes(q) || q.includes(normalize(d.name)) || normalize(d.country) === q,
  );
}

/** Sugerencias para el autocompletado del wizard. */
export function suggestDestinations(query: string, limit = 8): DestinationSeed[] {
  const q = normalize(query);
  if (!q) return destinations.filter((d) => d.band === 'corto').slice(0, limit);
  const scored = destinations
    .map((d) => {
      const name = normalize(d.name);
      const country = normalize(d.country);
      let score = -1;
      if (name.startsWith(q)) score = 100 - name.length;
      else if (name.includes(q)) score = 60 - name.length;
      else if (country.startsWith(q)) score = 40;
      else if (country.includes(q)) score = 25;
      return { d, score };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((item) => item.d);
}

export function destinationsByVibe(vibe: VibeId): DestinationSeed[] {
  return destinations.filter((d) => d.vibes.includes(vibe));
}

export function findOrigin(code: string): OriginAirport | undefined {
  const q = normalize(code);
  return originAirports.find((a) => a.iata.toLowerCase() === q || normalize(a.city) === q);
}
