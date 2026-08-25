'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { authenticate, createSession, destroySession, getSession } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { quoteInputSchema } from '@/lib/quote';
import { repo, REQUEST_STATUSES, type RequestStatus } from '@/lib/repository';

export type ActionState = { error?: string; ok?: boolean };

/** Todas las acciones del backoffice pasan por aquí antes de tocar nada. */
async function requireActor(): Promise<string> {
  const session = await getSession();
  if (!session) redirect('/admin/login');
  return session.name;
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = clientIp(await headers());
  const limit = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: 'Demasiados intentos. Prueba de nuevo en unos minutos.' };
  }

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/admin');

  if (!email || !password) return { error: 'Introduce tu email y tu contraseña.' };

  const user = authenticate(email, password);
  if (!user) return { error: 'Email o contraseña incorrectos.' };

  repo().touchAdminLogin(user.id);
  await createSession(user);
  // Solo permitimos redirigir dentro del backoffice.
  redirect(next.startsWith('/admin') ? next : '/admin');
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/admin/login');
}

export async function setStatusAction(requestId: string, status: string): Promise<ActionState> {
  const actor = await requireActor();
  if (!REQUEST_STATUSES.includes(status as RequestStatus)) return { error: 'Estado no válido.' };

  const target = repo().getRequestById(requestId);
  if (!target) return { error: 'Solicitud no encontrada.' };

  repo().updateStatus(requestId, status as RequestStatus, actor);
  revalidatePath(`/admin/solicitudes/${requestId}`);
  revalidatePath('/admin');
  return { ok: true };
}

export async function saveNotesAction(requestId: string, notes: string): Promise<ActionState> {
  await requireActor();
  const target = repo().getRequestById(requestId);
  if (!target) return { error: 'Solicitud no encontrada.' };

  repo().updateInternalNotes(requestId, notes.slice(0, 5000));
  revalidatePath(`/admin/solicitudes/${requestId}`);
  return { ok: true };
}

/**
 * Guarda (o crea) el presupuesto de una solicitud y, opcionalmente, lo envía.
 * Enviar significa hacerlo visible en el enlace privado del cliente.
 */
export async function saveQuoteAction(
  requestId: string,
  quoteId: string | null,
  payload: unknown,
  send: boolean,
): Promise<ActionState & { quoteId?: string }> {
  const actor = await requireActor();

  const target = repo().getRequestById(requestId);
  if (!target) return { error: 'Solicitud no encontrada.' };

  const parsed = quoteInputSchema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Datos del presupuesto no válidos.' };
  }

  const input = parsed.data;
  const repository = repo();

  let quote = quoteId ? repository.getQuote(quoteId) : null;
  // Un presupuesto de otra solicitud nunca se puede editar desde aquí.
  if (quote && quote.request_id !== requestId) return { error: 'Presupuesto no válido.' };

  if (!quote) {
    quote = repository.createQuote(requestId, {
      title: input.title,
      message: input.message,
      validUntil: input.validUntil ?? undefined,
    });
  } else {
    repository.updateQuote(quote.id, {
      title: input.title,
      message: input.message,
      validUntil: input.validUntil,
    });
  }

  repository.replaceOptions(
    quote.id,
    input.options.map((option, index) => ({
      position: index,
      name: option.name,
      angle: option.angle,
      summary: option.summary || null,
      recommended: option.recommended ? 1 : 0,
      flight_json: option.flight ? JSON.stringify(option.flight) : null,
      stay_json: option.stay ? JSON.stringify(option.stay) : null,
      transfers_json: option.transfers.length > 0 ? JSON.stringify(option.transfers) : null,
      activities_json: option.activities.length > 0 ? JSON.stringify(option.activities) : null,
      price_flights: option.priceFlights,
      price_stay: option.priceStay,
      price_transfers: option.priceTransfers,
      price_activities: option.priceActivities,
      price_other: option.priceOther,
      price_fee: option.priceFee,
      market_reference: option.marketReference,
      notes: option.notes || null,
    })),
  );

  if (send) {
    repository.sendQuote(quote.id, actor);
  } else {
    repository.addEvent(requestId, { type: 'borrador', message: 'Presupuesto guardado como borrador', actor });
  }

  revalidatePath(`/admin/solicitudes/${requestId}`);
  revalidatePath('/admin');
  return { ok: true, quoteId: quote.id };
}
