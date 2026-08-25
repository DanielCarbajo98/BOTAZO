import { pricing, site } from '@/config/site';

/**
 * Modo de operación.
 *
 * - `asesor`  → SIN licencia de agencia de viajes. Nosotros investigamos y
 *   entregamos el plan; **reserva el cliente** con su tarjeta a través de
 *   nuestros enlaces. No intermediamos ni cobramos el viaje, así que no hay
 *   viaje combinado y no hace falta título-licencia ni garantía.
 * - `agencia` → CON licencia. Reservamos nosotros y gestionamos el expediente.
 *
 * Se cambia con NEXT_PUBLIC_SITE_MODE. Todo el texto que depende de esta
 * distinción vive aquí abajo: el día que llegue la licencia se cambia la
 * variable y la web entera se adapta sola.
 */
export type SiteMode = 'asesor' | 'agencia';

const configured = process.env.NEXT_PUBLIC_SITE_MODE;
export const mode: SiteMode = configured === 'agencia' ? 'agencia' : 'asesor';
export const isAdvisor = mode === 'asesor';

type ModeCopy = {
  /** Bajo el logotipo y en la cabecera. */
  roleShort: string;
  /** Cómo nos definimos en textos legales. */
  roleLegal: string;
  /** Nombre de lo que cobramos. */
  feeLabel: string;
  feeLabelShort: string;
  /** Llamadas a la acción. */
  cta: string;
  ctaShort: string;
  ctaSecondary: string;
  metaDescription: string;
  heroLead: string;
  /** Cuarto paso de "cómo funciona". */
  finalStep: { title: string; body: string; detail: string };
  /** Viñetas de lo que incluye la tarifa. */
  includes: [string, string][];
  /** Las cuatro que caben en la tarjeta de precio de la portada. */
  cardHighlights: string[];
  /** Bloque que explica quién reserva. */
  whoBooks: { title: string; body: string };
  comparisonRow: { feature: string; alone: string; ota: string; agency: string; us: string };
  /** Página de propuesta que ve el cliente. */
  quote: { intro: string; ctaPrimary: string; ctaHelp: string; done: string };
  faqWhoBooks: { question: string; answer: string };
  /** Aviso legal, apartado de objeto del servicio. */
  legalObject: string;
  /** Condiciones de contratación, apartado 1. */
  conditionsObject: string;
};

