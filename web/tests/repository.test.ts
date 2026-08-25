import { beforeEach, describe, expect, it } from 'vitest';
import type BetterSqlite3 from 'better-sqlite3';
import { createMemoryDb } from '@/lib/db';
import { Repository } from '@/lib/repository';
import { hashPassword } from '@/lib/crypto';
import { estimate } from '@/lib/estimator';
import { makeBrief } from './factories';

let db: BetterSqlite3.Database;
let repo: Repository;

beforeEach(() => {
  db = createMemoryDb();
  repo = new Repository(db);
});

const create = () => {
  const brief = makeBrief();
  return repo.createRequest({ brief, estimate: estimate(brief), ipHash: 'hash-ip' });
};

describe('solicitudes', () => {
  it('crea una solicitud con referencia y token de acceso', () => {
    const { request, accessToken } = create();
    expect(request.reference).toMatch(/^VJ-/);
    expect(request.status).toBe('nueva');
    expect(accessToken.length).toBeGreaterThan(20);
    expect(request.travelers).toBe(2);
  });

  it('no expone el hash del token al hidratar', () => {
    const { request } = create();
    expect(request).not.toHaveProperty('access_token_hash');
  });

  it('deja rastro del evento de creación', () => {
    const { request } = create();
    const events = repo.listEvents(request.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('creada');
  });

  it('acepta el token correcto y rechaza cualquier otro', () => {
    const { request, accessToken } = create();
    expect(repo.verifyAccess(request.reference, accessToken)?.id).toBe(request.id);
    expect(repo.verifyAccess(request.reference, 'token-falso')).toBeNull();
    expect(repo.verifyAccess('VJ-NOEXIST', accessToken)).toBeNull();
  });

  it('busca por referencia sin distinguir mayúsculas', () => {
    const { request } = create();
    expect(repo.getRequestByReference(request.reference.toLowerCase())?.id).toBe(request.id);
  });

  it('filtra por estado y por texto', () => {
    const { request } = create();
    repo.updateStatus(request.id, 'en_estudio');

    expect(repo.listRequests({ status: 'en_estudio' })).toHaveLength(1);
    expect(repo.listRequests({ status: 'nueva' })).toHaveLength(0);
    expect(repo.listRequests({ search: request.reference })).toHaveLength(1);
    expect(repo.listRequests({ search: 'ana@example.com' })).toHaveLength(1);
    expect(repo.listRequests({ search: 'nadie' })).toHaveLength(0);
  });

  it('cuenta por estado y por IP', () => {
    create();
    create();
    expect(repo.countByStatus().nueva).toBe(2);
    expect(repo.countByIpSince('hash-ip', '2000-01-01T00:00:00.000Z')).toBe(2);
    expect(repo.countByIpSince('otra', '2000-01-01T00:00:00.000Z')).toBe(0);
  });

  it('guarda notas internas', () => {
    const { request } = create();
    repo.updateInternalNotes(request.id, 'probar Ryanair desde Girona');
    expect(repo.getRequestById(request.id)?.internal_notes).toContain('Girona');
  });
});

describe('presupuestos', () => {
  it('no muestra al cliente un presupuesto en borrador', () => {
    const { request } = create();
    const quote = repo.createQuote(request.id, { title: 'Roma' });
    repo.replaceOptions(quote.id, [option()]);
    expect(repo.getVisibleQuote(request.id)).toBeNull();
  });

  it('al enviarlo pasa a visible y cambia el estado de la solicitud', () => {
    const { request } = create();
    const quote = repo.createQuote(request.id, { title: 'Roma' });
    repo.replaceOptions(quote.id, [option()]);
    repo.sendQuote(quote.id);

    const visible = repo.getVisibleQuote(request.id);
    expect(visible?.quote.status).toBe('enviado');
    expect(visible?.options).toHaveLength(1);
    expect(repo.getRequestById(request.id)?.status).toBe('presupuestada');
  });

  it('replaceOptions sustituye, no acumula', () => {
    const { request } = create();
    const quote = repo.createQuote(request.id, { title: 'Roma' });
    repo.replaceOptions(quote.id, [option(), option('Otra')]);
    repo.replaceOptions(quote.id, [option('Única')]);

    const options = repo.listOptions(quote.id);
    expect(options).toHaveLength(1);
    expect(options[0]?.name).toBe('Única');
    expect(options[0]?.position).toBe(0);
  });

  it('registra la aceptación del cliente', () => {
    const { request } = create();
    const quote = repo.createQuote(request.id, { title: 'Roma' });
    repo.replaceOptions(quote.id, [option()]);
    repo.sendQuote(quote.id);
    repo.respondToQuote(quote.id, 'aceptado');

    expect(repo.getQuote(quote.id)?.status).toBe('aceptado');
    expect(repo.getRequestById(request.id)?.status).toBe('aceptada');
  });

  it('una petición de cambios devuelve la solicitud a estudio', () => {
    const { request } = create();
    const quote = repo.createQuote(request.id, { title: 'Roma' });
    repo.sendQuote(quote.id);
    repo.respondToQuote(quote.id, 'cambios', 'prefiero vuelo directo');

    expect(repo.getRequestById(request.id)?.status).toBe('en_estudio');
    expect(repo.listEvents(request.id).some((event) => event.message.includes('vuelo directo'))).toBe(true);
  });

  it('borrar la solicitud arrastra presupuestos y opciones', () => {
    const { request } = create();
    const quote = repo.createQuote(request.id, { title: 'Roma' });
    repo.replaceOptions(quote.id, [option()]);

    db.prepare('DELETE FROM requests WHERE id = ?').run(request.id);
    expect(repo.getQuote(quote.id)).toBeNull();
    expect(repo.listOptions(quote.id)).toHaveLength(0);
  });
});

describe('usuarios del backoffice', () => {
  it('crea, busca y no duplica emails', () => {
    repo.createAdminUser({ email: 'Agente@Example.com', name: 'Agente', passwordHash: hashPassword('contraseña larga') });
    expect(repo.countAdmins()).toBe(1);
    expect(repo.findAdminByEmail('agente@example.com')?.name).toBe('Agente');
    expect(() =>
      repo.createAdminUser({ email: 'agente@example.com', name: 'Otro', passwordHash: 'x' }),
    ).toThrow();
  });
});

function option(name = 'Equilibrada') {
  return {
    position: 0,
    name,
    angle: 'balanced' as const,
    summary: null,
    recommended: 1,
    flight_json: null,
    stay_json: null,
    transfers_json: null,
    activities_json: null,
    price_flights: 300,
    price_stay: 200,
    price_transfers: 0,
    price_activities: 0,
    price_other: 0,
    price_fee: 38,
    market_reference: 700,
    notes: null,
  };
}
