'use client';

import { useState, useTransition } from 'react';
import { saveNotesAction } from '@/app/admin/actions';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';

export function NotesEditor({ requestId, initial }: { requestId: string; initial: string }) {
  const [notes, setNotes] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveNotesAction(requestId, notes);
      if (result.error) setError(result.error);
      else {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      }
    });
  };

  return (
    <div>
      <Textarea
        value={notes}
        maxLength={5000}
        onChange={(event) => {
          setNotes(event.target.value);
          setSaved(false);
        }}
        placeholder="Notas internas: qué has probado, qué rutas descartar, con quién has hablado… El cliente no ve esto."
      />
      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={pending || notes === initial}>
          {pending ? 'Guardando…' : 'Guardar notas'}
        </Button>
        {saved ? <span className="text-sm text-brand-700">Guardado ✓</span> : null}
        {error ? <span className="text-sm text-coral-600">{error}</span> : null}
      </div>
    </div>
  );
}
