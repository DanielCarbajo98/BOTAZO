import { headers } from 'next/headers';

/**
 * Datos estructurados para buscadores. Lleva el nonce de la CSP porque la
 * política de este sitio no permite scripts en línea sin él.
 */
export async function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // El contenido lo generamos nosotros, nunca viene del usuario.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
