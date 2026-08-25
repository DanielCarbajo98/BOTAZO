import { NextResponse, type NextRequest } from 'next/server';
import { briefSchema } from '@/lib/brief';
import { hashIp } from '@/lib/crypto';
import { estimate } from '@/lib/estimator';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { repo } from '@/lib/repository';
import { notifyNewRequest } from '@/lib/notify';
import { site } from '@/config/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Un formulario de 10 pasos no se rellena en menos de esto: si va más rápido, es un bot. */
const MIN_ELAPSED_MS = 5_000;
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);

  const limit = rateLimit(`solicitud:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Has enviado varias solicitudes seguidas. Espera un rato o escríbenos directamente.',
      },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    );
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'La solicitud es demasiado grande.' }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud mal formada.' }, { status: 400 });
  }

  const body = payload as { brief?: unknown; website?: unknown; elapsedMs?: unknown };

  // Honeypot: campo oculto que solo rellenan los bots.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    // Respondemos como si todo hubiera ido bien para no darle pistas al bot.
    return NextResponse.json({ ok: false, error: 'No hemos podido procesar la solicitud.' }, { status: 400 });
  }

  if (typeof body.elapsedMs === 'number' && body.elapsedMs < MIN_ELAPSED_MS) {
    return NextResponse.json(
      { ok: false, error: 'Tómate un momento para revisar los datos y vuelve a enviarlo.' },
      { status: 400 },
    );
  }

  const parsed = briefSchema.safeParse(body.brief);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        ok: false,
        error: first ? `${first.path.join('.')}: ${first.message}` : 'Faltan datos obligatorios.',
      },
      { status: 422 },
    );
  }

  const brief = parsed.data;
  const ipHash = hashIp(ip);

  // Segundo cerco antiabuso, esta vez persistente entre reinicios del proceso.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  if (repo().countByIpSince(ipHash, dayAgo) >= 10) {
    return NextResponse.json(
      { ok: false, error: 'Demasiadas solicitudes desde esta conexión. Escríbenos y lo vemos por WhatsApp.' },
      { status: 429 },
    );
  }

  let computed = null;
  try {
    computed = estimate(brief);
  } catch (error) {
    // La estimación es un extra: si falla, la solicitud debe entrar igualmente.
    console.warn('[solicitudes] estimación fallida:', error);
  }

  const { request: created, accessToken } = repo().createRequest({
    brief,
    estimate: computed,
    source: request.headers.get('referer') ?? undefined,
    ipHash,
  });

  const trackingUrl = `${site.url}/presupuesto/${created.reference}?t=${accessToken}`;
  await notifyNewRequest(created, trackingUrl);

  return NextResponse.json({ ok: true, reference: created.reference, token: accessToken }, { status: 201 });
}
