/**
 * Estados de una solicitud.
 *
 * Vive aparte del repositorio para que los componentes de cliente puedan
 * importarlo sin arrastrar el driver de SQLite al bundle del navegador.
 */

export const REQUEST_STATUSES = [
  'nueva',
  'en_estudio',
  'presupuestada',
  'aceptada',
  'reservada',
  'cerrada',
  'descartada',
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type StatusTone = 'brand' | 'coral' | 'amber' | 'success' | 'neutral';

export const STATUS_META: Record<RequestStatus, { label: string; tone: StatusTone; clientLabel: string }> = {
  nueva: { label: 'Nueva', tone: 'coral', clientLabel: 'Recibida' },
  en_estudio: { label: 'En estudio', tone: 'amber', clientLabel: 'Buscando opciones' },
  presupuestada: { label: 'Presupuestada', tone: 'brand', clientLabel: 'Presupuesto enviado' },
  aceptada: { label: 'Aceptada', tone: 'success', clientLabel: 'Presupuesto aceptado' },
  reservada: { label: 'Reservada', tone: 'success', clientLabel: 'Viaje reservado' },
  cerrada: { label: 'Cerrada', tone: 'neutral', clientLabel: 'Cerrada' },
  descartada: { label: 'Descartada', tone: 'neutral', clientLabel: 'Cerrada' },
};
