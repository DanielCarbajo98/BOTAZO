/**
 * Configuración de marca y negocio.
 *
 * Este es el ÚNICO sitio donde hay que tocar para cambiar el nombre comercial,
 * los datos de contacto, las tarifas o los textos legales de la empresa.
 */

export const site = {
  name: 'Alisio',
  legalName: 'Alisio (nombre comercial pendiente de constitución)',
  /** De dónde viene el nombre: se usa en el pie y en la pantalla de carga. */
  story:
    'Los alisios son los vientos constantes que cruzaban el Atlántico y empujaban a los barcos sin gastar ni un remo. Eso hacemos: buscamos la corriente que te lleva más lejos por menos.',
  tagline: 'Viaja con el viento a favor',
  description:
    'Agencia de viajes low cost. Nos cuentas a dónde quieres ir (o ni eso) y te buscamos vuelos, hotel, traslados y actividades al mejor precio real. Presupuesto gratis en 24 h y sin compromiso.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alisio.es',
  locale: 'es-ES',
  currency: 'EUR',

  contact: {
    email: 'hola@alisio.es',
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
    dpoEmail: 'privacidad@alisio.es',
  },

  social: {
    instagram: 'https://instagram.com/',
    tiktok: 'https://tiktok.com/',
  },
} as const;

/**
 * Modelo de precio.
 *
 * Cobramos una tarifa fija y visible por persona en lugar de una comisión
 * oculta metida dentro del precio del viaje.
 *
 * Las cifras salen de un cálculo de rentabilidad real: cada reserva cerrada
 * arrastra el trabajo de los presupuestos que no se cerraron (a una conversión
 * del ~33 %, son unas 3 búsquedas por cada venta). Por eso hay un mínimo por
 * reserva: una pareja y una persona sola dan el mismo trabajo, y por debajo de
 * ese suelo la búsqueda sale a pérdida.
 */
export const pricing = {
  /** Escapadas: Europa / Norte de África, hasta 6 noches. */
  escapada: { id: 'escapada', label: 'Escapada', feePerPerson: 29, minPerBooking: 49 },
  /** Larga distancia, multidestino o más de 6 noches. */
  granViaje: { id: 'gran-viaje', label: 'Gran viaje', feePerPerson: 59, minPerBooking: 99 },
  /**
   * Modo asesor: se cobra por desbloquear el plan, antes de reservar nada.
   * Es más barato que la escala de agencia porque no gestionamos reservas ni
   * respondemos de proveedores, y porque el cobro llega antes y sin fugas.
   */
  asesor: {
    escapada: { id: 'escapada', label: 'Escapada', feePerPerson: 19, minPerBooking: 33 },
    granViaje: { id: 'gran-viaje', label: 'Gran viaje', feePerPerson: 39, minPerBooking: 69 },
  },
  /** Grupos a partir de 8 personas: tarifa por persona reducida. */
  grupoMinSize: 8,
  grupoDiscount: 0.35,
  /** Máximo que cobramos por reserva, por muy grande que sea el grupo. */
  feeCap: 349,
  /** Menores de esta edad pagan la mitad. Los bebés en brazos no pagan nada. */
  childAgeLimit: 12,
  childDiscount: 0.5,
  /** Extra opcional: respuesta en 4 h y más rondas de cambios. */
  priority: { fee: 39, hours: 4, revisions: 3 },
  /**
   * Si después de reservar el precio baja y rehacemos la reserva, el ahorro se
   * reparte. Solo ganamos si el cliente gana.
   */
  savingShare: { client: 0.75, agency: 0.25 },
  /** Comisión máxima que algunos proveedores nos pagan. No la paga el cliente. */
  supplierCommissionMax: 7,
  /**
   * Devolución sin preguntas.
   *
   * Las dos condiciones son objetivas y comprobables, que es lo que hace que la
   * política se sostenga: o estás dentro del plazo o no, y o has pulsado un
   * enlace de reserva o no. Nada queda al criterio de nadie.
   */
  refund: {
    hours: 48,
    /** Pulsar un enlace es usar el trabajo: a partir de ahí no hay devolución. */
    voidOnClick: true,
  },
  guarantee:
    'Si no conseguimos bajar el mejor precio que encuentres tú por tu cuenta, no pagas la tarifa.',
} as const;

export type FeeTier = typeof pricing.escapada | typeof pricing.granViaje;
