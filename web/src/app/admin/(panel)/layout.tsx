import Link from 'next/link';
import { LogoMark } from '@/components/site/Logo';
import { logoutAction } from '@/app/admin/actions';
import { requireSession } from '@/lib/auth';
import { site } from '@/config/site';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3.5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <LogoMark className="size-8" />
            <span className="font-display text-lg font-semibold text-ink-900">{site.name}</span>
            <span className="rounded-pill bg-ink-900 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white">
              Panel
            </span>
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <Link href="/" target="_blank" className="text-ink-500 hover:text-ink-900">
              Ver la web ↗
            </Link>
            <span className="hidden text-ink-300 sm:inline">·</span>
            <span className="hidden text-ink-600 sm:inline">{session.name}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-ink-200 px-3 py-1.5 font-medium text-ink-700 transition-colors hover:bg-ink-100"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
