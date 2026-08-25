'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { estimate } from '@/lib/estimator';
import { toDraftBrief, type WizardState } from '@/components/wizard/state';
import { eur } from '@/lib/utils';

const confidenceCopy = {
  baja: 'Muy orientativo: aún nos faltan datos.',
  media: 'Orientativo: se afinará con tus fechas exactas.',
  alta: 'Bastante afinado con lo que nos has contado.',
} as const;

/**
 * Horquilla en vivo. Es el gancho del formulario: el cliente ve cómo cambia el
 * precio según lo que responde, y entiende sin que se lo expliquemos por qué
 * ser flexible sale más barato.
 */
export function EstimatePanel({ state, compact = false }: { state: WizardState; compact?: boolean }) {
  const result = useMemo(() => {
    try {
      return estimate(toDraftBrief(state));
    } catch {
      return null;
    }
  }, [state]);

  if (!result) return null;

  const rows: [string, number][] = [
    ['Vuelos', result.breakdown.flights],
    ['Alojamiento', result.breakdown.stay],
    ['Traslados', result.breakdown.transfers],
    ['Extras', result.breakdown.extras],
    ['Nuestra tarifa', result.breakdown.fee],
  ];

  return (
    <aside
      aria-label="Estimación orientativa del viaje"
      className="rounded-card border border-ink-100 bg-white p-5 shadow-soft"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-ink-900">Estimación orientativa</h2>
        <Badge tone={result.confidence === 'alta' ? 'brand' : 'neutral'}>{result.confidence}</Badge>
      </div>

      <p className="mt-4 font-display text-3xl font-semibold leading-none text-ink-900">
        {eur(result.low)} <span className="text-ink-300">–</span> {eur(result.high)}
      </p>
      <p className="mt-1.5 text-sm text-ink-500">
        Total del viaje para {result.travelers} {result.travelers === 1 ? 'persona' : 'personas'} ·{' '}
        {result.nights} {result.nights === 1 ? 'noche' : 'noches'}
      </p>
      <p className="mt-1 text-sm font-medium text-brand-800">≈ {eur(result.perPerson)} por persona</p>

      {result.estimatedSaving > 0 ? (
        <p className="mt-4 rounded-xl bg-coral-50 px-3.5 py-2.5 text-sm leading-relaxed text-coral-700">
          <span className="font-bold">Ahorro estimado {eur(result.estimatedSaving)}</span> frente a reservarlo sin
          optimizar ({eur(result.marketReference)}).
        </p>
      ) : null}

      {!compact ? (
        <>
          <dl className="mt-5 space-y-1.5 border-t border-dashed border-ink-200 pt-4 text-sm">
            {rows
              .filter(([, value]) => value > 0)
              .map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-ink-600">
                  <dt>{label}</dt>
                  <dd className="tabular-nums">{eur(value)}</dd>
                </div>
              ))}
          </dl>

          {result.drivers.length > 0 ? (
            <div className="mt-5 border-t border-dashed border-ink-200 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">Qué mueve tu precio</h3>
              <ul className="mt-2.5 space-y-1.5 text-sm">
                {result.drivers.map((driver) => (
                  <li key={driver.label} className="flex items-start gap-2 text-ink-600">
                    <span
                      aria-hidden
                      className={driver.effect === 'sube' ? 'text-coral-500' : 'text-brand-600'}
                    >
                      {driver.effect === 'sube' ? '▲' : '▼'}
                    </span>
                    <span>{driver.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      <p className="mt-5 border-t border-ink-100 pt-4 text-xs leading-relaxed text-ink-400">
        Cálculo automático a partir de medianas de mercado. No es una oferta: el precio real te lo damos en el
        presupuesto, después de buscar de verdad.
      </p>
    </aside>
  );
}
