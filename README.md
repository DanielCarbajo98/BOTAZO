# Audiobet

Bot de Telegram que cada mañana envía un análisis de los partidos del día con
detección de **value bets** (apuestas con valor esperado positivo) sobre
fútbol.

> Estado actual: **Fase 5** — tracking honesto de picks. El bot resuelve
> automáticamente cada noche las apuestas pasadas contra los resultados
> reales y `/stats` te muestra ROI, hit rate, drawdown y desglose por
> liga y mercado. Mensajes Telegram rediseñados en HTML con jerarquía
> visual clara.

## Stack

- Python 3.11+
- [`python-telegram-bot`](https://python-telegram-bot.org/) v21
- Supabase (Postgres) para persistencia
- APScheduler para el cron diario
- httpx + BeautifulSoup + lxml para scraping (Fase 2+)
- Hosting en Railway (worker permanente)

## Estructura

```
audiobet/
├── src/
│   ├── bot/             # bot Telegram + formatters
│   ├── collectors/      # scrapers FBref / Understat / Flashscore (Fase 2)
│   ├── models/          # Poisson, Elo, ajuste xG (Fase 3)
│   ├── analyzer/        # informe diario
│   ├── storage/         # cliente Supabase + migraciones
│   ├── utils/           # rate limiter, cache, kelly (Fase 2-4)
│   ├── config.py
│   └── main.py
├── tests/
├── requirements.txt
├── Procfile
└── .env.example
```

## Instalación local (paso a paso)

1. Clona el repo y entra en la carpeta:

   ```bash
   git clone <url> audiobet && cd audiobet
   ```

2. Crea un entorno virtual e instala dependencias:

   ```bash
   python3.11 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. Copia el archivo de variables de entorno:

   ```bash
   cp .env.example .env
   ```

4. Rellena `.env` con tus credenciales:

   - `TELEGRAM_BOT_TOKEN` — lo obtienes hablando con
     [@BotFather](https://t.me/BotFather): `/newbot`, sigue las instrucciones
     y copia el token que te da.
   - `TELEGRAM_CHAT_ID` — escribe a [@userinfobot](https://t.me/userinfobot)
     y te devuelve tu chat id (un número).
   - `SUPABASE_URL` y `SUPABASE_KEY` — desde el dashboard de Supabase, en
     **Settings → API**: usa la URL del proyecto y la `anon public key`.

5. (Opcional pero recomendado) Verifica las credenciales antes de arrancar:

   ```bash
   PYTHONPATH=. python scripts/preflight.py
   ```

   El script hace `getMe` + `getChat` + `send_message` contra Telegram y un
   `select` sobre tres tablas de Supabase. Si todo sale en `OK`, las
   credenciales están bien. Si falla `send_message` a un canal, asegúrate de
   que el bot está añadido como **administrador** con permiso de "Publicar
   mensajes".

6. Lanza el bot:

   ```bash
   python -m src.main
   ```

   Deberías ver en consola algo como:

   ```
   [INFO] audiobet: Starting Audiobet
   [INFO] audiobet: Scheduled daily_report at 09:00 Europe/Madrid
   [INFO] audiobet: Audiobet is up. Press Ctrl+C to stop.
   ```

6. Abre Telegram, busca tu bot por nombre y escríbele `/start`. Debería
   responder con el mensaje de bienvenida.

## Comandos

| Comando | Estado | Descripción |
|---------|--------|-------------|
| `/start` | ✅ Fase 1 | Mensaje de bienvenida |
| `/help`  | ✅ Fase 1 | Ayuda |
| `/hoy`   | ✅ Fase 3 | Partidos del día con predicciones del modelo |
| `/informe` | ✅ Fase 4 | Fuerza el informe diario ahora (con picks de valor si hay cuotas) |
| `/stats` | ✅ Fase 5 | ROI, hit rate, drawdown, desglose por liga/mercado |
| `/manana` | ✅ | Partidos de mañana |
| `/partidos N` | ✅ | Partidos en N días (rango -7…+14) |

El bot también envía automáticamente un informe a las **09:00 Europe/Madrid**.

## Despliegue en Railway

1. Crea un proyecto en [Railway](https://railway.app/) y conéctalo al repo de
   GitHub.
2. En **Variables**, añade las cuatro requeridas (`TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_CHAT_ID`, `SUPABASE_URL`, `SUPABASE_KEY`). El resto son opcionales
   con valores por defecto sensatos.
3. Railway detecta el `Procfile` y lanza un worker con
   `python -m src.main`.
4. Comprueba los logs en la pestaña **Deployments → Logs**.

## Tests

```bash
pytest -q
```

Los tests de Fase 1 cubren los formatters, la carga de configuración y el
registro del job en el scheduler.

## Fuente de datos

La fuente primaria de partidos es **[football-data.org](https://www.football-data.org/)**
(API REST gratuita, 10 req/min, top 5 ligas + Champions League).

FBref se queda como fallback en código pero **no funciona desde IPs de
datacenter** (Cloudflare devuelve 403). Se mantiene el módulo por si en el
futuro corremos desde una IP residencial.

Understat sigue siendo la fuente de **xG** para top 5 ligas.

### Conseguir la API key (gratis, 3 minutos)

1. Regístrate en [https://www.football-data.org/client/register](https://www.football-data.org/client/register).
2. Confirma el correo.
3. En tu panel verás una API key larga.
4. Añádela como variable de entorno **`FOOTBALL_DATA_API_KEY`**:
   - En local: en `.env`.
   - En Railway: en Variables del servicio.

Sin esta clave, el bot arranca pero el refresh diario no traerá partidos.

## Migraciones de Supabase

Ejecuta una sola vez la migración 002 (crea `players` y `player_match_stats`)
desde el **SQL Editor** de Supabase:

```
src/storage/migrations/002_player_stats.sql
```

Pega el contenido en el editor SQL del dashboard y dale a Run.

## Refresh manual de datos

El bot lanza un refresh ~30s después de arrancar y luego cada noche a las
02:00 Europe/Madrid. Para forzarlo a mano:

```bash
PYTHONPATH=. python scripts/refresh_now.py
```

Lee de FBref (fixtures + scores) y Understat (xG) y hace upsert en Supabase.

## Probar el modelo manualmente

Una vez tengas datos cargados (Fase 2 + refresh ejecutado), prueba cualquier
emparejamiento con:

```bash
PYTHONPATH=. python scripts/predict.py "Real Madrid" "Real Sociedad"
```

El script hace match parcial por nombre, pulla últimos 10 partidos de cada
equipo, replay de Elo sobre todos los finalizados de la temporada y devuelve:

- Expected goals (λ) home/away
- Probabilidades 1X2
- Over/Under 2.5
- BTTS

## Roadmap

- **Fase 1 — Infraestructura básica** ✅
- **Fase 2 — Collectors football-data + Understat** ✅
- **Fase 3 — Modelo Poisson + xG + Elo** ✅
- **Fase 4 — Cuotas + value detector + reporte diario real** ✅
- **Fase 5 — Tracking honesto + /stats + UX rediseñada** ✅
- Fase 6 (futura) — Stats individuales de jugadores y mercados específicos

## Filosofía

- Tracking honesto de aciertos y fallos.
- Sin promesas de % de aciertos ni ROI.
- Datos de fuentes públicas y gratuitas, respetando rate limits.
- Detectamos valor, no predecimos el futuro.

---

## Otros proyectos de este repositorio

- **`web/`** — *Viajalisto*, la web de la agencia de viajes low cost
  (Next.js + TypeScript). Ver [`web/README.md`](web/README.md).