const copies: Record<SiteMode, ModeCopy> = {
  asesor: {
    roleShort: 'Asesoría low cost',
    roleLegal: 'servicio de asesoramiento y planificación de viajes',
    feeLabel: 'honorarios de asesoramiento',
    feeLabelShort: 'honorarios',
    cta: 'Pedir mi plan de viaje gratis',
    ctaShort: 'Pedir plan gratis',
    ctaSecondary: 'Ver mi plan',
    metaDescription:
      'Asesoría de viajes low cost. Nos cuentas a dónde quieres ir (o ni eso) y te preparamos el plan completo —vuelos, hotel, traslados y actividades— al mejor precio real. Reservas tú, con nuestros enlaces. Plan gratis en 24 h.',
    heroLead:
      'Nos cuentas a dónde quieres ir —o ni eso— y nosotros nos pasamos las horas comparando aeropuertos, fechas, escalas y hoteles hasta encontrar la combinación más barata que encaje contigo. Te mandamos el plan con el desglose completo y los enlaces para que reserves tú, acompañado.',
    finalStep: {
      title: 'Reservas tú, acompañado',
      body: 'Te pasamos los enlaces exactos y el orden correcto: primero el vuelo, luego el hotel, después los extras. Quedamos por WhatsApp mientras lo haces, por si algo no cuadra.',
      detail: 'Reservas a tu nombre · con tu tarjeta · nosotros al lado',
    },
    includes: [
      ['Estudio de tu viaje', 'Analizamos tu formulario y definimos la estrategia de búsqueda.'],
      [
        'Búsqueda completa',
        'Aeropuertos alternativos, calendario completo, compañías, combinaciones y alojamientos en varios canales.',
      ],
      ['Plan con tres opciones', 'Con desglose línea por línea y nuestra recomendación razonada.'],
      ['Una ronda de cambios', 'Si nada te encaja, ajustamos y volvemos a buscar sin coste.'],
      ['Enlaces directos de reserva', 'Cada línea con su enlace, para que no te pierdas ni pagues de más.'],
      ['Acompañamiento al reservar', 'Por WhatsApp mientras lo haces, en el orden correcto.'],
      ['Radar de precios', 'Seguimos vigilando y te avisamos si baja y tu reserva admite cambio.'],
      ['Ayuda si algo sale mal', 'Te explicamos qué compensación te corresponde y cómo reclamarla.'],
    ],
    cardHighlights: [
      'Plan con tres opciones comparadas',
      'Búsqueda de vuelos, hotel, traslados y actividades',
      'Enlaces directos y acompañamiento al reservar',
      'Radar de precios y ayuda si algo sale mal',
    ],
    whoBooks: {
      title: 'Reservas tú, y eso es bueno para ti',
      body: 'Cada reserva queda a tu nombre y con tu tarjeta, directamente con la aerolínea o el hotel. No hay intermediario que pueda desaparecer, ni un localizador que solo nosotros podamos tocar: si necesitas cambiar algo, hablas directamente con quien presta el servicio. Nosotros te decimos exactamente qué reservar, dónde y en qué orden.',
    },
    comparisonRow: {
      feature: 'Sabes cuánto se lleva quien te asesora',
      alone: '—',
      ota: 'No',
      agency: 'No',
      us: 'Sí, y reservas tú directamente',
    },
    quote: {
      intro:
        'Cada opción lleva el enlace exacto de cada reserva. Reserva en este orden: primero el vuelo, que es lo que más se mueve, después el alojamiento y por último los extras.',
      ctaPrimary: 'Voy a reservar esta opción',
      ctaHelp:
        'Avísanos cuál eliges y quedamos por WhatsApp mientras reservas, por si algún precio ha cambiado o algo no cuadra.',
      done: 'Perfecto. Te escribimos ahora para acompañarte mientras reservas.',
    },
    faqWhoBooks: {
      question: '¿Quién hace la reserva, vosotros o yo?',
      answer:
        'La haces tú, con tu tarjeta y a tu nombre, usando los enlaces que te pasamos. Nosotros no cobramos el viaje ni intermediamos: solo te decimos exactamente qué reservar, dónde y en qué orden, y te acompañamos por WhatsApp mientras lo haces. Así cada reserva es tuya y la gestionas directamente con la compañía.',
    },
    legalObject: `${site.name} presta un servicio de asesoramiento y planificación de viajes: investigamos, comparamos y elaboramos una propuesta personalizada. No comercializamos viajes combinados ni servicios de viaje vinculados, no intermediamos en la contratación y no percibimos importe alguno por los servicios de viaje. Cada reserva la formaliza directamente el cliente con el proveedor correspondiente, y la relación contractual se establece entre ambos.`,
    conditionsObject: `Contratas un servicio de asesoramiento: estudio, búsqueda, comparación y elaboración de una propuesta de viaje personalizada, junto con el acompañamiento durante el proceso de reserva. La contratación de cada servicio de viaje (transporte, alojamiento, traslados, actividades o seguros) la realiza el cliente directamente con el proveedor, aceptando sus condiciones. ${site.name} no actúa como agencia de viajes, no organiza ni vende viajes combinados y no responde del cumplimiento de los proveedores, sin perjuicio de asistirte si surge cualquier incidencia.`,
  },

  agencia: {
    roleShort: 'Agencia low cost',
    roleLegal: 'agencia de viajes',
    feeLabel: 'tarifa de gestión',
    feeLabelShort: 'tarifa',
    cta: 'Pedir mi presupuesto gratis',
    ctaShort: 'Pedir presupuesto gratis',
    ctaSecondary: 'Ver mi presupuesto',
    metaDescription: site.description,
    heroLead:
      'Nos cuentas a dónde quieres ir —o ni eso— y nosotros nos pasamos las horas comparando aeropuertos, fechas, escalas y hoteles hasta encontrar la combinación más barata que encaje contigo. Te enviamos el presupuesto con el desglose completo y tú decides.',
    finalStep: {
      title: 'Reservamos y te acompañamos',
      body: 'Si te encaja, lo reservamos todo y te mandamos los localizadores a tu nombre. Seguimos vigilando el precio y estamos en tu WhatsApp durante el viaje.',
      detail: 'Radar de precios · soporte durante el viaje',
    },
    includes: [
      ['Estudio de tu viaje', 'Un agente analiza tu formulario y define la estrategia de búsqueda.'],
      [
        'Búsqueda completa',
        'Aeropuertos alternativos, calendario completo, compañías, combinaciones y alojamientos en varios canales.',
      ],
      ['Presupuesto con tres opciones', 'Con desglose línea por línea y nuestra recomendación razonada.'],
      ['Una ronda de cambios', 'Si nada te encaja, ajustamos y volvemos a buscar sin coste.'],
      ['Gestión de las reservas', 'Emitimos todo y te mandamos los localizadores a tu nombre.'],
      [
        'Radar de precios',
        `Seguimos vigilando y rehacemos la reserva si baja. El ${Math.round(pricing.savingShare.client * 100)} % del ahorro es tuyo.`,
      ],
      ['Soporte durante el viaje', 'WhatsApp con una persona que conoce tu expediente.'],
      ['Ayuda si algo sale mal', 'Te explicamos qué compensación te corresponde y cómo reclamarla.'],
    ],
    cardHighlights: [
      'Presupuesto con tres opciones comparadas',
      'Búsqueda de vuelos, hotel, traslados y actividades',
      'Gestión completa de las reservas',
      'Radar de precios y soporte durante el viaje',
    ],
    whoBooks: {
      title: 'Reservamos nosotros, a tu nombre',
      body: 'Te decimos siempre quién emite cada reserva. Recibes los localizadores a tu nombre y puedes gestionarlos directamente con la compañía: nunca vas a tener una reserva opaca que solo podamos tocar nosotros.',
    },
    comparisonRow: {
      feature: 'Sabes cuánto se lleva la agencia',
      alone: '—',
      ota: 'No',
      agency: 'No',
      us: 'Sí, línea aparte',
    },
    quote: {
      intro:
        'Elige la opción que más te encaje y nos ponemos con las reservas. Confirmamos disponibilidad y precio antes de cobrar nada.',
      ctaPrimary: 'Me quedo con una opción',
      ctaHelp:
        'Aceptar no implica pagar todavía: te confirmamos disponibilidad y te explicamos cómo se abona antes de reservar nada.',
      done: 'Nos ponemos con ello ahora mismo y te escribimos con los siguientes pasos.',
    },
    faqWhoBooks: {
      question: '¿Con quién reservo realmente, con vosotros o con la aerolínea?',
      answer:
        'Te decimos siempre quién emite cada reserva. Cuando reservamos nosotros, recibes los localizadores a tu nombre y puedes gestionarlos directamente con la compañía. Nunca vas a tener una reserva "opaca" que solo podamos tocar nosotros.',
    },
    legalObject: `${site.name} es una agencia de viajes que presta servicios de asesoramiento, búsqueda, comparación y gestión de reservas de servicios de viaje (transporte, alojamiento, traslados y actividades). Las condiciones de cada servicio contratado son las del proveedor final, que se entregan junto al presupuesto.`,
    conditionsObject: `${site.name} presta un servicio de asesoramiento y gestión de reservas de viaje. La tarifa de gestión retribuye ese trabajo. El precio de los servicios de viaje (vuelos, alojamiento, traslados, actividades) se abona íntegramente a su proveedor, sin recargo por nuestra parte.`,
  },
};

export const modeCopy = copies[mode];

/** Cómo llamamos al entregable: en modo asesor no es un presupuesto de venta. */
export const quoteNoun = isAdvisor ? 'plan de viaje' : 'presupuesto';
export const quoteNounCapitalized = isAdvisor ? 'Plan de viaje' : 'Presupuesto';
