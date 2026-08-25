'use client';

import { useState, useTransition } from 'react';
import { exemptQuoteAction, markPaidAction, refundAction } from '@/app/admin/actions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { eur, formatDateTime } from '@/lib/utils';
import type { QuoteRow } from '@/lib/repository';

/** Estado del desbloqueo y cobro manual desde el panel. */
export function PaymentControl({ quote }: { quote: QuoteRow }) {
  const [method, setMethod] = useState('Bizum');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  };

  if (quote.unlock_fee <= 0) {
    return (
      <p className="text-sm text-ink-500">
        Este plan no tiene muro de pago: el cliente lo ve completo desde el primer momento.
      </p>
    );
  }

  if (quote.unlock_status === 'reembolsado') {
    return (
      <div className="space-y-2 text-sm">
        <Badge tone="coral">Devuelto · {eur(quote.unlock_fee)}</Badge>
        {quote.refunded_at ? <p className="text-ink-500">{formatDateTime(quote.refunded_at)}</p> : null}
        {quote.refund_reason ? <p className="text-ink-700">«{quote.refund_reason}»</p> : null}
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
          Acuérdate de ingresarle {eur(quote.unlock_fee)} por la misma vía por la que pagó. El plan ya se ha vuelto
          a bloquear solo.
        </p>
      </div>
    );
  }

  if (quote.unlock_status !== 'pendiente') {
    return (
      <div className="space-y-2 text-sm">
        <Badge tone="success">
          {quote.unlock_status === 'pagado' ? `Pagado · ${eur(quote.unlock_fee)}` : 'Abierto sin coste'}
        </Badge>
        {quote.paid_at ? <p className="text-ink-500">{formatDateTime(quote.paid_at)}</p> : null}
        {quote.payment_method ? (
          <p className="text-ink-500">
            {quote.payment_method}
            {quote.payment_ref ? ` · ${quote.payment_ref}` : ''}
          </p>
        ) : null}
        {quote.unlock_status === 'pagado' ? (
          <>
            <Input
              className="h-10 text-sm"
              placeholder="Motivo de la devolución (opcional)"
              aria-label="Motivo de la devolución"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (window.confirm('Se le devolverá el importe y el plan volverá a bloquearse. ¿Seguro?')) {
                  run(() => refundAction(quote.id, reference));
                }
              }}
            >
              Devolver el importe
            </Button>
            {error ? <p className="text-coral-600">{error}</p> : null}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <Badge tone="amber">Pendiente de pago · {eur(quote.unlock_fee)}</Badge>
      <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
        El cliente ve los precios pero no la compañía, el hotel ni los enlaces. Si te ha pagado por Bizum o
        transferencia, márcalo aquí.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          className="h-10 w-32 text-sm"
          value={method}
          aria-label="Forma de pago"
          onChange={(event) => setMethod(event.target.value)}
        />
        <Input
          className="h-10 min-w-40 flex-1 text-sm"
          placeholder="Referencia (opcional)"
          aria-label="Referencia del pago"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => markPaidAction(quote.id, method, reference))}>
          {pending ? 'Guardando…' : 'Marcar como pagado'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (window.confirm('Se abrirá el plan al cliente sin cobrarle. ¿Seguro?')) {
              run(() => exemptQuoteAction(quote.id));
            }
          }}
        >
          Abrir sin cobrar
        </Button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-coral-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
