import { isAdvisor, modeCopy, quoteNoun } from '@/config/mode';

export type FaqItem = { question: string; answer: string; group: string };

export const faqs: FaqItem[] = [
  {
    group: 'Cómo trabajamos',
    question: `¿Cuánto cuesta pedir un ${quoteNoun}?`,
    answer: isAdvisor
      ? 'Nada. Rellenas el formulario, lo estudiamos y te enviamos la propuesta sin ningún compromiso. Solo cobramos nuestros honorarios si decides seguir adelante con el plan.'
      : 'Nada. Rellenas el formulario, lo estudiamos y te enviamos la propuesta sin ningún compromiso. Solo cobramos la tarifa de gestión si decides reservar con nosotros.',
  },
  {
    group: 'Cómo trabajamos',
    question: '¿Cuánto tardáis en contestar?',
    answer:
      'Menos de 24 horas laborables para escapadas y hasta 48 para viajes largos o multidestino, porque hay que comparar muchas más combinaciones. Si tienes prisa, dínoslo en el formulario y lo priorizamos.',
  },
  {
    group: 'Cómo trabajamos',
    question: '¿Y si no me gusta ninguna de las opciones?',
    answer:
      'Nos dices qué cambiarías y preparamos una segunda ronda sin coste. Si aun así no encaja, no pasa nada: no has pagado nada y ahí queda la cosa.',
  },
  {
    group: 'Precio',
    question: '¿Cómo ganáis dinero si decís que sois más baratos?',
    answer: isAdvisor
      ? 'De dos sitios, y no hay un tercero. Uno: nuestros honorarios de asesoramiento, en una línea aparte del plan. Y dos: cuando reservas por los enlaces que te pasamos, algunos hoteles, seguros y empresas de actividades nos pagan una comisión. Sale de su margen, no de tu bolsillo: pagas exactamente el mismo precio que si entraras por tu cuenta, y puedes comprobarlo. Es lo que nos permite dedicarle horas de verdad a cada plan.'
      : 'De tres sitios, y no hay un cuarto. Uno: la tarifa fija por persona que ves en el presupuesto, en una línea aparte. Dos: la comisión que algunos hoteles, seguros y empresas de actividades nos pagan por traerles la reserva, que sale de su margen y no de tu bolsillo. Y tres: si después de reservar el precio baja y rehacemos la reserva, nos quedamos una cuarta parte de ese ahorro. Nada de eso encarece tu viaje, y todo aparece detallado en el presupuesto.',
  },
  {
    group: 'Precio',
    question: 'Si os pagan comisión los hoteles, ¿me vais a colocar el que más os pague?',
    answer:
      'No, y puedes comprobarlo de dos formas: en la propuesta marcamos qué reservas nos generan comisión y cuáles no, y puedes contrastar cualquier precio entrando por tu cuenta sin nuestro enlace. Como nuestros honorarios son fijos y no un porcentaje, recomendarte algo más caro no nos hace ganar más. Si la mejor opción para ti es una que no nos paga nada, es la que te vamos a recomendar.',
  },
  {
    group: 'Precio',
    question: '¿Y si pago y luego no me convence?',
    answer: isAdvisor
      ? 'Te devolvemos el dinero, sin preguntas y sin que tengas que justificarte. Tienes 48 horas desde el pago, con una única condición: que no hayas abierto todavía ninguno de los enlaces de reserva. En cuanto abres uno, el trabajo ya te ha servido. Al devolverte el importe el plan vuelve a bloquearse, que es lo justo por ambas partes.'
      : 'Nos dices qué cambiarías y preparamos una segunda ronda sin coste. Si aun así no encaja, no has pagado nada y ahí queda la cosa.',
  },
  {
    group: 'Precio',
    question: '¿Por qué hay un mínimo por reserva?',
    answer:
      'Porque buscar para una persona cuesta prácticamente lo mismo que buscar para cuatro: los mismos aeropuertos, el mismo calendario, las mismas comparaciones. El mínimo es lo que hace que podamos seguir dedicándole horas reales a cada presupuesto en lugar de despacharlo en diez minutos.',
  },
  {
    group: 'Precio',
    question: '¿Los precios del presupuesto son los finales?',
    answer:
      'Sí, con todo incluido: tasas, equipaje que hayas pedido, traslados y nuestra tarifa. Lo único que puede moverse es el precio del vuelo o del hotel si tardas en confirmar, porque no somos nosotros quienes lo fijamos. Por eso cada presupuesto lleva una fecha de validez.',
  },
  {
    group: 'Precio',
    question: '¿Puedo pagar a plazos?',
    answer:
      'En muchos casos sí: bloqueamos el vuelo y dejamos el hotel con pago en destino o cancelación gratuita, de modo que el desembolso se reparte. Te lo indicamos en el presupuesto cuando es posible.',
  },
  {
    group: 'Seguridad',
    question: modeCopy.faqWhoBooks.question,
    answer: modeCopy.faqWhoBooks.answer,
  },
  {
    group: 'Seguridad',
    question: '¿Qué pasa si se cancela mi vuelo estando de viaje?',
    answer:
      'Nos escribes por WhatsApp y te ayudamos a reubicarte. Te explicamos además qué compensación te corresponde por el Reglamento (CE) 261/2004 y cómo reclamarla, que es dinero que mucha gente pierde por no saber que existe.',
  },
  {
    group: 'Seguridad',
    question: '¿Qué hacéis con mis datos?',
    answer:
      'Los usamos solo para preparar tu presupuesto y gestionar tu viaje. No los vendemos ni los cedemos a terceros con fines comerciales, y puedes pedirnos que los borremos cuando quieras. Está todo detallado en la política de privacidad.',
  },
  {
    group: 'El viaje',
    question: '¿Trabajáis con vuelos con escalas larguísimas o horarios imposibles?',
    answer:
      'Solo si tú nos dices que te compensa. En el formulario eliges si quieres vuelo directo, si aceptas una escala o si te da igual con tal de que sea lo más barato. Respetamos esa elección.',
  },
  {
    group: 'El viaje',
    question: '¿Podéis organizar viajes con niños o con movilidad reducida?',
    answer:
      'Sí. En el formulario hay un apartado para necesidades especiales: cunas, sillas, habitaciones familiares, accesibilidad sin escaleras o asistencia en el aeropuerto. Lo tenemos en cuenta al elegir vuelos y hoteles.',
  },
  {
    group: 'El viaje',
    question: '¿Y si el precio baja después de reservar?',
    answer: isAdvisor
      ? 'Seguimos vigilándolo. Si baja y tu reserva admite cambio o cancelación gratuita, te avisamos y te decimos exactamente qué hacer para aprovecharlo. El ahorro es íntegramente tuyo. Cuando la tarifa no admite cambios te lo decimos de antemano, antes de que reserves.'
      : 'Seguimos vigilándolo. Si la reserva permite cambio o cancelación gratuita y encontramos algo mejor, la rehacemos: el 75 % de ese ahorro es para ti y el 25 % para nosotros. Si no encontramos nada mejor, vigilarlo no te cuesta nada. Cuando la tarifa no admite cambios te lo decimos de antemano.',
  },
];
