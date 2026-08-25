'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { eur } from '@/lib/utils';

type ManualDetails = { bizum?: string; iban?: string; holder?: string };

/**
 * El muro de pago tal y como lo ve el cliente.
 *
 * Con Stripe configurado abre la pasarela. Sin Stripe muestra los datos para
 * pagar por Bizum o transferencia y el agente lo desbloquea desde el panel: así
 * se puede empezar a cobrar sin dar de alta nada.
 */
export function UnlockPanel({
  reference,
  token,
  quoteId,
  amount,
  travelers,
  bestSaving,
}: {
  reference: string;
  token: string;
  quoteId: string;
  amount: number;
  travelers: number;
  /** Ahorro de la mejor opción, ya descontados nuestros honorarios. */
  bestSaving: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState<ManualDetails | null>(null);

  const unlock = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/pago/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reference, token, quoteId }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        url?: string;
        manual?: boolean;
        details?: ManualDetails;
        alreadyPaid?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'No hemos podido iniciar el pago.');
        setLoading(false);
        return;
      }
      if (payload.alreadyPaid) {
        window.location.reload();
        return;
      }
      if (payload.url) {
        window.location.href = payload.url;
        return;
      }
      setManual(payload.details ?? {});
      setLoading(false);
    } catch {
      setError('Parece que no hay conexión. Inténtalo otra vez.');
      setLoading(false);
    }
  };

  return (
    <section
      aria-labelledby="desbloqueo"
      className="overflow-hidden rounded-card border-2 border-brand-600 bg-white shadow-lift"
    >
      <div className="bg-night px-6 py-7 text-white md:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-300">Último paso</p>
        <h2 id="desbloqueo" className="mt-2 text-2xl md:text-3xl">
          Desbloquea tu plan por {eur(amount)}
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-300">
          Ya has visto lo que cuesta cada opción y lo que te ahorras. Lo que falta es el trabajo por el que pagas:
          qué compañía, qué día y a qué hora exacta, qué alojamiento, y el enlace directo de cada reserva.
        </p>

        {bestSaving > amount ? (
          <div className="mt-6 rounded-2xl border border-brand-400/30 bg-brand-500/10 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-300">Échale la cuenta</p>
            <dl className="mt-3 space-y-1.5 text-[0.98rem]">
              <div className="flex justify-between gap-4 text-ink-300">
                <dt>Lo que te ahorras frente a reservarlo sin optimizar</dt>
                <dd className="tabular-nums font-semibold text-white">{eur(bestSaving)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-ink-300">
                <dt>Lo que te cobramos por el plan</dt>
                <dd className="tabular-nums font-semibold text-white">−{eur(amount)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-white/15 pt-2 text-lg font-bold text-brand-200">
                <dt>Sales ganando</dt>
                <dd className="tabular-nums">{eur(bestSaving - amount)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-ink-400">
              Y sin pasarte una tarde entera comparando pestañas. Si al final no te cuadra, no pagas.
            </p>
          </div>
        ) : null}
      </div>

      <div className="px-6 py-6 md:px-8">
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            ['✈️', 'Compañía, fechas y horarios exactos de cada vuelo'],
            ['🏨', 'Nombre del alojamiento y sus condiciones'],
            ['🔗', 'Enlace directo para reservar cada cosa'],
            ['💬', 'Te acompañamos por WhatsApp mientras reservas'],
          ].map(([icon, text]) => (
            <li key={text} className="flex items-start gap-2.5 text-[0.95rem] leading-relaxed text-ink-700">
              <span aria-hidden className="mt-0.5">
                {icon}
              </span>
              {text}
            </li>
          ))}
        </ul>

        {error ? (
          <p role="alert" className="mt-5 rounded-xl bg-coral-50 px-4 py-3 text-sm text-coral-700">
            {error}
          </p>
        ) : null}

        {manual ? (
          <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5">
            <p className="font-semibold text-brand-900">Paga {eur(amount)} por cualquiera de estas vías</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              {manual.bizum ? (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-ink-600">Bizum</dt>
                  <dd className="font-mono font-semibold text-ink-900">{manual.bizum}</dd>
                </div>
              ) : null}
              {manual.iban ? (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-ink-600">Transferencia</dt>
                  <dd className="font-mono font-semibold text-ink-900">{manual.iban}</dd>
                </div>
              ) : null}
              {manual.holder ? (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-ink-600">Titular</dt>
                  <dd className="font-semibold text-ink-900">{manual.holder}</dd>
                </div>
              ) : null}
              <div className="flex flex-wrap justify-between gap-2 border-t border-brand-200 pt-2">
                <dt className="text-ink-600">Concepto</dt>
                <dd className="font-mono font-semibold text-ink-900">{reference}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              Avísanos por WhatsApp cuando lo hagas y te desbloqueamos el plan en cuanto lo veamos, normalmente en
              menos de una hora.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <Button size="lg" variant="coral" onClick={unlock} disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Abriendo…' : `Desbloquear plan · ${eur(amount)}`}
            </Button>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              Pago único de {eur(amount)} para {travelers} {travelers === 1 ? 'viajero' : 'viajeros'}. No es una
              suscripción y no se renueva. El viaje lo pagas después, directamente a cada proveedor.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
