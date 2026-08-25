export type Differentiator = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** Lo que hace la competencia, para que se vea el contraste. */
  versus: string;
};

/**
 * Los ocho puntos en los que somos distintos. Cada uno responde a un dolor real
 * del cliente objetivo: gente que sabe que está pagando de más pero no sabe
 * dónde está la fuga.
 */
export const differentiators: Differentiator[] = [
  {
    id: 'garantia',
    emoji: '🎯',
    title: 'Si no te ahorramos, no pagas',
    description:
      'Compara nuestro presupuesto con lo que encuentres tú. Si no bajamos tu mejor precio, la tarifa de gestión es 0 €. Sin excusas y sin letra pequeña.',
    versus: 'Las agencias cobran su comisión salga como salga el viaje.',
  },
  {
    id: 'desglose',
    emoji: '🧾',
    title: 'Ves el desglose completo',
    description:
      'Cuánto cuesta el vuelo, cuánto el hotel, cuánto el traslado y cuánto cobramos nosotros. Línea por línea. Puedes comprobar cada precio tú mismo.',
    versus: 'El precio cerrado de siempre, donde no sabes qué parte es comisión.',
  },
  {
    id: 'tres-opciones',
    emoji: '🔀',
    title: 'Siempre tres opciones, no una',
    description:
      'La mínima (lo más barato posible), la equilibrada (nuestra recomendación) y la cómoda. Con la diferencia de precio y qué ganas o pierdes en cada una.',
    versus: 'Te mandan una única propuesta y a tomar o dejar.',
  },
  {
    id: 'radar',
    emoji: '📡',
    title: 'Radar de precios después de reservar',
    description:
      'Seguimos vigilando tu vuelo y tu hotel. Si baja y la reserva admite cambio o cancelación gratuita, lo rehacemos y te devolvemos la diferencia.',
    versus: 'Una vez cobrada la reserva, nadie vuelve a mirar el precio.',
  },
  {
    id: 'sorprendeme',
    emoji: '🎲',
    title: 'Modo "me da igual el destino"',
    description:
      'Dinos desde dónde sales, cuántos días y cuánto quieres gastar. Buscamos a dónde se puede volar barato esos días exactos y te proponemos destinos.',
    versus: 'Los buscadores te obligan a elegir destino antes de ver precios.',
  },
  {
    id: 'whatsapp',
    emoji: '💬',
    title: 'Una persona en tu WhatsApp durante el viaje',
    description:
      'Vuelo cancelado, huelga, hotel que no aparece. Escribes y te contesta alguien que conoce tu reserva, no un bot ni un call center a 1,50 €/min.',
    versus: 'Formularios de contacto y esperas de horas al teléfono.',
  },
  {
    id: 'formacion',
    emoji: '🧠',
    title: 'Te enseñamos cómo lo hacemos',
    description:
      'Publicamos gratis todos nuestros trucos. Si quieres hacerlo tú, adelante. Nos contratas para ahorrarte las seis horas de búsqueda, no porque escondamos el método.',
    versus: 'El "secreto profesional" como argumento de venta.',
  },
  {
    id: 'sin-suscripcion',
    emoji: '🚫',
    title: 'Sin suscripciones ni cargos sorpresa',
    description:
      'Nada de clubs de descuento que se renuevan solos, ni seguros premarcados, ni "tasas de gestión" que aparecen en el último paso del pago.',
    versus: 'Las OTAs viven de las suscripciones automáticas y los extras premarcados.',
  },
];

export type Trick = {
  id: string;
  title: string;
  short: string;
  detail: string;
  saving: string;
};

/**
 * Los métodos concretos que usamos para bajar el precio. Son también el
 * contenido de la sección /trucos: captación por SEO y prueba de que sabemos
 * de lo que hablamos.
 */
export const tricks: Trick[] = [
  {
    id: 'aeropuertos',
    title: 'Aeropuertos alternativos',
    short: 'Salir de un aeropuerto a 90 minutos puede cambiar el precio por completo.',
    detail:
      'Comparamos tu aeropuerto con todos los que tienes a menos de dos horas en coche, tren o bus, y sumamos el coste real de llegar hasta allí (parking incluido). Solo te lo proponemos si sale a cuenta de verdad.',
    saving: 'Habitual: 30-45 % en el vuelo',
  },
  {
    id: 'calendario',
    title: 'Calendario completo, no una fecha',
    short: 'Mover la salida dos días suele valer más que cualquier código de descuento.',
    detail:
      'Miramos el mes entero en lugar de un día concreto y cruzamos días de salida, días de vuelta y duración. Martes y miércoles suelen ser los días baratos, pero depende de la ruta: lo comprobamos caso por caso.',
    saving: 'Habitual: 20-40 % en el vuelo',
  },
  {
    id: 'billetes-separados',
    title: 'Billetes por separado, con criterio',
    short: 'Dos billetes de ida sencilla de compañías distintas suelen batir al de ida y vuelta.',
    detail:
      'Es más barato, pero pierdes la protección de conexión: si el primer vuelo se retrasa, el segundo no te espera. Solo lo proponemos con margen amplio entre vuelos y te avisamos siempre del riesgo.',
    saving: 'Habitual: 15-35 % en el vuelo',
  },
  {
    id: 'equipaje',
    title: 'La cuenta real del equipaje',
    short: 'El vuelo de 19 € con maleta cuesta 89 €. Comparamos precios finales.',
    detail:
      'Calculamos siempre el precio con el equipaje que tú necesitas, asiento incluido si viajáis juntos. Muchas veces la compañía "cara" acaba siendo la barata cuando sumas los extras.',
    saving: 'Evita sorpresas de 40-70 € por persona',
  },
  {
    id: 'hotel-cancelable',
    title: 'Reserva cancelable + revisión',
    short: 'Bloqueamos ahora con cancelación gratis y volvemos a mirar cada semana.',
    detail:
      'Aseguramos la habitación a un precio razonable con cancelación gratuita, y si aparece algo mejor rehacemos la reserva. Tú tienes plaza desde el primer día y el precio solo puede bajar.',
    saving: 'Habitual: 10-25 % en el alojamiento',
  },
  {
    id: 'mercado-local',
    title: 'Buscar como si fueras de allí',
    short: 'La misma habitación cambia de precio según el portal y el mercado.',
    detail:
      'Comparamos el mismo hotel en varios canales, incluida la web del propio hotel, y valoramos la diferencia entre pagar ahora o al llegar. En algunos destinos el ahorro está en reservar en la moneda local.',
    saving: 'Habitual: 8-20 % en el alojamiento',
  },
  {
    id: 'traslados',
    title: 'El traslado que nadie calcula',
    short: 'Un hotel 20 € más barato a 40 minutos del centro sale caro.',
    detail:
      'Sumamos siempre el coste y el tiempo de moverte: aeropuerto-hotel, hotel-centro y las excursiones. Es la partida que más presupuestos rompe y casi nadie la mira antes de reservar.',
    saving: 'Evita 100-200 € de sobrecoste por viaje',
  },
  {
    id: 'temporada',
    title: 'La semana de al lado',
    short: 'Salir el 1 de septiembre en vez del 25 de agosto cambia el viaje de precio.',
    detail:
      'Conocemos la temporada alta real de cada destino, que casi nunca coincide con las vacaciones escolares españolas. Si puedes moverte una semana, te decimos exactamente cuál.',
    saving: 'Habitual: 25-50 % en el viaje completo',
  },
];
