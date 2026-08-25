'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { pricing } from '@/config/site';
import { eur } from '@/lib/utils';

/**
 * Devolución sin preguntas.
 *
 * Sin preguntas de verdad: un clic y ya está. No hay formulario obligatorio ni
 * nadie valorando si el motivo es bueno. Lo único que se comprueba —y en el
 * servidor— es el plazo y que no haya usado todavía los enlaces.
 */
export function RefundRequest({
  reference,
  token,
  quoteId,
  amount,
  hoursLeft,
}: {
  reference: string;
  token: string;
  quoteId: string;
  amount: number;
  hoursLeft: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/pago/reembolso', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reference, token, quoteId, reason }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'No hemos podido registrar la devolución.');
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Parece que no hay conexión. Inténtalo otra vez.');
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <p className="text-center text-sm text-ink-500">
        ¿No te convence lo que has visto?{' '}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-semibold text-ink-700 underline underline-offset-4 hover:text-ink-900"
        >
          Te devolvemos los {eur(amount)}
        </button>
        , sin preguntas. Te quedan {hoursLeft} h.
      </p>
    );
  }

  return (
    <div className="rounded-card border border-ink-200 bg-white p-6">
      <h3 className="font-display text-lg font-semibold text-ink-900">Te devolvemos los {eur(amount)}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
        Sin preguntas y sin justificarte. Al confirmar, el plan se vuelve a bloquear y te ingresamos el importe por
        la misma vía por la que pagaste, normalmente el mismo día.
      </p>

      <div className="mt-4">
        <Textarea
          value={reason}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Si te apetece contarnos qué ha fallado, nos ayuda a mejorar. Pero no hace falta."
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-coral-50 px-4 py-3 text-sm text-coral-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={request} disabled={loading}>
          {loading ? 'Registrando…' : `Confirmar devolución de ${eur(amount)}`}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Mejor me lo quedo
        </Button>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-400">
        Puedes pedirla durante las {pricing.refund.hours} h siguientes al pago y siempre que no hayas abierto
        todavía ninguno de los enlaces de reserva. En cuanto abres uno, el trabajo ya te ha servido.
      </p>
    </div>
  );
}
