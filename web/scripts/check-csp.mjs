/**
 * Comprueba que la CSP y el HTML servido están de acuerdo.
 *
 *   npm start &            (o npm run dev)
 *   npm run check:csp
 *
 * Existe por un fallo real: las páginas prerenderizadas en tiempo de
 * compilación llevaban cosido un nonce que ya no coincidía con el de la
 * respuesta, así que el navegador bloqueaba TODOS los scripts de Next y la
 * página se quedaba sin JavaScript, en silencio. Este script lo detecta sin
 * necesidad de abrir un navegador.
 */

const BASE = process.env.CHECK_BASE_URL ?? 'http://localhost:3000';

const routes = [
  '/',
  '/presupuesto',
  '/como-funciona',
  '/precios',
  '/trucos',
  '/opiniones',
  '/faq',
  '/contacto',
  '/seguimiento',
  '/aviso-legal',
  '/privacidad',
  '/cookies',
  '/condiciones',
  '/admin/login',
  '/no-existe-esta-pagina',
];

const problems = [];

for (const route of routes) {
  const response = await fetch(BASE + route, { redirect: 'manual' });
  const csp = response.headers.get('content-security-policy');
  const html = await response.text();

  if (!csp) {
    problems.push(`${route}: no llega cabecera Content-Security-Policy`);
    continue;
  }

  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  if (!nonce) {
    problems.push(`${route}: la CSP no incluye nonce`);
    continue;
  }

  const scripts = html.match(/<script\b[^>]*>/g) ?? [];
  const withoutNonce = scripts.filter((tag) => {
    // Los bloques de datos (JSON-LD y payloads) no ejecutan código, pero Next
    // y los navegadores los tratan igual: todos deben llevar el nonce.
    if (tag.includes('type="application/json"')) return false;
    return !tag.includes(`nonce="${nonce}"`);
  });

  if (withoutNonce.length > 0) {
    problems.push(
      `${route}: ${withoutNonce.length} de ${scripts.length} <script> sin el nonce de la respuesta\n      ${withoutNonce[0]}`,
    );
  } else {
    console.log(`  ✓ ${route.padEnd(28)} ${scripts.length} scripts, todos con nonce`);
  }
}

if (problems.length > 0) {
  console.error('\n❌ Problemas de CSP:\n');
  for (const problem of problems) console.error('  - ' + problem);
  process.exit(1);
}

console.log('\n✅ Todas las páginas sirven sus scripts con el nonce correcto');
