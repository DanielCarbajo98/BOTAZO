import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { repo, REQUEST_STATUSES, STATUS_META, type RequestStatus } from '@/lib/repository';
import { eur, relativeTime, truncate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Solicitudes', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const toneOf = (status: RequestStatus) => STATUS_META[status].tone as 'brand' | 'coral' | 'amber' | 'success' | 'neutral';

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = REQUEST_STATUSES.includes(params.estado as RequestStatus)
    ? (params.estado as RequestStatus)
    : undefined;
  const search = params.q?.slice(0, 80);

  const repository = repo();
  const counts = repository.countByStatus();
  const requests = repository.listRequests({ status, search, limit: 100 });
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const lastWeek = repository.countRecent(weekAgo);
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  const kpis = [
    { label: 'Sin abrir', value: counts.nueva, tone: 'coral' as const },
    { label: 'En estudio', value: counts.en_estudio, tone: 'amber' as const },
    { label: 'Presupuestadas', value: counts.presupuestada, tone: 'brand' as const },
    { label: 'Aceptadas', value: counts.aceptada + counts.reservada, tone: 'success' as const },
    { label: 'Últimos 7 días', value: lastWeek, tone: 'neutral' as const },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Solicitudes</h1>
          <p className="mt-1 text-sm text-ink-500">{total} solicitudes en total</p>
        </div>
        <Link
          href="/admin/export"
          prefetch={false}
          className="rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100"
        >
          Exportar CSV
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-ink-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{kpi.label}</p>
            <p className="mt-1.5 font-display text-3xl font-semibold text-ink-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      <form method="get" className="mt-8 flex flex-wrap items-center gap-3">
        <input
          type="search"
          name="q"
          defaultValue={search ?? ''}
          placeholder="Buscar por referencia, nombre, email o destino"
          className="h-11 min-w-64 flex-1 rounded-xl border border-ink-200 bg-white px-4 text-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        />
        {status ? <input type="hidden" name="estado" value={status} /> : null}
        <button
          type="submit"
          className="h-11 rounded-xl bg-ink-900 px-5 text-sm font-medium text-white hover:bg-ink-800"
        >
          Buscar
        </button>
      </form>

      <nav aria-label="Filtrar por estado" className="mt-4 flex flex-wrap gap-2">
        <FilterChip label="Todas" href={search ? `/admin?q=${encodeURIComponent(search)}` : '/admin'} active={!status} count={total} />
        {REQUEST_STATUSES.map((item) => (
          <FilterChip
            key={item}
            label={STATUS_META[item].label}
            href={`/admin?estado=${item}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
            active={status === item}
            count={counts[item]}
          />
        ))}
      </nav>

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink-200 bg-white">
        {requests.length === 0 ? (
          <p className="p-10 text-center text-ink-500">
            No hay solicitudes que coincidan con este filtro.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Referencia</th>
                  <th scope="col" className="px-4 py-3">Cliente</th>
                  <th scope="col" className="px-4 py-3">Viaje</th>
                  <th scope="col" className="px-4 py-3">Estimación</th>
                  <th scope="col" className="px-4 py-3">Estado</th>
                  <th scope="col" className="px-4 py-3">Recibida</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/solicitudes/${request.id}`}
                        className="font-mono font-semibold text-brand-800 hover:underline"
                      >
                        {request.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-ink-900">{request.contact_name}</span>
                      <span className="block text-xs text-ink-400">{request.contact_email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-ink-800">{truncate(request.destination_summary, 40)}</span>
                      <span className="block text-xs text-ink-400">
                        {request.dates_summary} · {request.travelers} pax
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-600">
                      {request.estimate ? `${eur(request.estimate.low)}–${eur(request.estimate.high)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={toneOf(request.status)}>{STATUS_META[request.status].label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-500">{relativeTime(request.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function FilterChip({ label, href, active, count }: { label: string; href: string; active: boolean; count: number }) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'rounded-pill bg-ink-900 px-3.5 py-1.5 text-sm font-semibold text-white'
          : 'rounded-pill border border-ink-200 bg-white px-3.5 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-100'
      }
    >
      {label} <span className={active ? 'text-ink-300' : 'text-ink-400'}>{count}</span>
    </Link>
  );
}
