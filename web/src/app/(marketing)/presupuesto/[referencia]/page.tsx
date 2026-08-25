import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { BriefSummary } from '@/components/quote/BriefSummary';
import { QuoteActions } from '@/components/quote/QuoteActions';
import { QuoteView } from '@/components/quote/QuoteView';
import { site } from '@/config/site';
import { isAdvisor, quoteNoun } from '@/config/mode';
import { UnlockPanel } from '@/components/quote/UnlockPanel';
import { isUnlocked, optionSaving, redactOption } from '@/lib/quote';
import { isSessionPaid, paymentMode } from '@/lib/payments';
import { repo, REQUEST_STATUSES, STATUS_META, type RequestStatus } from '@/lib/repository';
import { eur, formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tu solicitud',
  robots: { index: false, follow: false },
};

const TIMELINE: RequestStatus[] = ['nueva', 'en_estudio', 'presupuestada', 'aceptada', 'reservada'];

export default async function SolicitudPage({
  params,
  searchParams,
}: {
  params: Promise<{ referencia: string }>;
  searchParams: Promise<{ t?: string; nuevo?: string; pago?: string; session_id?: string }>;
}) {
  const { referencia } = await params;
  const { t: token, nuevo, pago, session_id: sessionId } = await searchParams;

  if (!token) return <AccesoDenegado reference={referencia} />;

  const request = repo().verifyAccess(referencia, token);
  if (!request) return <AccesoDenegado reference={referencia} />;

  // Vuelta de la pasarela: confirmamos el pago contra Stripe antes de abrir
  // nada. Es la red por si el webhook no está configurado o llega tarde.
  if (pago === 'ok' && sessionId) {
    await confirmarPago(sessionId, request.id);
  }

  const visible = repo().getVisibleQuote(request.id);
  const unlocked = visible ? isUnlocked(visible.quote) : false;
  const options = visible ? visible.options.map((option) => redactOption(option, unlocked)) : [];
  // El ahorro ya lleva descontados nuestros honorarios: es lo que gana de verdad.
  const bestSaving = options.reduce((best, option) => Math.max(best, optionSaving(option)), 0);
  const status = REQUEST_STATUSES.includes(request.status) ? request.status : 'nueva';
  const currentIndex = TIMELINE.indexOf(status);
  const isNew = nuevo === '1';

  return (
    <div className="bg-sand-50 py-12 md:py-16">
      <div className="container-page max-w-5xl">
        {isNew ? (
          <div className="mb-10 rounded-card border-2 border-brand-600 bg-brand-50 p-6 md:p-8">
            <p className="text-3xl" aria-hidden>
              🎉
            </p>
            <h1 className="mt-3 text-2xl md:text-3xl">Solicitud recibida, {request.contact_name.split(' ')[0]}</h1>
            <p className="mt-3 max-w-2xl leading-relaxed text-ink-700">
              Ya estamos con ella. Te enviaremos el {quoteNoun} por{' '}
              <strong>{request.contact_channel === 'email' ? 'email' : request.contact_channel}</strong> en menos de{' '}
              {site.contact.responseTimeHours} horas. Guarda este enlace: es tu acceso privado a todo el proceso.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-mono text-lg font-bold tracking-wider text-ink-900">
              {request.reference}
            </p>
          </div>
        ) : (
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Solicitud</p>
            <h1 className="mt-1.5 flex flex-wrap items-center gap-3 text-2xl md:text-3xl">
              <span className="font-mono tracking-wider">{request.reference}</span>
              <Badge tone="brand">{STATUS_META[status].clientLabel}</Badge>
            </h1>
            <p className="mt-2 text-ink-600">
              {request.destination_summary} · {request.dates_summary}
            </p>
          </div>
        )}

        {/* Línea de estado */}
        <ol className="mb-12 grid gap-3 sm:grid-cols-5">
          {TIMELINE.map((item, index) => {
            const reached = currentIndex >= index;
            return (
              <li
                key={item}
                className={
                  reached
                    ? 'rounded-2xl border-2 border-brand-600 bg-white p-4'
                    : 'rounded-2xl border border-ink-100 bg-white/60 p-4'
                }
              >
                <span
                  className={
                    reached
                      ? 'grid size-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white'
                      : 'grid size-7 place-items-center rounded-full bg-ink-100 text-xs font-bold text-ink-400'
                  }
                >
                  {reached ? '✓' : index + 1}
                </span>
                <p className={reached ? 'mt-2.5 text-sm font-semibold text-ink-900' : 'mt-2.5 text-sm text-ink-400'}>
                  {STATUS_META[item].clientLabel}
                </p>
              </li>
            );
          })}
        </ol>

        {visible ? (
          <div className="space-y-8">
            {pago === 'cancelado' && !unlocked ? (
              <p className="rounded-card border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
                Has salido del pago sin completarlo. No se te ha cobrado nada y tu plan sigue aquí cuando quieras.
              </p>
            ) : null}

            <QuoteView
              quote={visible.quote}
              options={options}
              travelers={request.travelers}
              unlocked={unlocked}
              requestId={request.id}
            />

            {unlocked ? (
              <QuoteActions
                reference={request.reference}
                token={token}
                quoteId={visible.quote.id}
                alreadyAnswered={visible.quote.status === 'aceptado' || visible.quote.status === 'cambios'}
              />
            ) : (
              <UnlockPanel
                reference={request.reference}
                token={token}
                quoteId={visible.quote.id}
                amount={visible.quote.unlock_fee}
                travelers={request.travelers}
                bestSaving={bestSaving}
              />
            )}
          </div>
        ) : (
          <section className="rounded-card border border-ink-100 bg-white p-6 md:p-8">
            <h2 className="text-xl">Estamos buscando</h2>
            <p className="mt-2 max-w-2xl leading-relaxed text-ink-600">
              Estamos comparando aeropuertos, fechas y alojamientos con lo que nos contaste. Cuando tengamos las
              tres opciones aparecerán aquí{isAdvisor ? ', cada una con su enlace de reserva,' : ''} y te avisaremos.
            </p>
            {request.estimate ? (
              <div className="mt-6 rounded-2xl bg-sand-100 p-5">
                <p className="text-sm font-semibold text-ink-800">Horquilla orientativa mientras tanto</p>
                <p className="mt-1.5 font-display text-2xl font-semibold text-ink-900">
                  {eur(request.estimate.low)} – {eur(request.estimate.high)}
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  Cálculo automático, no una oferta. El precio real llega con el presupuesto.
                </p>
              </div>
            ) : null}
          </section>
        )}

        <section className="mt-8 rounded-card border border-ink-100 bg-white p-6 md:p-8">
          <h2 className="text-xl">Lo que nos pediste</h2>
          <div className="mt-5">
            <BriefSummary brief={request.brief} />
          </div>
          <p className="mt-6 border-t border-ink-100 pt-4 text-sm text-ink-500">
            ¿Algo ha cambiado? Escríbenos y lo ajustamos. Solicitud creada el {formatDateTime(request.created_at)}.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href={`https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(`Hola, os escribo por la solicitud ${request.reference}`)}`}
              variant="outline"
              size="sm"
            >
              💬 Escribirnos por WhatsApp
            </ButtonLink>
            <ButtonLink href={`mailto:${site.contact.email}?subject=${encodeURIComponent(request.reference)}`} variant="ghost" size="sm">
              ✉️ Escribirnos por email
            </ButtonLink>
          </div>
        </section>
      </div>
    </div>
  );
}

