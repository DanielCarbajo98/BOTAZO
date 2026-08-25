# Zarpea · agencia de viajes low cost

> *Los zarpeas son los vientos constantes que cruzaban el Atlántico y empujaban
> a los barcos sin gastar ni un remo.*

> **La web arranca en modo asesor** (sin licencia de agencia). Ver
> [Modo de operación](#modo-de-operación) más abajo.

Web completa para una agencia de viajes que trabaja por **presupuesto a medida**:
el cliente cuenta su viaje en un formulario guiado, un agente busca de verdad, y
el cliente recibe una propuesta con tres opciones comparadas y el desglose de
precios completo.

> El nombre comercial, los datos de contacto y las tarifas están todos en
> **`src/config/site.ts`**. Cambiar la marca es tocar un solo archivo.

---

## Qué incluye

### Web pública
| Ruta | Qué es |
|---|---|
| `/` | Landing: problema, método, diferenciadores, comparativa, precios, FAQ |
| `/presupuesto` | Formulario guiado de 10 pasos con estimación de precio en vivo |
| `/presupuesto/[referencia]?t=…` | Enlace privado del cliente: estado, propuesta y respuesta |
| `/seguimiento` | Recuperar el enlace privado con referencia + email |
| `/como-funciona`, `/precios`, `/trucos`, `/opiniones`, `/faq`, `/contacto` | Contenido y captación |
| `/aviso-legal`, `/privacidad`, `/cookies`, `/condiciones` | Plantillas legales (ver aviso abajo) |

### Backoffice (`/admin`)
- Login con sesión firmada y limitación de intentos por IP.
- Bandeja de solicitudes con KPIs, filtros por estado y buscador.
- Ficha completa del cliente: briefing, notas internas e historial de eventos.
- **Constructor de presupuestos**: hasta 4 opciones con vuelos por tramos,
  alojamiento, traslados, actividades y desglose de precios; se puede rellenar
  de golpe con la estimación automática y publicar al cliente con un botón.
- Exportación a CSV.

---

## Modo de operación

`src/config/mode.ts` gobierna cómo se presenta el negocio entero. Es un solo
interruptor y **todo el texto que depende de él vive en ese archivo**:

| Modo | Quién reserva | Requisitos |
|---|---|---|
| **`asesor`** (por defecto) | **El cliente**, con sus enlaces | Ninguno |
| `agencia` | Nosotros | Título-licencia autonómico + garantía frente a insolvencia |

```bash
NEXT_PUBLIC_SITE_MODE=agencia   # el día que llegue la licencia
```

En modo asesor la web **no se presenta como agencia de viajes**, no vende viajes
combinados y cada partida del plan lleva su enlace de reserva (normalmente de
afiliación) con una marca visible cuando genera comisión. El cambio de modo
reescribe solos el logotipo, la portada, la página de precios, el aviso legal,
las condiciones y las preguntas frecuentes. Hay tests que comprueban que en
modo asesor ningún texto legal se presenta como agencia.

Por qué importa: sin licencia se puede asesorar, pero **no** vender un vuelo y
un hotel como un conjunto con precio cerrado — eso es un viaje combinado y exige
licencia y garantía.

Los programas de afiliación donde registrarse están en
[`docs/afiliacion.md`](docs/afiliacion.md), y el proceso de trabajo completo en
[`docs/manual-operativo.md`](docs/manual-operativo.md).

## Muro de pago

En modo asesor el plan se entrega **bloqueado**. El cliente ve el precio de cada
opción, lo que se ahorra y la forma del viaje (directo o con escala, cuánto
dura, categoría y zona del alojamiento, régimen, cancelación). Lo que no ve
hasta pagar es la **identidad**: qué compañía, qué día y hora exactos, qué
alojamiento y el enlace de cada reserva.

Es lo que resuelve la fuga de la afiliación: sin muro se escapa entre el 40 y el
50 % de las comisiones porque el cliente reserva por su cuenta. Con muro, el
ingreso está cobrado antes de que reserve nada.

**El censurado ocurre en el servidor** (`redactOption` en `src/lib/quote.ts`):
los datos ocultos no llegan al navegador, así que no basta con mirar el código
fuente de la página. Hay tests que lo comprueban cadena por cadena.

El precio del desbloqueo se fija por presupuesto en el constructor del panel,
prefijado con la tarifa sugerida. A cero, el plan sale abierto.

### Cobro

| Con `STRIPE_SECRET_KEY` | Sin claves |
|---|---|
| Pasarela de Stripe, y el webhook desbloquea | Bizum o transferencia; el agente lo marca en el panel |

Hablamos con la API de Stripe por HTTP, sin su SDK. La firma del webhook se
verifica siempre —con ventana de 5 minutos contra reenvíos— y `markQuotePaid` es
idempotente, porque Stripe reintenta. Al volver de la pasarela también se
confirma la sesión contra Stripe: nunca nos fiamos del `?pago=ok` de la URL.

### Devolución sin preguntas

48 h desde el pago para pedir la devolución íntegra, sin justificarse. Se anula
si el cliente **ya ha pulsado algún enlace de reserva**: abrir un enlace es usar
el trabajo, y queda registrado.

Los dos criterios son objetivos y comprobables, que es lo que hace que la
política se sostenga sin discusiones. Al devolver, **el plan vuelve a
bloquearse**: es la contrapartida honesta de recuperar el dinero.

El cliente la pide con un clic y el plan se cierra al instante; el ingreso lo
haces tú y el panel te lo recuerda con el importe.

## Enlaces con seguimiento

Los enlaces de reserva no se entregan en crudo: pasan por `/ir/[token]`, que
registra el clic y redirige. Así el panel te dice **quién ha ido a reservar qué
y cuándo**, y puedes cambiar el destino sin reenviar el plan.

El destino viaja firmado dentro del propio enlace. Sin firma esto sería un
redirector abierto de manual: cualquiera podría usar el dominio de tapadera para
mandar tráfico a donde quisiera. Hay un test que lo intenta y falla.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local     # y rellena AUTH_SECRET
npm run db:seed                # crea el primer usuario del backoffice
npm run dev                    # http://localhost:3000
```

`AUTH_SECRET` se genera con `openssl rand -base64 48`. En desarrollo se usa un
valor por defecto inseguro; **en producción el arranque falla si no lo defines**.

### Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilar y servir en producción |
| `npm test` | Tests (Vitest) |
| `npm run typecheck` | TypeScript en modo estricto |
| `npm run db:seed -- email "Nombre" "contraseña"` | Alta de usuario del backoffice |
| `npm run admin:hash -- "contraseña"` | Hash scrypt suelto |
| `npm run analiza:precios` | Modelo de rentabilidad de la tarifa actual |
| `npm run db:demo` | Solicitud y propuesta de ejemplo para ver el producto |
| `npm run check:csp` | Verifica que los scripts servidos llevan el nonce correcto (con el servidor levantado) |

---

## Arquitectura

```
src/
├── app/
│   ├── (marketing)/       páginas públicas
│   ├── admin/             backoffice + server actions
│   ├── api/               solicitudes, respuesta a presupuesto, seguimiento, contacto
│   └── proxy.ts           CSP con nonce por petición
├── components/
│   ├── home/ site/ ui/    landing y sistema de diseño
│   ├── wizard/            formulario de 10 pasos + estimador en vivo
│   ├── quote/             propuesta que ve el cliente
│   └── admin/             constructor de presupuestos y controles
├── config/site.ts         marca, contacto, tarifas  ← único sitio a tocar
├── content/               textos editables (trucos, FAQ, opiniones)
└── lib/
    ├── brief.ts           esquema Zod del briefing + catálogos del formulario
    ├── catalog.ts         aeropuertos, regiones y ~70 destinos con precios base
    ├── estimator.ts       motor de estimación (todos los factores en un sitio)
    ├── repository.ts      acceso a datos
    ├── db.ts              SQLite + migraciones
    └── crypto.ts          scrypt, HMAC, referencias y tokens
```

### El estimador
`src/lib/estimator.ts` **no consulta ninguna API de vuelos**. Combina medianas
de mercado con factores conocidos (temporada, antelación, flexibilidad, escalas,
equipaje, categoría de hotel…) para dar una horquilla realista mientras el
cliente rellena el formulario. Es un gancho de conversión y un punto de partida
para el agente, y así se le presenta al usuario en todas partes.

Todos los coeficientes viven en el objeto `factors`, listos para recalibrarse
con datos reales conforme la agencia cierre presupuestos.

### Movimiento
- **Intro de marca** (`src/components/site/BrandLoader.tsx`): globo girando con el
  avión del logo en órbita. Se retira sola en cuanto la página está lista, con un
  mínimo en pantalla para que no parpadee, y la CSS la esconde a los 2 s como red
  de seguridad por si el JavaScript fallara. Solo sale en cargas completas: al
  navegar entre secciones no se repite.
- **Aparición al hacer scroll** (`src/components/site/ScrollReveal.tsx`): las
  secciones entran con un desplazamiento suave. La clase que las oculta la pone
  el propio script, así que **sin JavaScript se ve todo**; con
  `prefers-reduced-motion` se desactiva entero.

### El modelo de precio
La tarifa no es un número puesto a ojo. `scripts/rentabilidad.ts` calcula el
euro por hora real de cada perfil de cliente usando el `calculateFee` de la
propia aplicación, así que **si cambias las tarifas en `src/config/site.ts` y
vuelves a ejecutarlo, ves al momento el efecto**:

```bash
npm run analiza:precios
npm run analiza:precios -- --conversion 0.45 --horas 120 --gastos 450
```

Lo que sostiene el cálculo es que **cada reserva cerrada arrastra el trabajo de
los presupuestos que no se cerraron**: con una conversión del 33 %, cada venta
lleva detrás tres búsquedas completas. De ahí salen las dos decisiones que hacen
viable el modelo:

- **Mínimo por reserva** (49 € escapada / 99 € gran viaje): buscar para una
  persona cuesta lo mismo que buscar para cuatro.
- **Menores a mitad de tarifa en lugar de gratis**: las familias son el perfil
  más rentable y también el que más trabajo da (habitaciones familiares, tarifas
  de niño, horarios).

Ajusta `CONVERSION`, las horas por presupuesto y los pesos de cada perfil con
tus datos reales en cuanto tengas los primeros meses cerrados.

### La base de datos
SQLite mediante `better-sqlite3`, con migraciones versionadas en `src/lib/db.ts`.
Sobra para miles de solicitudes y no añade dependencias externas. Para pasar a
Postgres basta reimplementar `src/lib/repository.ts`: el resto de la aplicación
no sabe qué motor hay debajo.

---

## Seguridad

- **CSP estricta con nonce** por petición (`src/app/proxy.ts`), más HSTS,
  `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` y `Permissions-Policy`.
  Como el nonce cambia en cada petición, **todo el sitio se renderiza en
  servidor** (`export const dynamic = 'force-dynamic'` en el layout raíz): una
  página prerenderizada llevaría un nonce caducado y el navegador bloquearía
  todos los scripts, dejándola sin JavaScript sin avisar. `npm run check:csp`
  vigila que eso no vuelva a pasar.
- **Validación en servidor con Zod** en todas las entradas; el formulario nunca
  es la única barrera.
- **Antispam**: honeypot + tiempo mínimo de cumplimentación + límite por IP
  (5 solicitudes/hora en memoria y 10/día persistente).
- **Contraseñas** con scrypt y comparación en tiempo constante.
- **Enlaces privados** con token aleatorio de 256 bits del que solo se guarda el
  hash; se rota cada vez que el cliente lo recupera.
- **Sin cookies de terceros ni analítica externa**; las tipografías se
  autoalojan, así que no hay peticiones salientes desde el navegador del usuario.
- **IP nunca en claro**: se guarda un HMAC truncado solo para control de abuso.

---

## Avisos de producción (leer antes de publicar)

1. **Licencia de agencia de viajes.** En España hace falta el título-licencia de
   la comunidad autónoma correspondiente y una garantía frente a insolvencia.
   Los datos están como `PENDIENTE` en `src/config/site.ts` y aparecen en el pie
   y en el aviso legal.
2. **Textos legales.** `/aviso-legal`, `/privacidad`, `/cookies` y `/condiciones`
   son plantillas de partida serias, pero deben revisarse con un asesor,
   especialmente lo relativo a viajes combinados (RDL 1/2007 y Directiva
   (UE) 2015/2302).
3. **Opiniones.** `src/content/testimonials.ts` contiene marcadores de posición.
   Publicar testimonios inventados es publicidad engañosa: sustitúyelos por
   opiniones reales antes de abrir la web.
4. **Garantía de ahorro.** La promesa de "si no te ahorramos, no pagas" está en
   `/precios` y `/condiciones`. Ajusta las condiciones a lo que puedas cumplir.

---

## Despliegue

Necesita **runtime Node.js** (no edge) y **disco persistente** para SQLite.

- **Railway / Fly.io / VPS**: monta un volumen y apunta `DATABASE_PATH` a él
  (p. ej. `/data/zarpea.db`).
- **Vercel**: el sistema de archivos es efímero, así que ahí habría que cambiar
  el repositorio a Postgres antes de desplegar.

Variables de entorno en `.env.example`. Con `TELEGRAM_BOT_TOKEN` y
`TELEGRAM_CHAT_ID` recibes cada solicitud nueva en el móvil al instante.

---

## Tests

92 tests con Vitest cubren el esquema del briefing, el estimador y las tarifas,
la criptografía, el limitador de peticiones, el repositorio, los presupuestos y
la lógica del formulario.

```bash
npm test
```
