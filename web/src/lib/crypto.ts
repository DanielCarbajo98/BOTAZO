import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

/** Alfabeto sin caracteres ambiguos (0/O, 1/I/L): las referencias se dictan por teléfono. */
const REFERENCE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function newId(): string {
  return randomUUID();
}

/** Referencia legible del tipo VJ-7K3QP9 */
export function newReference(prefix = 'VJ'): string {
  const bytes = randomBytes(6);
  let out = '';
  for (const byte of bytes) {
    out += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  }
  return `${prefix}-${out}`;
}

export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/* ------------------------------------------------------------------ *
 * Contraseñas (scrypt)
 * ------------------------------------------------------------------ */

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 } as const;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password.normalize('NFKC'), salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS).toString('hex');
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts as [string, string, string, string, string, string];
  const derived = scryptSync(password.normalize('NFKC'), salt, SCRYPT_KEYLEN, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  }).toString('hex');
  return safeEqual(derived, hash);
}

/* ------------------------------------------------------------------ *
 * Tokens firmados (sesión de admin, enlaces de presupuesto)
 * ------------------------------------------------------------------ */

export class MissingSecretError extends Error {
  constructor() {
    super(
      'Falta AUTH_SECRET. Genera uno con `openssl rand -base64 48` y añádelo a .env.local antes de arrancar.',
    );
    this.name = 'MissingSecretError';
  }
}

export function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') throw new MissingSecretError();
    // En desarrollo permitimos un secreto derivado para no bloquear el arranque.
    return 'dev-only-insecure-secret-change-me-please-000000';
  }
  return secret;
}

export type SignedPayload = Record<string, string | number | boolean>;

export function sign(payload: SignedPayload, ttlSeconds: number): string {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  const mac = createHmac('sha256', getSecret()).update(encoded).digest('base64url');
  return `${encoded}.${mac}`;
}

export function verify<T extends SignedPayload>(token: string): (T & { exp: number }) | null {
  const [encoded, mac] = token.split('.');
  if (!encoded || !mac) return null;
  const expected = createHmac('sha256', getSecret()).update(encoded).digest('base64url');
  if (!safeEqual(mac, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T & { exp: number };
    if (typeof parsed.exp !== 'number' || parsed.exp * 1000 < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Hash de IP con sal del servidor: nos permite limitar abuso sin guardar la IP. */
export function hashIp(ip: string): string {
  return createHmac('sha256', getSecret()).update(`ip:${ip}`).digest('hex').slice(0, 32);
}
