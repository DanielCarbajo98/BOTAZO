import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/LoginForm';
import { LogoMark } from '@/components/site/Logo';
import { getSession } from '@/lib/auth';
import { repo } from '@/lib/repository';
import { site } from '@/config/site';

export const metadata: Metadata = { title: 'Acceso al panel', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSession()) redirect('/admin');
  const { next } = await searchParams;
  const noUsers = repo().countAdmins() === 0;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-night px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5">
          <LogoMark />
          <span className="font-display text-xl font-semibold text-white">{site.name}</span>
        </div>
        <h1 className="mt-8 text-center text-2xl text-white">Panel de gestión</h1>

        <div className="mt-8 rounded-card bg-white p-6 shadow-lift">
          {noUsers ? (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              <p className="font-semibold">Todavía no hay ningún usuario.</p>
              <p className="mt-1.5">
                Crea el primero desde la terminal con{' '}
                <code className="rounded bg-white px-1.5 py-0.5">npm run db:seed</code>.
              </p>
            </div>
          ) : (
            <LoginForm next={next?.startsWith('/admin') ? next : '/admin'} />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-500">
          Acceso restringido al equipo. Los intentos están limitados por dirección IP.
        </p>
      </div>
    </div>
  );
}
