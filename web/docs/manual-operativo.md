# Manual operativo

Cómo se trabaja una solicitud de principio a fin. Los estados en **negrita** son
los del panel (`/admin`).

```
Nueva → En estudio → Presupuestada → Aceptada → Reservada → Cerrada
                          ↘ (pide cambios) ↩         ↘ Descartada
```

---

## 1 · Entra la solicitud → 0-15 min · estado **Nueva**

Llega el aviso a Telegram y aparece en el panel. Antes de tocar nada, tres
preguntas de criba:

| Pregunta | Si la respuesta es no |
|---|---|
| ¿Fechas y presupuesto son compatibles? | Contesta con la realidad y una alternativa. No busques. |
| ¿Salen en más de 10 días? | Solo acéptalo si puedes cerrarlo hoy. |
| ¿Ha marcado prioritario? | Va primero: ha pagado por ello. |

**Acuse de recibo por WhatsApp en menos de 15 minutos.** Es lo más rentable del
día: sube la conversión, que es la variable que más manda en el euro por hora.

> Hola Ana, soy Dani de Alisio. Ya tengo tu solicitud AL-7K3QP9 para Roma. Me
> pongo con ella y te escribo mañana antes de las 14 h.

Pasa a **En estudio**.

## 2 · La búsqueda → 60-180 min · estado **En estudio**

Siempre en este orden; cambiarlo obliga a repetir trabajo.

1. **Encuadre (10 min).** Escribe la estrategia en las notas internas: qué
   aeropuertos entran, qué ventana de fechas, dónde crees que está el ahorro.
2. **Vuelo primero (30-60 min).** Calendario del mes entero, aeropuertos
   alternativos con el coste real de llegar, precio con *su* equipaje. Sales con
   tres candidatos: barato, equilibrado, cómodo.
3. **Hotel después (20-40 min).** Tres alojamientos alineados con esos tres
   vuelos. Contrasta el canal directo.
4. **Traslados y extras (10 min).** Solo lo que pidió.
5. **Números (10 min).** Tarifa, referencia de mercado para el «ahorras X».

> **Regla del cronómetro:** si duplicas el tiempo previsto, para y manda lo que
> tengas. Una búsqueda de 5 h para una escapada destruye el margen y el cliente
> no nota la diferencia.

## 3 · La propuesta → 20-30 min · estado **Presupuestada**

En el constructor del panel: «Rellenar con la estimación» → ajusta con precios
reales → escribe el mensaje. Tres frases bastan:

1. Qué has encontrado y qué te ha sorprendido
2. Cuál recomiendas **y por qué**
3. Qué pierde si elige la barata

Validez de 3 a 5 días, siempre. «Guardar y enviar» y avisa por WhatsApp.

**En modo asesor**, además: cada partida lleva su enlace de reserva y marcada la
casilla de comisión cuando corresponda.

## 4 · Seguimiento → 2-5 días

Donde se pierde el dinero es aquí: mandar la propuesta y esperar sentado.

| Cuándo | Qué haces |
|---|---|
| +24 h | «¿Le has podido echar un ojo? ¿Alguna duda?» |
| +72 h | Aporta algo nuevo: ha subido el precio, quedan pocas plazas |
| Vence | «Se me caduca hoy. ¿Lo dejo aquí o lo reviso?» |

Sin respuesta tras el vencimiento → **Descartada**. No insistas más.

## 5 · Cierre → mismo día · estado **Aceptada** → **Reservada**

El orden importa:

1. **Reconfirma el precio antes de cobrar.** Nunca al revés.
2. **Cobra** honorarios (y el viaje, solo en modo agencia).
3. **Reserva en este orden:** vuelo → alojamiento → extras. El vuelo se mueve en
   minutos.
4. **Localizadores al cliente en menos de 2 horas.**

En **modo asesor** los pasos 2-4 los hace el cliente: le pasas los enlaces y
quedáis por WhatsApp mientras reserva, en ese mismo orden.

## 6 · Antes del viaje

| Cuándo | Qué |
|---|---|
| −30 días | Radar de precios: ¿ha bajado algo cancelable? |
| −7 días | Dossier: documentación, visados, qué llevar |
| −2 días | Recordatorio de check-in y tu WhatsApp |

## 7 · Durante y después → estado **Cerrada**

WhatsApp abierto durante el viaje. A la vuelta, dos cosas:

- **Pide la opinión.** `src/content/testimonials.ts` está esperando opiniones
  reales.
- **Anota los datos reales**: horas invertidas, si cerró, margen obtenido. Con
  eso recalibras: `npm run analiza:precios -- --conversion 0.41`

---

## Seis reglas que protegen el margen

1. Nunca reserves con tu tarjeta sin haber cobrado.
2. Nunca el hotel antes que el vuelo.
3. Validez por escrito, siempre.
4. Una ronda de cambios incluida (tres si pagó prioritario).
5. Cronómetro en la búsqueda.
6. Di que no a lo que no da margen, y con una alternativa honesta.

## Día tipo

| Franja | Qué |
|---|---|
| 9:00-9:30 | Acuses de recibo y seguimientos |
| 9:30-13:30 | Búsqueda profunda (2-3 propuestas) |
| 13:30-14:30 | Redactar y enviar |
| 16:00-18:00 | Cierres y gestión |
| 18:00-18:30 | Radar de precios de las reservas vivas |

Son 4-5 propuestas al día: exactamente el volumen que necesita el modelo de
rentabilidad.

## Qué mide el panel y qué no

| Fase | En el panel | Manual |
|---|---|---|
| Recepción y aviso | ✅ Telegram + bandeja | — |
| Triaje, notas, historial | ✅ | — |
| Búsqueda | — | Todo |
| Propuesta y envío | ✅ Constructor + enlace privado | — |
| Respuesta del cliente | ✅ Aceptar / pedir cambios | — |
| Cobro | ❌ | Transferencia o Stripe |
| Reserva con proveedores | ❌ | Sus plataformas |
| Documentos y radar | ❌ | WhatsApp y calendario |
