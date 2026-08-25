import { sign, verify } from '@/lib/crypto';
import { isSafeUrl } from '@/lib/quote';

/**
 * Enlaces de reserva con contador de clics.
 *
 * En lugar de dar al cliente el enlace de afiliado en crudo, le damos uno
 * nuestro (`/ir/…`) que registra el clic y luego redirige. Así sabemos quién ha
 * ido a reservar qué y cuándo, y podemos cambiar el destino sin reenviar nada.
 *
 * El destino viaja **firmado** dentro del propio enlace. Sin firma esto sería
 * un redirector abierto de libro: cualquiera podría montar
 * `zarpea.es/ir/?url=sitio-malicioso` y usar nuestro dominio de tapadera.
 */
export type LinkPayload = {
  /** URL de destino. */
  u: string;
  /** Solicitud, para poder contar el clic. */
  r: string;
  /** Presupuesto y opción, para saber cuál de las tres le ha interesado. */
  q: string;
  o: string;
  /** Qué era: "Vuelo", "Alojamiento", el nombre de la actividad… */
  l: string;
};

/** Un año largo: el cliente puede volver al plan meses después. */
const TTL_SECONDS = 400 * 24 * 60 * 60;

export function signLink(payload: LinkPayload): string {
  return sign(payload, TTL_SECONDS);
}

export function verifyLink(token: string): LinkPayload | null {
  const payload = verify<LinkPayload>(token);
  if (!payload) return null;
  // Aunque la firma sea buena, el destino tiene que seguir siendo http(s).
  if (!isSafeUrl(payload.u)) return null;
  return payload;
}

/** href listo para pintar. Si no hay destino válido, devuelve null. */
export function trackedHref(payload: LinkPayload): string | null {
  if (!isSafeUrl(payload.u)) return null;
  return `/ir/${signLink(payload)}`;
}
