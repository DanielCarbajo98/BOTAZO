'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FieldError, Input, Label, Textarea } from '@/components/ui/Field';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
        <p className="font-display text-lg font-semibold text-brand-900">Mensaje enviado</p>
        <p className="mt-1.5 text-sm text-ink-600">Te contestamos lo antes posible al correo que nos has dado.</p>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('sending');
    setError(null);
    try {
      const response = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, message, website: honeypot.current?.value ?? '' }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'No hemos podido enviar el mensaje.');
        setStatus('idle');
        return;
      }
      setStatus('sent');
    } catch {
      setError('Parece que no hay conexión. Inténtalo otra vez.');
      setStatus('idle');
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <Label htmlFor="c-name">Nombre</Label>
        <Input id="c-name" value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="c-email">Email</Label>
        <Input
          id="c-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div>
        <Label htmlFor="c-message">¿En qué te ayudamos?</Label>
        <Textarea
          id="c-message"
          value={message}
          maxLength={2000}
          onChange={(event) => setMessage(event.target.value)}
          required
          placeholder="Cuéntanos tu duda. Si es sobre una solicitud, añade el número de referencia."
        />
      </div>

      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-website">No rellenar</label>
        <input id="c-website" ref={honeypot} tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <FieldError>{error}</FieldError>

      <Button type="submit" size="lg" className="w-full" disabled={status === 'sending'}>
        {status === 'sending' ? 'Enviando…' : 'Enviar mensaje'}
      </Button>
    </form>
  );
}
