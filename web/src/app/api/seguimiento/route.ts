import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { newToken, sha256 } from '@/lib/crypto';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getDb } from '@/lib/db';
import { repo } from '@/lib/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  reference: z.string().trim().min(4).max(20),
  email: z.email().max(160),
});

/**
 * Recupera el enlace privado de una solicitud a partir de la referencia y el
 * email. Hacen falta los dos, y el intento está muy limitado por IP, así que no
 * sirve para ir probando referencias.
 */
export async function POST(request: NextRequest) {
  const limit = rateLimit(`seguimiento:${clientIp(request.headers)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Demasiados intentos. Prueba dentro de un rato o escríbenos.' },
      { status: 429 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Revisa la referencia y el email.' }, { status: 400 });
  }

  const found = repo().getRequestByReference(parsed.data.reference);
  const emailMatches = found?.contact_email === parsed.data.email.toLowerCase().trim();

  if (!found || !emailMatches) {
    // Mismo mensaje exista o no la solicitud: no confirmamos referencias ajenas.
    return NextResponse.json(
      { ok: false, error: 'No encontramos ninguna solicitud con esa referencia y ese email.' },
      { status: 404 },
    );
  }

  // Rotamos el token en cada recuperación: el enlace antiguo deja de servir.
  const token = newToken();
  getDb()
    .prepare('UPDATE requests SET access_token_hash = ?, updated_at = ? WHERE id = ?')
    .run(sha256(token), new Date().toISOString(), found.id);
  repo().addEvent(found.id, {
    type: 'acceso',
    message: 'El cliente ha recuperado su enlace de seguimiento',
    actor: 'cliente',
  });

  return NextResponse.json({ ok: true, url: `/presupuesto/${found.reference}?t=${token}` });
}
