import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { site } from '@/config/site';
import { quoteNoun } from '@/config/mode';
import { createCheckout, manualPaymentDetails, paymentMode } from '@/lib/payments';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { isUnlocked } from '@/lib/quote';
import { repo } from '@/lib/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  reference: z.string().trim().min(4).max(20),
  token: z.string().trim().min(10).max(200),
  quoteId: z.string().trim().min(10).max(64),
});

export async function POST(request: NextRequest) {
  const limit = rateLimit(`pago:${clientIp(request.headers)}`, 20, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Solicitud mal formada.' }, { status: 400 });
  }

  const { reference, token, quoteId } = parsed.data;
  const repository = repo();

  const travelRequest = repository.verifyAccess(reference, token);
  if (!travelRequest) {
    return NextResponse.json({ ok: false, error: 'Enlace no válido o caducado.' }, { status: 403 });
  }

  const quote = repository.getQuote(quoteId);
  if (!quote || quote.request_id !== travelRequest.id) {
    return NextResponse.json({ ok: false, error: 'Plan no encontrado.' }, { status: 404 });
  }
  if (quote.status === 'borrador') {
    return NextResponse.json({ ok: false, error: 'Ese plan todavía no está disponible.' }, { status: 409 });
  }
  if (isUnlocked(quote)) {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  if (paymentMode() === 'manual') {
    return NextResponse.json({
      ok: true,
      manual: true,
      amount: quote.unlock_fee,
      details: manualPaymentDetails(),
      concept: reference,
    });
  }

  const base = site.url.replace(/\/$/, '');
  const returnTo = `${base}/presupuesto/${reference}?t=${encodeURIComponent(token)}`;

  try {
    const url = await createCheckout({
      quoteId: quote.id,
      reference,
      amountEuros: quote.unlock_fee,
      description: `${quoteNoun} ${reference} · ${quote.title}`,
      customerEmail: travelRequest.contact_email,
      successUrl: `${returnTo}&pago=ok&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${returnTo}&pago=cancelado`,
    });
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    console.error('[pago] no se pudo crear la sesión:', error);
    return NextResponse.json(
      { ok: false, error: 'No hemos podido abrir la pasarela de pago. Escríbenos y lo resolvemos.' },
      { status: 502 },
    );
  }
}
