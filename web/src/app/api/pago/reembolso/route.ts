import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { refundEligibility } from '@/lib/quote';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { repo } from '@/lib/repository';
import { notifyRefund } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  reference: z.string().trim().min(4).max(20),
  token: z.string().trim().min(10).max(200),
  quoteId: z.string().trim().min(10).max(64),
  reason: z.string().trim().max(500).default(''),
});

const MOTIVOS: Record<string, string> = {
  'no-pagado': 'Este plan no está pagado.',
  'fuera-de-plazo': 'El plazo para pedir la devolución ya ha terminado.',
  'ya-usado': 'Ya has abierto alguno de los enlaces de reserva, así que el plan ya te ha servido.',
  'ya-devuelto': 'Esta devolución ya está en marcha.',
};

export async function POST(request: NextRequest) {
  const limit = rateLimit(`reembolso:${clientIp(request.headers)}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Solicitud mal formada.' }, { status: 400 });
  }

  const { reference, token, quoteId, reason } = parsed.data;
  const repository = repo();

  const travelRequest = repository.verifyAccess(reference, token);
  if (!travelRequest) {
    return NextResponse.json({ ok: false, error: 'Enlace no válido o caducado.' }, { status: 403 });
  }

  const quote = repository.getQuote(quoteId);
  if (!quote || quote.request_id !== travelRequest.id) {
    return NextResponse.json({ ok: false, error: 'Plan no encontrado.' }, { status: 404 });
  }

  // Las condiciones se comprueban aquí, no en el navegador.
  const eligibility = refundEligibility(quote, repository.countClicks(travelRequest.id));
  if (!eligibility.eligible) {
    return NextResponse.json({ ok: false, error: MOTIVOS[eligibility.reason] }, { status: 409 });
  }

  repository.refundQuote(quoteId, { reason: reason || undefined });
  await notifyRefund(travelRequest, quote.unlock_fee, reason);

  return NextResponse.json({ ok: true });
}
