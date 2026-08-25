import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * SQLite embebido. Es más que suficiente para el volumen de una agencia
 * (miles de solicitudes) y elimina cualquier dependencia externa.
 *
 * Para migrar a Postgres solo hay que reimplementar `src/lib/repository.ts`:
 * el resto de la aplicación no conoce el motor de base de datos.
 */

const DEFAULT_PATH = 'data/alisio.db';

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;

  // La ruta se resuelve en tiempo de ejecución a propósito: el bundler no
  // debe intentar seguirla ni empaquetar nada de `data/`.
  const file = resolve(/* turbopackIgnore: true */ process.cwd(), process.env.DATABASE_PATH ?? DEFAULT_PATH);
  mkdirSync(dirname(file), { recursive: true });

  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  migrate(db);

  instance = db;
  return db;
}

/** Para tests: base de datos en memoria, aislada por llamada. */
export function createMemoryDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: '001_initial',
    sql: `
      CREATE TABLE requests (
        id                  TEXT PRIMARY KEY,
        reference           TEXT NOT NULL UNIQUE,
        access_token_hash   TEXT NOT NULL,
        status              TEXT NOT NULL DEFAULT 'nueva',
        brief_json          TEXT NOT NULL,
        estimate_json       TEXT,
        contact_name        TEXT NOT NULL,
        contact_email       TEXT NOT NULL,
        contact_phone       TEXT,
        contact_channel     TEXT NOT NULL DEFAULT 'whatsapp',
        destination_summary TEXT NOT NULL,
        dates_summary       TEXT NOT NULL,
        travelers           INTEGER NOT NULL DEFAULT 1,
        budget_per_person   INTEGER,
        internal_notes      TEXT,
        source              TEXT,
        ip_hash             TEXT,
        created_at          TEXT NOT NULL,
        updated_at          TEXT NOT NULL
      );
      CREATE INDEX idx_requests_status  ON requests(status, created_at DESC);
      CREATE INDEX idx_requests_created ON requests(created_at DESC);
      CREATE INDEX idx_requests_email   ON requests(contact_email);

      CREATE TABLE quotes (
        id           TEXT PRIMARY KEY,
        request_id   TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
        status       TEXT NOT NULL DEFAULT 'borrador',
        title        TEXT NOT NULL,
        message      TEXT,
        valid_until  TEXT,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL,
        sent_at      TEXT,
        responded_at TEXT,
        response_note TEXT
      );
      CREATE INDEX idx_quotes_request ON quotes(request_id, created_at DESC);

      CREATE TABLE quote_options (
        id                TEXT PRIMARY KEY,
        quote_id          TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        position          INTEGER NOT NULL DEFAULT 0,
        name              TEXT NOT NULL,
        angle             TEXT NOT NULL DEFAULT 'balanced',
        summary           TEXT,
        recommended       INTEGER NOT NULL DEFAULT 0,
        flight_json       TEXT,
        stay_json         TEXT,
        transfers_json    TEXT,
        activities_json   TEXT,
        price_flights     REAL NOT NULL DEFAULT 0,
        price_stay        REAL NOT NULL DEFAULT 0,
        price_transfers   REAL NOT NULL DEFAULT 0,
        price_activities  REAL NOT NULL DEFAULT 0,
        price_other       REAL NOT NULL DEFAULT 0,
        price_fee         REAL NOT NULL DEFAULT 0,
        market_reference  REAL,
        notes             TEXT
      );
      CREATE INDEX idx_options_quote ON quote_options(quote_id, position);

      CREATE TABLE events (
        id         TEXT PRIMARY KEY,
        request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
        type       TEXT NOT NULL,
        message    TEXT NOT NULL,
        actor      TEXT NOT NULL DEFAULT 'sistema',
        meta_json  TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_events_request ON events(request_id, created_at DESC);

      CREATE TABLE admin_users (
        id            TEXT PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        name          TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'agente',
        created_at    TEXT NOT NULL,
        last_login_at TEXT
      );
    `,
  },
];

function migrate(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);

  const applied = new Set(
    db.prepare<[], { name: string }>('SELECT name FROM _migrations').all().map((row) => row.name),
  );

  const insert = db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)');

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) continue;
    db.transaction(() => {
      db.exec(migration.sql);
      insert.run(migration.name, new Date().toISOString());
    })();
  }
}
