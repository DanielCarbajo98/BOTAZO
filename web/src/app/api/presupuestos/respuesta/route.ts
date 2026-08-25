import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { repo } from '@/lib/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  reference: z.string().trim().min(4).max(20),
  token: z.string().trim().min(10).max(200),
  quoteId: z.string().trim().min(10).max(64),
  action: z.enum(['aceptar', 'cambios']),
  note: z.string().trim().max(800).default(''),
});

export async function POST(request: NextRequest) {
  const limit = rateLimit(`respuesta:${clientIp(request.headers)}`, 20, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Solicitud mal formada.' }, { status: 400 });
  }

  const { reference, token, quoteId, action, note } = parsed.data;
  const repository = repo();

  const travelRequest = repository.verifyAccess(reference, token);
  if (!travelRequest) {
    return NextResponse.json({ ok: false, error: 'Enlace no válido o caducado.' }, { status: 403 });
  }

  const quote = repository.getQuote(quoteId);
  // El presupuesto tiene que pertenecer a esta solicitud: si no, es un intento de manipulación.
  if (!quote || quote.request_id !== travelRequest.id) {
    return NextResponse.json({ ok: false, error: 'Presupuesto no encontrado.' }, { status: 404 });
  }
  if (quote.status === 'borrador') {
    return NextResponse.json({ ok: false, error: 'Ese presupuesto todavía no está disponible.' }, { status: 409 });
  }

  repository.respondToQuote(quoteId, action === 'aceptar' ? 'aceptado' : 'cambios', note || undefined);

  return NextResponse.json({ ok: true });
}
