import { site } from '@/config/site';
import type { TravelRequest } from '@/lib/repository';
import { eur } from '@/lib/utils';

/**
 * Aviso instantáneo al equipo cuando entra una solicitud.
 *
 * Sin configurar nada, solo escribe en el log del servidor. Si defines
 * TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID recibes el aviso en el móvil, y con
 * NOTIFY_WEBHOOK_URL puedes engancharlo a Slack, Discord o lo que uses.
 *
 * Nunca lanza: un fallo avisando no puede tumbar la creación de la solicitud.
 */
export async function notifyNewRequest(request: TravelRequest, quoteUrl: string): Promise<void> {
  const lines = [
    `🧳 Nueva solicitud ${request.reference}`,
    `${request.destination_summary}`,
    `${request.dates_summary}`,
    `${request.travelers} viajero(s) · ${request.contact_name}`,
    request.budget_per_person ? `Presupuesto: ${eur(request.budget_per_person)}/persona` : null,
    request.estimate ? `Estimación: ${eur(request.estimate.low)} – ${eur(request.estimate.high)}` : null,
    `Contacto: ${request.contact_email}${request.contact_phone ? ` · ${request.contact_phone}` : ''}`,
    quoteUrl,
  ].filter(Boolean) as string[];

  const text = lines.join('\n');
  console.info(`[${site.name}] ${text.replace(/\n/g, ' | ')}`);

  await Promise.allSettled([sendTelegram(text), sendWebhook(text, request)]);
}

async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.warn('[notify] Telegram falló:', error);
  }
}

async function sendWebhook(text: string, request: TravelRequest): Promise<void> {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, reference: request.reference, status: request.status }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.warn('[notify] Webhook falló:', error);
  }
}

/**
 * Aviso de devolución. Es urgente de verdad: hay dinero que devolver y el
 * cliente ya no ve su plan.
 */
export async function notifyRefund(request: TravelRequest, amount: number, reason: string): Promise<void> {
  const text = [
    `↩️ DEVOLUCIÓN ${request.reference}`,
    `${request.contact_name} · ${request.destination_summary}`,
    `Hay que devolverle ${eur(amount)}`,
    reason ? `Motivo: ${reason}` : 'Sin motivo indicado',
  ].join('\n');

  console.info(`[${site.name}] ${text.replace(/\n/g, ' | ')}`);
  await Promise.allSettled([sendTelegram(text), sendWebhook(text, request)]);
}
