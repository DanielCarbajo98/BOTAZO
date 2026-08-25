export type Testimonial = {
  name: string;
  detail: string;
  trip: string;
  quote: string;
  saving?: string;
};

/**
 * PLANTILLA. Sustituir por opiniones reales antes de publicar: publicar
 * testimonios inventados como si fueran reales es publicidad engañosa.
 */
export const testimonials: Testimonial[] = [
  {
    name: 'Nombre del cliente',
    detail: 'Pareja, Madrid',
    trip: 'Roma · 4 noches',
    quote:
      'Espacio para la opinión real del cliente. Recomendado: qué buscaba, qué le preocupaba y qué acabó pagando.',
    saving: '180 € menos que su mejor búsqueda',
  },
  {
    name: 'Nombre del cliente',
    detail: 'Familia con 2 niños, Valencia',
    trip: 'Riviera Maya · 9 noches',
    quote: 'Espacio para la opinión real del cliente.',
    saving: '640 € menos que la agencia de su barrio',
  },
  {
    name: 'Nombre del cliente',
    detail: 'Grupo de amigos, Bilbao',
    trip: 'Modo sorpréndeme · 3 noches',
    quote: 'Espacio para la opinión real del cliente.',
    saving: '95 € por persona',
  },
];
