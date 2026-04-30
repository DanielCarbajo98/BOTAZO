# Audiobet

Bot de Telegram que cada mañana envía un análisis de los partidos del día con
detección de **value bets** (apuestas con valor esperado positivo) sobre
fútbol.

> Estado actual: **Fase 1** — infraestructura y bot Telegram funcional con los
> comandos básicos. Los collectors, modelos y detector de valor llegarán en
> fases posteriores.

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
| `/hoy`   | 🟡 Placeholder (Fase 2-4) | Partidos del día con picks de valor |
| `/stats` | 🟡 Placeholder (Fase 5)   | ROI, hit rate, drawdown histórico |

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

## Roadmap

- **Fase 1 — Infraestructura básica** ✅
- Fase 2 — Collectors FBref + Understat
- Fase 3 — Modelo Poisson + xG + Elo
- Fase 4 — Cuotas + value detector + reporte diario real
- Fase 5 — Stats individuales + tracking de picks resueltas

## Filosofía

- Tracking honesto de aciertos y fallos.
- Sin promesas de % de aciertos ni ROI.
- Datos de fuentes públicas y gratuitas, respetando rate limits.
- Detectamos valor, no predecimos el futuro.
