/**
 * Limitador de peticiones en memoria (ventana deslizante por cubos).
 *
 * Suficiente para un despliegue de un solo proceso, que es el escenario de esta
 * aplicación. Si algún día se escala a varias instancias hay que sustituir el
 * `Map` por Redis manteniendo esta misma interfaz.
 */

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

/** Evita que el Map crezca sin control en un proceso de larga vida. */
function sweep(nowMs: number): void {
  if (buckets.size < 5_000) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= nowMs) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const nowMs = Date.now();
  sweep(nowMs);

  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= nowMs) {
    const fresh: Entry = { count: 1, resetAt: nowMs + windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: limit - 1, resetAt: fresh.resetAt, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  return {
    ok: entry.count <= limit,
    remaining,
    resetAt: entry.resetAt,
    retryAfterSeconds: Math.ceil((entry.resetAt - nowMs) / 1000),
  };
}

/** Solo para tests. */
export function resetRateLimits(): void {
  buckets.clear();
}

/** Extrae la IP del cliente detrás de un proxy (Vercel, Railway, Nginx…). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip') ?? headers.get('cf-connecting-ip') ?? '0.0.0.0';
}
