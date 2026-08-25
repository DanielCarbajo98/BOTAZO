'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { FieldError, Input, Label } from '@/components/ui/Field';

export function TrackingForm() {
  const router = useRouter();
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/seguimiento', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reference: reference.trim().toUpperCase(), email: email.trim() }),
      });
      const payload = (await response.json()) as { ok: boolean; url?: string; error?: string };
      if (!response.ok || !payload.ok || !payload.url) {
        setError(payload.error ?? 'No hemos podido recuperar tu solicitud.');
        setLoading(false);
        return;
      }
      router.push(payload.url);
    } catch {
      setError('Parece que no hay conexión. Inténtalo otra vez.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-4">
        <div>
          <Label htmlFor="reference">Número de referencia</Label>
          <Input
            id="reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="AL-7K3QP9"
            className="font-mono uppercase"
            autoComplete="off"
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email de la solicitud</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tucorreo@ejemplo.com"
            required
          />
        </div>
      </div>

      <FieldError>{error}</FieldError>

      <Button type="submit" size="lg" className="mt-6 w-full" disabled={loading}>
        {loading ? 'Buscando…' : 'Ver mi presupuesto'}
      </Button>
      <p className="mt-3 text-xs leading-relaxed text-ink-400">
        Por seguridad generamos un enlace nuevo cada vez, así que el anterior dejará de funcionar.
      </p>
    </form>
  );
}
