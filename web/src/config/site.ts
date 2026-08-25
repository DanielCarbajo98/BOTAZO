/**
 * Configuración de marca y negocio.
 *
 * Este es el ÚNICO sitio donde hay que tocar para cambiar el nombre comercial,
 * los datos de contacto, las tarifas o los textos legales de la empresa.
 */

export const site = {
  name: 'Viajalisto',
  legalName: 'Viajalisto (nombre comercial pendiente de constitución)',
  tagline: 'Viaja como si tuvieras un amigo experto en chollos',
  description:
    'Agencia de viajes low cost. Nos cuentas a dónde quieres ir (o ni eso) y te buscamos vuelos, hotel, traslados y actividades al mejor precio real. Presupuesto gratis en 24 h y sin compromiso.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://viajalisto.es',
  locale: 'es-ES',
  currency: 'EUR',

  contact: {
    email: 'hola@viajalisto.es',
    // Formato internacional sin espacios para los enlaces wa.me / tel:
    phoneE164: '+34600000000',
    phoneDisplay: '+34 600 00 00 00',
    whatsapp: '34600000000',
    responseTimeHours: 24,
    hours: 'Lunes a domingo, 9:00 – 21:00 (CET)',
  },

  /** Datos que exige la LSSI-CE en el aviso legal. Rellenar antes de publicar. */
  legal: {
    company: 'PENDIENTE S.L.',
    nif: 'PENDIENTE',
    address: 'PENDIENTE',
    registry: 'PENDIENTE',
    // Título-licencia de agencia de viajes de la comunidad autónoma.
    travelAgencyLicence: 'PENDIENTE (código CICMA / registro autonómico)',
    insurer: 'PENDIENTE',
    dpoEmail: 'privacidad@viajalisto.es',
  },

  social: {
    instagram: 'https://instagram.com/',
    tiktok: 'https://tiktok.com/',
  },
} as const;

/**
 * Modelo de precio. Cobramos una tarifa fija y visible por persona en lugar de
 * una comisión oculta metida dentro del precio del viaje.
 */
export const pricing = {
  /** Escapadas: Europa / Norte de África, hasta 6 noches. */
  escapada: { id: 'escapada', label: 'Escapada', feePerPerson: 19 },
  /** Larga distancia, multidestino o más de 6 noches. */
  granViaje: { id: 'gran-viaje', label: 'Gran viaje', feePerPerson: 39 },
  /** Grupos a partir de 8 personas: tarifa por persona reducida. */
  grupoMinSize: 8,
  grupoDiscount: 0.35,
  /** Máximo que cobramos por reserva, por muy grande que sea el grupo. */
  feeCap: 249,
  /** Niños menores de esta edad no pagan tarifa de gestión. */
  freeFeeUnderAge: 12,
  guarantee:
    'Si no conseguimos bajar el mejor precio que encuentres tú por tu cuenta, no pagas la tarifa.',
} as const;

export type FeeTier = typeof pricing.escapada | typeof pricing.granViaje;
