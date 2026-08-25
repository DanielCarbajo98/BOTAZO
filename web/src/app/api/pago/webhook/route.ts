import { NextResponse, type NextRequest } from 'next/server';
import { verifyWebhookSignature } from '@/lib/payments';
import { repo } from '@/lib/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook de Stripe: es la vía fiable para dar por pagado un plan, porque
 * llega aunque el cliente cierre el navegador nada más pagar.
 *
 * Nunca confía en el cuerpo sin comprobar antes la firma.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyWebhookSignature(rawBody, request.headers.get('stripe-signature'))) {
    return NextResponse.json({ ok: false, error: 'Firma no válida' }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: 'Cuerpo mal formado' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    // Cualquier otro evento se acepta y se ignora, para que Stripe no reintente.
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const session = event.data?.object ?? {};
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  const quoteId = metadata.quoteId;

  if (!quoteId || session.payment_status !== 'paid') {
    return NextResponse.json({ ok: true, ignored: 'sesión sin pagar o sin referencia' });
  }

  // markQuotePaid es idempotente: Stripe reintenta y no pasa nada.
  repo().markQuotePaid(quoteId, {
    method: 'Stripe',
    reference: typeof session.id === 'string' ? session.id : undefined,
  });

  return NextResponse.json({ ok: true });
}
