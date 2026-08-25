import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

const SECRET = 'whsec_de_prueba';

async function load(env: Record<string, string | undefined> = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) vi.stubEnv(key, value);
  }
  return import('@/lib/payments');
}

const sign = (body: string, timestamp: number, secret = SECRET) =>
  `t=${timestamp},v1=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('modo de cobro', () => {
  it('sin claves de Stripe, cobro manual', async () => {
    const { paymentMode } = await load();
    expect(paymentMode()).toBe('manual');
  });

  it('con clave de Stripe, pasarela', async () => {
    const { paymentMode } = await load({ STRIPE_SECRET_KEY: 'sk_test_x' });
    expect(paymentMode()).toBe('stripe');
  });
});

describe('firma del webhook de Stripe', () => {
  const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_1' } } });

  it('acepta una firma válida y reciente', async () => {
    const { verifyWebhookSignature } = await load({ STRIPE_WEBHOOK_SECRET: SECRET });
    const now = Math.floor(Date.now() / 1000);
    expect(verifyWebhookSignature(body, sign(body, now))).toBe(true);
  });

  it('rechaza una firma hecha con otro secreto', async () => {
    const { verifyWebhookSignature } = await load({ STRIPE_WEBHOOK_SECRET: SECRET });
    const now = Math.floor(Date.now() / 1000);
    expect(verifyWebhookSignature(body, sign(body, now, 'otro_secreto'))).toBe(false);
  });

  it('rechaza si el cuerpo ha sido manipulado', async () => {
    const { verifyWebhookSignature } = await load({ STRIPE_WEBHOOK_SECRET: SECRET });
    const now = Math.floor(Date.now() / 1000);
    const header = sign(body, now);
    expect(verifyWebhookSignature(body.replace('cs_1', 'cs_falso'), header)).toBe(false);
  });

  it('rechaza un webhook reenviado horas después', async () => {
    const { verifyWebhookSignature } = await load({ STRIPE_WEBHOOK_SECRET: SECRET });
    const old = Math.floor(Date.now() / 1000) - 3600;
    expect(verifyWebhookSignature(body, sign(body, old))).toBe(false);
  });

  it('rechaza cabeceras rotas o ausentes', async () => {
    const { verifyWebhookSignature } = await load({ STRIPE_WEBHOOK_SECRET: SECRET });
    for (const header of [null, '', 'basura', 't=123', 'v1=abc', 't=abc,v1=def']) {
      expect(verifyWebhookSignature(body, header)).toBe(false);
    }
  });

  it('sin secreto configurado no se acepta ningún webhook', async () => {
    const { verifyWebhookSignature } = await load();
    const now = Math.floor(Date.now() / 1000);
    expect(verifyWebhookSignature(body, sign(body, now))).toBe(false);
  });
});
