import { NextResponse, type NextRequest } from 'next/server';
import { hashIp } from '@/lib/crypto';
import { verifyLink } from '@/lib/links';
import { urlHost } from '@/lib/quote';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { repo } from '@/lib/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Redirección con contador. Solo acepta destinos que hayamos firmado nosotros,
 * así que no sirve para redirigir a ningún otro sitio.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const payload = verifyLink(token);

  if (!payload) {
    return NextResponse.redirect(new URL('/seguimiento?enlace=caducado', request.url), 302);
  }

  const ip = clientIp(request.headers);
  // Un clic repetido no debe inflar las estadísticas ni llenar la tabla.
  const limit = rateLimit(`ir:${ip}:${token.slice(0, 32)}`, 3, 60 * 1000);

  if (limit.ok) {
    try {
      repo().recordClick({
        requestId: payload.r,
        quoteId: payload.q || null,
        optionId: payload.o || null,
        label: payload.l,
        host: urlHost(payload.u) || 'desconocido',
        ipHash: hashIp(ip),
      });
    } catch (error) {
      // Perder un clic del contador nunca puede impedir que el cliente reserve.
      console.warn('[ir] no se pudo registrar el clic:', error);
    }
  }

  return NextResponse.redirect(payload.u, {
    status: 302,
    headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' },
  });
}
