import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sign, verify, verifyPassword } from '@/lib/crypto';
import { repo, type AdminUser } from '@/lib/repository';

const COOKIE_NAME = 'vl_session';
const TTL_SECONDS = 60 * 60 * 8; // 8 horas de jornada

export type Session = { sub: string; email: string; name: string; role: string };

export async function createSession(user: AdminUser): Promise<void> {
  const token = sign({ sub: user.id, email: user.email, name: user.name, role: user.role }, TTL_SECONDS);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verify<Session>(token);
  if (!payload) return null;
  // El usuario podría haber sido borrado desde que se emitió la cookie.
  const user = repo().findAdminById(payload.sub);
  if (!user) return null;
  return { sub: user.id, email: user.email, name: user.name, role: user.role };
}

/** Para páginas del backoffice: redirige al login si no hay sesión. */
export async function requireSession(returnTo = '/admin'): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/admin/login?next=${encodeURIComponent(returnTo)}`);
  return session;
}

export function authenticate(email: string, password: string): AdminUser | null {
  const user = repo().findAdminByEmail(email);
  if (!user) {
    // Coste constante: evita distinguir "usuario no existe" de "contraseña mala".
    verifyPassword(password, 'scrypt$16384$8$1$00$00');
    return null;
  }
  if (!verifyPassword(password, user.password_hash)) return null;
  return user;
}
