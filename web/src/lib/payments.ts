import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Cobro del desbloqueo.
 *
 * Hablamos con la API de Stripe directamente por HTTP en lugar de arrastrar su
 * SDK: son dos llamadas y así el proyecto no engorda ni depende de una librería
 * más para algo tan acotado.
 *
 * Si no hay claves configuradas, el sistema **no se rompe**: pasa a cobro
 * manual (Bizum o transferencia) y el agente marca el plan como pagado desde el
 * panel. Es lo que permite empezar a cobrar mañana sin dar de alta nada.
 */
export type PaymentMode = 'stripe' | 'manual';

export function paymentMode(): PaymentMode {
  return process.env.STRIPE_SECRET_KEY ? 'stripe' : 'manual';
}

/** Datos que enseñamos al cliente cuando el cobro es manual. */
export function manualPaymentDetails() {
  return {
    bizum: process.env.PAGO_BIZUM ?? '',
    iban: process.env.PAGO_IBAN ?? '',
    holder: process.env.PAGO_TITULAR ?? '',
  };
}

const STRIPE_API = 'https://api.stripe.com/v1';

async function stripeRequest(path: string, body?: Record<string, string>): Promise<Record<string, unknown>> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Falta STRIPE_SECRET_KEY');

  const response = await fetch(`${STRIPE_API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      authorization: `Bearer ${key}`,
      ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
    ...(body ? { body: new URLSearchParams(body).toString() } : {}),
    signal: AbortSignal.timeout(12_000),
  });

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const error = payload.error as { message?: string } | undefined;
    throw new Error(error?.message ?? `Stripe devolvió ${response.status}`);
  }
  return payload;
}

export type CheckoutInput = {
  quoteId: string;
  reference: string;
  amountEuros: number;
  description: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
};

/** Crea la sesión de pago y devuelve la URL a la que mandar al cliente. */
export async function createCheckout(input: CheckoutInput): Promise<string> {
  const cents = Math.round(input.amountEuros * 100);
  if (cents < 50) throw new Error('El importe mínimo que admite la pasarela es 0,50 €');

  const session = await stripeRequest('/checkout/sessions', {
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(cents),
    'line_items[0][price_data][product_data][name]': input.description.slice(0, 250),
    customer_email: input.customerEmail,
    client_reference_id: input.reference,
    'metadata[quoteId]': input.quoteId,
    'metadata[reference]': input.reference,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    locale: 'es',
  });

  const url = session.url;
  if (typeof url !== 'string') throw new Error('Stripe no ha devuelto una URL de pago');
  return url;
}

/** Comprueba contra Stripe si una sesión está realmente pagada. */
export async function isSessionPaid(sessionId: string): Promise<{ paid: boolean; quoteId?: string }> {
  const session = await stripeRequest(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  return {
    paid: session.payment_status === 'paid',
    quoteId: metadata.quoteId,
  };
}

/**
 * Verifica la firma del webhook de Stripe.
 *
 * Sin esto, cualquiera que conozca la URL podría mandar un "pagado" falso y
 * desbloquear planes gratis.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((piece) => {
      const [key, ...rest] = piece.split('=');
      return [key?.trim() ?? '', rest.join('=')];
    }),
  );

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  // Ventana de 5 minutos: corta los intentos de reenviar un webhook antiguo.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
