import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { NotesEditor } from '@/components/admin/NotesEditor';
import { QuoteBuilder } from '@/components/admin/QuoteBuilder';
import { StatusControl } from '@/components/admin/StatusControl';
import { BriefSummary } from '@/components/quote/BriefSummary';
import { nightsFromBrief } from '@/lib/brief';
import { calculateFee } from '@/lib/estimator';
import { repo, STATUS_META } from '@/lib/repository';
import { pricing, site } from '@/config/site';
import { eur, formatDateTime, relativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Detalle de solicitud', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function SolicitudDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repository = repo();
  const request = repository.getRequestById(id);
  if (!request) notFound();

  const quotes = repository.listQuotes(request.id);
  const activeQuote = quotes[0] ?? null;
  const activeOptions = activeQuote ? repository.listOptions(activeQuote.id) : [];
  const events = repository.listEvents(request.id);
  const nights = nightsFromBrief(request.brief.dates);
  const suggestedFee = calculateFee(request.brief);

  const whatsappText = encodeURIComponent(
    `Hola ${request.contact_name.split(' ')[0]}, te escribo de ${site.name} por tu solicitud ${request.reference}.`,
  );

  return (
    <>
      <Link href="/admin" className="text-sm text-ink-500 hover:text-ink-900">
        ← Volver a solicitudes
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl">
            <span className="font-mono tracking-wider">{request.reference}</span>
            <Badge tone="neutral">{STATUS_META[request.status].label}</Badge>
          </h1>
          <p className="mt-1.5 text-ink-600">
            {request.destination_summary} · {request.dates_summary} · {request.travelers} viajeros
          </p>
          <p className="mt-1 text-sm text-ink-400">
            Recibida {relativeTime(request.created_at)} ({formatDateTime(request.created_at)})
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <a
            href={`https://wa.me/${(request.contact_phone ?? '').replace(/\D/g, '')}?text=${whatsappText}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2 font-medium text-ink-700 hover:bg-ink-100"
          >
            💬 WhatsApp
          </a>
          <a
            href={`mailto:${request.contact_email}?subject=${encodeURIComponent(`Tu presupuesto ${request.reference} · ${site.name}`)}`}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2 font-medium text-ink-700 hover:bg-ink-100"
          >
            ✉️ Email
          </a>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Estado</h2>
        <div className="mt-3">
          <StatusControl requestId={request.id} status={request.status} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-ink-200 bg-white p-5">
            <h2 className="text-lg">Cliente</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {(
                [
                  ['Nombre', request.contact_name],
                  ['Email', request.contact_email],
                  ['Teléfono', request.contact_phone ?? '—'],
                  ['Canal preferido', request.contact_channel],
                  ['Mejor momento', request.brief.contact.bestTime ?? '—'],
                  ['Prioritario', request.brief.contact.priority ? `Sí · ${eur(pricing.priority.fee)}` : 'No'],
                  ['Comercial', request.brief.contact.marketingOptIn ? 'Acepta' : 'No acepta'],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-ink-500">{label}</dt>
                  <dd className="text-right font-medium text-ink-900">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-ink-200 bg-white p-5">
            <h2 className="text-lg">Briefing</h2>
            <div className="mt-3">
              <BriefSummary brief={request.brief} />
            </div>

            {[
              ['A evitar', request.brief.trip.avoid],
              ['Notas de fechas', request.brief.dates.notes],
              ['Necesidades especiales', request.brief.travelers.mobilityNeeds],
              ['Notas de vuelos', request.brief.flights.notes],
              ['Notas de alojamiento', request.brief.stay.notes],
              ['Comentarios libres', request.brief.extras.notes],
            ]
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div key={label as string} className="mt-4 rounded-xl bg-ink-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{label}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{value}</p>
                </div>
              ))}
          </section>

          {request.estimate ? (
            <section className="rounded-2xl border border-ink-200 bg-white p-5">
              <h2 className="text-lg">Estimación automática</h2>
              <p className="mt-2 font-display text-2xl font-semibold text-ink-900">
                {eur(request.estimate.low)} – {eur(request.estimate.high)}
              </p>
              <dl className="mt-3 space-y-1 text-sm">
                {(
                  [
                    ['Vuelos', request.estimate.breakdown.flights],
                    ['Alojamiento', request.estimate.breakdown.stay],
                    ['Traslados', request.estimate.breakdown.transfers],
                    ['Extras', request.estimate.breakdown.extras],
                    ['Tarifa', request.estimate.breakdown.fee],
                  ] as [string, number][]
                ).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 text-ink-600">
                    <dt>{label}</dt>
                    <dd className="tabular-nums">{eur(value)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-ink-400">
                Confianza: {request.estimate.confidence}. Tarifa sugerida para este viaje: {eur(suggestedFee)}.
              </p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-ink-200 bg-white p-5">
            <h2 className="text-lg">Notas internas</h2>
            <div className="mt-3">
              <NotesEditor requestId={request.id} initial={request.internal_notes ?? ''} />
            </div>
          </section>

          <section className="rounded-2xl border border-ink-200 bg-white p-5">
            <h2 className="text-lg">Historial</h2>
            <ol className="mt-3 space-y-3">
              {events.map((event) => (
                <li key={event.id} className="border-l-2 border-ink-200 pl-3">
                  <p className="text-sm text-ink-800">{event.message}</p>
                  <p className="text-xs text-ink-400">
                    {event.actor} · {formatDateTime(event.created_at)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <QuoteBuilder
            requestId={request.id}
            quote={activeQuote}
            options={activeOptions}
            estimate={request.estimate}
            travelers={request.travelers}
            nights={nights}
            suggestedFee={suggestedFee}
            destination={request.destination_summary}
          />

          {quotes.length > 1 ? (
            <section className="rounded-2xl border border-ink-200 bg-white p-5">
              <h2 className="text-lg">Presupuestos anteriores</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {quotes.slice(1).map((quote) => (
                  <li key={quote.id} className="flex justify-between gap-3 border-b border-ink-100 pb-2 last:border-0">
                    <span className="text-ink-800">{quote.title}</span>
                    <span className="text-ink-400">
                      {quote.status} · {formatDateTime(quote.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
