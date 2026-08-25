# Viajalisto · agencia de viajes low cost

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

### La base de datos
SQLite mediante `better-sqlite3`, con migraciones versionadas en `src/lib/db.ts`.
Sobra para miles de solicitudes y no añade dependencias externas. Para pasar a
Postgres basta reimplementar `src/lib/repository.ts`: el resto de la aplicación
no sabe qué motor hay debajo.

---

## Seguridad

- **CSP estricta con nonce** por petición (`src/app/proxy.ts`), más HSTS,
  `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` y `Permissions-Policy`.
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
  (p. ej. `/data/viajalisto.db`).
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
