import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { site } from '@/config/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(160),
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const limit = rateLimit(`contacto:${clientIp(request.headers)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: 'Demasiados mensajes seguidos. Espera un rato.' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Revisa el nombre, el email y que el mensaje tenga al menos 10 caracteres.' },
      { status: 422 },
    );
  }

  // Honeypot.
  if (parsed.data.website && parsed.data.website.trim() !== '') {
    return NextResponse.json({ ok: false, error: 'No hemos podido enviar el mensaje.' }, { status: 400 });
  }

  const text = [
    `✉️ Mensaje de contacto`,
    `${parsed.data.name} <${parsed.data.email}>`,
    '',
    parsed.data.message,
  ].join('\n');

  console.info(`[${site.name}] ${text.replace(/\n/g, ' | ')}`);

  const results = await Promise.allSettled([
    forwardTelegram(text),
    forwardWebhook(text, parsed.data.email),
  ]);

  // Si no hay ningún canal configurado, el mensaje solo queda en el log del
  // servidor: avisamos por consola para que no pase desapercibido.
  if (!process.env.TELEGRAM_BOT_TOKEN && !process.env.NOTIFY_WEBHOOK_URL) {
    console.warn('[contacto] No hay canal de aviso configurado. Define TELEGRAM_BOT_TOKEN o NOTIFY_WEBHOOK_URL.');
  }
  for (const result of results) {
    if (result.status === 'rejected') console.warn('[contacto] Envío fallido:', result.reason);
  }

  return NextResponse.json({ ok: true });
}

async function forwardTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(5000),
  });
}

async function forwardWebhook(text: string, email: string): Promise<void> {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, email, kind: 'contacto' }),
    signal: AbortSignal.timeout(5000),
  });
}
