'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { EstimatePanel } from '@/components/wizard/EstimatePanel';
import { Resumen } from '@/components/wizard/Resumen';
import {
  AlojamientoStep,
  ContactoStep,
  DestinoStep,
  ExtrasStep,
  FechasStep,
  OrigenStep,
  PresupuestoStep,
  ViajerosStep,
  VuelosStep,
  type StepProps,
} from '@/components/wizard/Steps';
import {
  completedSteps,
  initialState,
  steps,
  STORAGE_KEY,
  toBrief,
  validateStep,
  type Errors,
  type StepId,
  type WizardState,
} from '@/components/wizard/state';
import { cn } from '@/lib/utils';

const STEP_COMPONENTS: Partial<Record<StepId, (props: StepProps) => React.ReactNode>> = {
  destino: DestinoStep,
  origen: OrigenStep,
  fechas: FechasStep,
  viajeros: ViajerosStep,
  vuelos: VuelosStep,
  alojamiento: AlojamientoStep,
  extras: ExtrasStep,
  presupuesto: PresupuestoStep,
  contacto: ContactoStep,
};

export function Wizard({ presetDestination }: { presetDestination?: string }) {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(() => initialState(presetDestination));
  const [index, setIndex] = useState(0);
  /** Paso más lejano al que ha llegado el cliente: solo esos se marcan como hechos. */
  const [maxVisited, setMaxVisited] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [showEstimateMobile, setShowEstimateMobile] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const startedAtRef = useRef<number>(Date.now());
  /** Campo trampa para bots: un humano nunca lo rellena porque no lo ve. */
  const honeypotRef = useRef<HTMLInputElement>(null);

  const step = steps[index]!;
  const isLast = step.id === 'resumen';

  /* ---------------- Persistencia local del borrador ---------------- */

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { state: WizardState; index: number; savedAt: number };
      // Un borrador de más de 30 días ya no le sirve a nadie.
      if (Date.now() - parsed.savedAt > 30 * 86_400_000) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }
      setState((current) => ({
        ...parsed.state,
        trip: presetDestination
          ? { ...parsed.state.trip, destinations: [presetDestination], destinationMode: 'known' }
          : parsed.state.trip,
        contact: { ...parsed.state.contact, privacyAccepted: current.contact.privacyAccepted },
      }));
      const restoredIndex = Math.min(parsed.index, steps.length - 1);
      setIndex(restoredIndex);
      setMaxVisited(restoredIndex);
      setRestored(true);
    } catch {
      /* borrador corrupto: seguimos con el formulario vacío */
    }
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, index, savedAt: Date.now() }));
      } catch {
        /* almacenamiento lleno o bloqueado: no es crítico */
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state, index]);

  /* ---------------- Navegación ---------------- */

  const set = useCallback(<K extends keyof WizardState>(key: K, value: Partial<WizardState[K]>) => {
    setState((current) => ({ ...current, [key]: { ...current[key], ...value } }));
  }, []);

  const focusHeading = () => {
    window.requestAnimationFrame(() => {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  };

  const goTo = (target: StepId) => {
    const targetIndex = steps.findIndex((item) => item.id === target);
    if (targetIndex < 0) return;
    setErrors({});
    setIndex(targetIndex);
    setMaxVisited((current) => Math.max(current, targetIndex));
    focusHeading();
  };

  const back = () => {
    setErrors({});
    setIndex((current) => Math.max(0, current - 1));
    focusHeading();
  };

  const next = () => {
    const stepErrors = validateStep(step.id, state);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      focusHeading();
      return;
    }
    const nextIndex = Math.min(steps.length - 1, index + 1);
    setIndex(nextIndex);
    setMaxVisited((visited) => Math.max(visited, nextIndex));
    focusHeading();
  };

  /* ---------------- Envío ---------------- */

  const submit = async () => {
    // Revalidamos todos los pasos: el cliente puede haber saltado hacia atrás.
    for (const item of steps) {
      const stepErrors = validateStep(item.id, state);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        goTo(item.id);
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          brief: toBrief(state),
          website: honeypotRef.current?.value ?? '',
          elapsedMs: Date.now() - startedAtRef.current,
        }),
      });

      const payload = (await response.json()) as { ok: boolean; reference?: string; token?: string; error?: string };

      if (!response.ok || !payload.ok || !payload.reference || !payload.token) {
        setSubmitError(payload.error ?? 'No hemos podido enviar tu solicitud. Inténtalo de nuevo en un momento.');
        setSubmitting(false);
        return;
      }

      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignorado */
      }
      router.push(`/presupuesto/${payload.reference}?t=${encodeURIComponent(payload.token)}&nuevo=1`);
    } catch {
      setSubmitError('Parece que no hay conexión. Comprueba tu red e inténtalo otra vez.');
      setSubmitting(false);
    }
  };

  /* ---------------- Progreso ---------------- */

  const done = useMemo(() => {
    const valid = completedSteps(state);
    // Un paso solo cuenta como completado si el cliente ha pasado por él.
    return new Set(steps.filter((item, i) => i < maxVisited && valid.has(item.id)).map((item) => item.id));
  }, [state, maxVisited]);
  const progress = Math.round((index / (steps.length - 1)) * 100);
  const StepComponent = STEP_COMPONENTS[step.id];

  return (
    <div className="container-page py-10 md:py-14">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          {/* Progreso */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4 text-sm">
              <p className="font-semibold text-ink-800">
                Paso {index + 1} de {steps.length}
              </p>
              <p className="text-ink-500">{progress}% completado</p>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso del formulario"
              className="mt-2 h-2 overflow-hidden rounded-pill bg-ink-100"
            >
              <div
                className="h-full rounded-pill bg-brand-600 transition-[width] duration-500"
                style={{ width: `${Math.max(4, progress)}%` }}
              />
            </div>

            <ol className="mt-5 hidden flex-wrap gap-1.5 lg:flex">
              {steps.map((item, itemIndex) => {
                const reachable = itemIndex <= index || done.has(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={!reachable}
                      onClick={() => goTo(item.id)}
                      aria-current={itemIndex === index ? 'step' : undefined}
                      className={cn(
                        'rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors',
                        itemIndex === index
                          ? 'bg-ink-900 text-white'
                          : done.has(item.id)
                            ? 'bg-brand-100 text-brand-900 hover:bg-brand-200'
                            : 'bg-ink-100 text-ink-400',
                        !reachable && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      {done.has(item.id) && itemIndex !== index ? '✓ ' : ''}
                      {item.short}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {restored ? (
            <p className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
              <span>Hemos recuperado el borrador que dejaste a medias.</span>
              <button
                type="button"
                className="font-semibold underline underline-offset-2"
                onClick={() => {
                  try {
                    window.localStorage.removeItem(STORAGE_KEY);
                  } catch {
                    /* ignorado */
                  }
                  setState(initialState(presetDestination));
                  setIndex(0);
                  setMaxVisited(0);
                  setRestored(false);
                }}
              >
                Empezar de cero
              </button>
            </p>
          ) : null}

          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (isLast) void submit();
              else next();
            }}
          >
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-3xl outline-none md:text-4xl"
            >
              {step.title}
            </h1>
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-600">{step.description}</p>

            {Object.keys(errors).length > 0 ? (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-coral-500/40 bg-coral-50 px-4 py-3 text-sm text-coral-700"
              >
                <p className="font-semibold">Revisa estos puntos antes de seguir:</p>
                <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                  {Object.values(errors).map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-8">
              {StepComponent ? (
                <StepComponent state={state} set={set} errors={errors} />
              ) : (
                <>
                  <Resumen state={state} goTo={goTo} />
                  {submitError ? (
                    <p role="alert" className="mt-6 rounded-2xl bg-coral-50 px-4 py-3 text-sm text-coral-700">
                      {submitError}
                    </p>
                  ) : null}
                  <p className="mt-6 text-sm leading-relaxed text-ink-500">
                    Al enviar recibirás un número de referencia para seguir tu solicitud. No hay ningún compromiso ni
                    pago: te contestamos con el presupuesto y decides después.
                  </p>
                </>
              )}
            </div>

            {/* Trampa antibots: invisible para personas, irresistible para scripts */}
            <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
              <label htmlFor="website">No rellenar</label>
              <input id="website" ref={honeypotRef} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>

            <div className="mt-10 flex flex-col-reverse gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="ghost" onClick={back} disabled={index === 0}>
                ← Atrás
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setShowEstimateMobile((value) => !value)}
                  className="text-sm font-semibold text-brand-700 underline underline-offset-4 lg:hidden"
                >
                  {showEstimateMobile ? 'Ocultar estimación' : 'Ver estimación de precio'}
                </button>
                <Button type="submit" size="lg" variant={isLast ? 'coral' : 'primary'} disabled={submitting}>
                  {submitting ? 'Enviando…' : isLast ? 'Enviar y pedir presupuesto' : 'Siguiente →'}
                </Button>
              </div>
            </div>
          </form>

          {showEstimateMobile ? (
            <div className="mt-8 lg:hidden">
              <EstimatePanel state={state} />
            </div>
          ) : null}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <EstimatePanel state={state} />
            <div className="rounded-card border border-ink-100 bg-sand-100 p-5 text-sm leading-relaxed text-ink-600">
              <p className="font-semibold text-ink-900">Se guarda solo</p>
              <p className="mt-1.5">
                Puedes cerrar esta página y volver cuando quieras: el borrador queda guardado en tu navegador, no en
                nuestros servidores.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