function AccesoDenegado({ reference }: { reference: string }) {
  return (
    <div className="container-page flex min-h-[60vh] max-w-lg flex-col justify-center py-20 text-center">
      <p className="text-4xl" aria-hidden>
        🔒
      </p>
      <h1 className="mt-4 text-2xl">Este enlace no es válido</h1>
      <p className="mt-3 leading-relaxed text-ink-600">
        El enlace de la solicitud <span className="font-mono font-semibold">{reference}</span> está incompleto o ha
        caducado. Usa el enlace exacto que te enviamos, o pide que te lo reenviemos.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink href="/seguimiento">Recuperar mi enlace</ButtonLink>
        <ButtonLink href="/contacto" variant="outline">
          Contactar
        </ButtonLink>
      </div>
      <p className="mt-8 text-sm text-ink-400">
        <Link href="/" className="underline underline-offset-4">
          Volver al inicio
        </Link>
      </p>
    </div>
  );
}


/**
 * Confirma el pago contra Stripe al volver de la pasarela.
 *
 * Nunca damos por bueno el `?pago=ok` de la URL: cualquiera podría escribirlo a
 * mano. Preguntamos a Stripe, y además comprobamos que la sesión pagada
 * corresponde a un presupuesto de **esta** solicitud.
 */
async function confirmarPago(sessionId: string, requestId: string): Promise<void> {
  if (paymentMode() !== 'stripe') return;
  try {
    const { paid, quoteId } = await isSessionPaid(sessionId);
    if (!paid || !quoteId) return;

    const quote = repo().getQuote(quoteId);
    if (!quote || quote.request_id !== requestId) return;

    repo().markQuotePaid(quoteId, { method: 'Stripe', reference: sessionId });
  } catch (error) {
    // Si Stripe no responde, el webhook acabará desbloqueándolo igualmente.
    console.warn('[pago] no se pudo confirmar la sesión:', error);
  }
}
