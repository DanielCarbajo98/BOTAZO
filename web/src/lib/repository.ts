import type BetterSqlite3 from 'better-sqlite3';
import { getDb } from '@/lib/db';
import { newId, newReference, newToken, sha256, safeEqual } from '@/lib/crypto';
import type { Brief } from '@/lib/brief';
import { travelerCount } from '@/lib/brief';
import type { Estimate } from '@/lib/estimator';
import { datesSummary, destinationSummary } from '@/lib/summary';
import { REQUEST_STATUSES, STATUS_META, type RequestStatus } from '@/lib/request-status';

export { REQUEST_STATUSES, STATUS_META };
export type { RequestStatus, StatusTone } from '@/lib/request-status';

export type RequestRow = {
  id: string;
  reference: string;
  access_token_hash: string;
  status: RequestStatus;
  brief_json: string;
  estimate_json: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  contact_channel: string;
  destination_summary: string;
  dates_summary: string;
  travelers: number;
  budget_per_person: number | null;
  internal_notes: string | null;
  source: string | null;
  ip_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type TravelRequest = Omit<RequestRow, 'brief_json' | 'estimate_json' | 'access_token_hash'> & {
  brief: Brief;
  estimate: Estimate | null;
};

export type QuoteRow = {
  id: string;
  request_id: string;
  status: 'borrador' | 'enviado' | 'aceptado' | 'cambios' | 'caducado';
  title: string;
  message: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  responded_at: string | null;
  response_note: string | null;
};

export type QuoteOptionRow = {
  id: string;
  quote_id: string;
  position: number;
  name: string;
  angle: 'cheapest' | 'balanced' | 'comfort';
  summary: string | null;
  recommended: number;
  flight_json: string | null;
  stay_json: string | null;
  transfers_json: string | null;
  activities_json: string | null;
  price_flights: number;
  price_stay: number;
  price_transfers: number;
  price_activities: number;
  price_other: number;
  price_fee: number;
  market_reference: number | null;
  notes: string | null;
};

export type EventRow = {
  id: string;
  request_id: string;
  type: string;
  message: string;
  actor: string;
  meta_json: string | null;
  created_at: string;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  created_at: string;
  last_login_at: string | null;
};

const now = () => new Date().toISOString();

function hydrate(row: RequestRow): TravelRequest {
  const { brief_json, estimate_json, access_token_hash: _token, ...rest } = row;
  return {
    ...rest,
    brief: JSON.parse(brief_json) as Brief,
    estimate: estimate_json ? (JSON.parse(estimate_json) as Estimate) : null,
  };
}

export class Repository {
  constructor(private readonly db: BetterSqlite3.Database = getDb()) {}

  /* ------------------------------ solicitudes ------------------------------ */

  createRequest(input: {
    brief: Brief;
    estimate: Estimate | null;
    source?: string;
    ipHash?: string;
  }): { request: TravelRequest; accessToken: string } {
    const id = newId();
    const accessToken = newToken();
    const timestamp = now();
    const people = travelerCount(input.brief.travelers);

    // Colisión de referencia prácticamente imposible, pero es barato reintentar.
    let reference = newReference();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const clash = this.db.prepare('SELECT 1 FROM requests WHERE reference = ?').get(reference);
      if (!clash) break;
      reference = newReference();
    }

    this.db
      .prepare(
        `INSERT INTO requests (
          id, reference, access_token_hash, status, brief_json, estimate_json,
          contact_name, contact_email, contact_phone, contact_channel,
          destination_summary, dates_summary, travelers, budget_per_person,
          source, ip_hash, created_at, updated_at
        ) VALUES (
          @id, @reference, @tokenHash, 'nueva', @brief, @estimate,
          @name, @email, @phone, @channel,
          @destination, @dates, @travelers, @budget,
          @source, @ipHash, @createdAt, @updatedAt
        )`,
      )
      .run({
        id,
        reference,
        tokenHash: sha256(accessToken),
        brief: JSON.stringify(input.brief),
        estimate: input.estimate ? JSON.stringify(input.estimate) : null,
        name: input.brief.contact.name,
        email: input.brief.contact.email.toLowerCase(),
        phone: input.brief.contact.phone ?? null,
        channel: input.brief.contact.channel,
        destination: destinationSummary(input.brief),
        dates: datesSummary(input.brief),
        travelers: people.total,
        budget: input.brief.budget.perPerson ?? null,
        source: input.source ?? null,
        ipHash: input.ipHash ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

    this.addEvent(id, {
      type: 'creada',
      message: 'Solicitud recibida desde la web',
      actor: 'cliente',
    });

    return { request: this.getRequestById(id)!, accessToken };
  }

  getRequestById(id: string): TravelRequest | null {
    const row = this.db.prepare<[string], RequestRow>('SELECT * FROM requests WHERE id = ?').get(id);
    return row ? hydrate(row) : null;
  }

  getRequestByReference(reference: string): TravelRequest | null {
    const row = this.db
      .prepare<[string], RequestRow>('SELECT * FROM requests WHERE reference = ?')
      .get(reference.toUpperCase().trim());
    return row ? hydrate(row) : null;
  }

  /** Comprueba el token del enlace privado del cliente. */
  verifyAccess(reference: string, token: string): TravelRequest | null {
    const row = this.db
      .prepare<[string], RequestRow>('SELECT * FROM requests WHERE reference = ?')
      .get(reference.toUpperCase().trim());
    if (!row) return null;
    if (!safeEqual(sha256(token), row.access_token_hash)) return null;
    return hydrate(row);
  }

  listRequests(filter: { status?: RequestStatus; search?: string; limit?: number; offset?: number } = {}): TravelRequest[] {
    const clauses: string[] = [];
    const params: Record<string, unknown> = {
      limit: Math.min(filter.limit ?? 50, 200),
      offset: filter.offset ?? 0,
    };

    if (filter.status) {
      clauses.push('status = @status');
      params.status = filter.status;
    }
    if (filter.search) {
      clauses.push(
        '(reference LIKE @search OR contact_name LIKE @search OR contact_email LIKE @search OR destination_summary LIKE @search)',
      );
      params.search = `%${filter.search.trim()}%`;
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db
      .prepare<Record<string, unknown>, RequestRow>(
        `SELECT * FROM requests ${where} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`,
      )
      .all(params);
    return rows.map(hydrate);
  }

  countByStatus(): Record<RequestStatus, number> {
    const rows = this.db
      .prepare<[], { status: RequestStatus; total: number }>(
        'SELECT status, COUNT(*) AS total FROM requests GROUP BY status',
      )
      .all();
    const counts = Object.fromEntries(REQUEST_STATUSES.map((s) => [s, 0])) as Record<RequestStatus, number>;
    for (const row of rows) counts[row.status] = row.total;
    return counts;
  }

  countRecent(sinceIso: string): number {
    const row = this.db
      .prepare<[string], { total: number }>('SELECT COUNT(*) AS total FROM requests WHERE created_at >= ?')
      .get(sinceIso);
    return row?.total ?? 0;
  }

  /** Solicitudes creadas por la misma IP en la ventana indicada (antiabuso). */
  countByIpSince(ipHash: string, sinceIso: string): number {
    const row = this.db
      .prepare<[string, string], { total: number }>(
        'SELECT COUNT(*) AS total FROM requests WHERE ip_hash = ? AND created_at >= ?',
      )
      .get(ipHash, sinceIso);
    return row?.total ?? 0;
  }

  updateStatus(id: string, status: RequestStatus, actor = 'agente'): void {
    this.db.prepare('UPDATE requests SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), id);
    this.addEvent(id, { type: 'estado', message: `Estado cambiado a "${STATUS_META[status].label}"`, actor });
  }

  updateInternalNotes(id: string, notes: string): void {
    this.db.prepare('UPDATE requests SET internal_notes = ?, updated_at = ? WHERE id = ?').run(notes, now(), id);
  }

  /* --------------------------------- eventos -------------------------------- */

  addEvent(
    requestId: string,
    event: { type: string; message: string; actor?: string; meta?: unknown },
  ): void {
    this.db
      .prepare(
        `INSERT INTO events (id, request_id, type, message, actor, meta_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        newId(),
        requestId,
        event.type,
        event.message,
        event.actor ?? 'sistema',
        event.meta ? JSON.stringify(event.meta) : null,
        now(),
      );
  }

  listEvents(requestId: string): EventRow[] {
    return this.db
      .prepare<[string], EventRow>('SELECT * FROM events WHERE request_id = ? ORDER BY created_at DESC')
      .all(requestId);
  }

  /* ------------------------------- presupuestos ------------------------------ */

  createQuote(requestId: string, input: { title: string; message?: string; validUntil?: string }): QuoteRow {
    const id = newId();
    const timestamp = now();
    this.db
      .prepare(
        `INSERT INTO quotes (id, request_id, status, title, message, valid_until, created_at, updated_at)
         VALUES (?, ?, 'borrador', ?, ?, ?, ?, ?)`,
      )
      .run(id, requestId, input.title, input.message ?? null, input.validUntil ?? null, timestamp, timestamp);
    return this.getQuote(id)!;
  }

  getQuote(id: string): QuoteRow | null {
    return this.db.prepare<[string], QuoteRow>('SELECT * FROM quotes WHERE id = ?').get(id) ?? null;
  }

  listQuotes(requestId: string): QuoteRow[] {
    return this.db
      .prepare<[string], QuoteRow>('SELECT * FROM quotes WHERE request_id = ? ORDER BY created_at DESC')
      .all(requestId);
  }

  /** El presupuesto vivo que ve el cliente: el último que se le ha enviado. */
  getVisibleQuote(requestId: string): { quote: QuoteRow; options: QuoteOptionRow[] } | null {
    const quote = this.db
      .prepare<[string], QuoteRow>(
        `SELECT * FROM quotes WHERE request_id = ? AND status != 'borrador' ORDER BY sent_at DESC LIMIT 1`,
      )
      .get(requestId);
    if (!quote) return null;
    return { quote, options: this.listOptions(quote.id) };
  }

  updateQuote(id: string, input: { title?: string; message?: string; validUntil?: string | null }): void {
    const quote = this.getQuote(id);
    if (!quote) return;
    this.db
      .prepare('UPDATE quotes SET title = ?, message = ?, valid_until = ?, updated_at = ? WHERE id = ?')
      .run(
        input.title ?? quote.title,
        input.message ?? quote.message,
        input.validUntil === undefined ? quote.valid_until : input.validUntil,
        now(),
        id,
      );
  }

  replaceOptions(quoteId: string, options: Omit<QuoteOptionRow, 'id' | 'quote_id'>[]): void {
    const insert = this.db.prepare(
      `INSERT INTO quote_options (
        id, quote_id, position, name, angle, summary, recommended,
        flight_json, stay_json, transfers_json, activities_json,
        price_flights, price_stay, price_transfers, price_activities, price_other, price_fee,
        market_reference, notes
      ) VALUES (
        @id, @quote_id, @position, @name, @angle, @summary, @recommended,
        @flight_json, @stay_json, @transfers_json, @activities_json,
        @price_flights, @price_stay, @price_transfers, @price_activities, @price_other, @price_fee,
        @market_reference, @notes
      )`,
    );
    const wipe = this.db.prepare('DELETE FROM quote_options WHERE quote_id = ?');

    this.db.transaction(() => {
      wipe.run(quoteId);
      options.forEach((option, index) => {
        insert.run({ ...option, id: newId(), quote_id: quoteId, position: index });
      });
      this.db.prepare('UPDATE quotes SET updated_at = ? WHERE id = ?').run(now(), quoteId);
    })();
  }

  listOptions(quoteId: string): QuoteOptionRow[] {
    return this.db
      .prepare<[string], QuoteOptionRow>('SELECT * FROM quote_options WHERE quote_id = ? ORDER BY position')
      .all(quoteId);
  }

  sendQuote(quoteId: string, actor = 'agente'): QuoteRow | null {
    const quote = this.getQuote(quoteId);
    if (!quote) return null;
    const timestamp = now();
    this.db
      .prepare(`UPDATE quotes SET status = 'enviado', sent_at = ?, updated_at = ? WHERE id = ?`)
      .run(timestamp, timestamp, quoteId);
    this.db
      .prepare(`UPDATE requests SET status = 'presupuestada', updated_at = ? WHERE id = ?`)
      .run(timestamp, quote.request_id);
    this.addEvent(quote.request_id, {
      type: 'presupuesto',
      message: `Presupuesto "${quote.title}" enviado al cliente`,
      actor,
    });
    return this.getQuote(quoteId);
  }

  respondToQuote(quoteId: string, response: 'aceptado' | 'cambios', note?: string): void {
    const quote = this.getQuote(quoteId);
    if (!quote) return;
    const timestamp = now();
    this.db
      .prepare('UPDATE quotes SET status = ?, responded_at = ?, response_note = ?, updated_at = ? WHERE id = ?')
      .run(response, timestamp, note ?? null, timestamp, quoteId);
    this.db
      .prepare('UPDATE requests SET status = ?, updated_at = ? WHERE id = ?')
      .run(response === 'aceptado' ? 'aceptada' : 'en_estudio', timestamp, quote.request_id);
    this.addEvent(quote.request_id, {
      type: 'respuesta',
      message:
        response === 'aceptado'
          ? 'El cliente ha aceptado el presupuesto'
          : `El cliente ha pedido cambios${note ? `: ${note}` : ''}`,
      actor: 'cliente',
    });
  }

  /* ------------------------------- usuarios admin ---------------------------- */

  createAdminUser(input: { email: string; name: string; passwordHash: string; role?: string }): AdminUser {
    const id = newId();
    this.db
      .prepare(
        `INSERT INTO admin_users (id, email, name, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.email.toLowerCase().trim(), input.name, input.passwordHash, input.role ?? 'agente', now());
    return this.findAdminById(id)!;
  }

  findAdminByEmail(email: string): AdminUser | null {
    return (
      this.db
        .prepare<[string], AdminUser>('SELECT * FROM admin_users WHERE email = ?')
        .get(email.toLowerCase().trim()) ?? null
    );
  }

  findAdminById(id: string): AdminUser | null {
    return this.db.prepare<[string], AdminUser>('SELECT * FROM admin_users WHERE id = ?').get(id) ?? null;
  }

  touchAdminLogin(id: string): void {
    this.db.prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?').run(now(), id);
  }

  countAdmins(): number {
    return this.db.prepare<[], { total: number }>('SELECT COUNT(*) AS total FROM admin_users').get()?.total ?? 0;
  }
}

/** Repositorio por defecto sobre la base de datos de la aplicación. */
export function repo(): Repository {
  return new Repository(getDb());
}
