'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { modeCopy } from '@/config/mode';

type Mode = 'idle' | 'changes' | 'sending' | 'done';

export function QuoteActions({
  reference,
  token,
  quoteId,
  alreadyAnswered,
}: {
  reference: string;
  token: string;
  quoteId: string;
  alreadyAnswered: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('idle');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const send = async (action: 'aceptar' | 'cambios') => {
    setMode('sending');
    setError(null);
    try {
      const response = await fetch('/api/presupuestos/respuesta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reference, token, quoteId, action, note }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'No hemos podido registrar tu respuesta.');
        setMode(action === 'cambios' ? 'changes' : 'idle');
        return;
      }
      setMode('done');
      router.refresh();
    } catch {
      setError('Parece que no hay conexión. Inténtalo otra vez.');
      setMode(action === 'cambios' ? 'changes' : 'idle');
    }
  };

  if (alreadyAnswered || mode === 'done') {
    return (
      <div className="rounded-card border border-brand-200 bg-brand-50 p-6 text-center">
        <p className="font-display text-lg font-semibold text-brand-900">Respuesta registrada</p>
        <p className="mt-1.5 text-sm text-ink-600">{modeCopy.quote.done}</p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-ink-100 bg-white p-6">
      <h3 className="font-display text-xl font-semibold text-ink-900">¿Qué te parece?</h3>
      <p className="mt-1.5 text-sm text-ink-600">{modeCopy.quote.ctaHelp}</p>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-coral-50 px-4 py-3 text-sm text-coral-700">
          {error}
        </p>
      ) : null}

      {mode === 'changes' ? (
        <div className="mt-5">
          <Textarea
            value={note}
            maxLength={800}
            autoFocus
            onChange={(event) => setNote(event.target.value)}
            placeholder="¿Qué cambiarías? Ej.: prefiero salir un día antes, el hotel me queda lejos, ¿hay algo con vuelo directo?"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => void send('cambios')} disabled={note.trim().length < 3}>
              Enviar mis comentarios
            </Button>
            <Button variant="ghost" onClick={() => setMode('idle')}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" variant="coral" disabled={mode === 'sending'} onClick={() => void send('aceptar')}>
            {mode === 'sending' ? 'Enviando…' : modeCopy.quote.ctaPrimary}
          </Button>
          <Button size="lg" variant="outline" onClick={() => setMode('changes')}>
            Pedir cambios
          </Button>
        </div>
      )}
    </div>
  );
}
