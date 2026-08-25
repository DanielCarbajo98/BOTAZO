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
    expect(request.reference).toMatch(/^AL-/);
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
    expect(repo.verifyAccess('AL-NOEXIST', accessToken)).toBeNull();
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

describe('desbloqueo de pago', () => {
  const withQuote = (unlockFee: number) => {
    const { request } = create();
    const quote = repo.createQuote(request.id, { title: 'Roma', unlockFee });
    repo.sendQuote(quote.id);
    return { request, quote: repo.getQuote(quote.id)! };
  };

  it('un plan con precio nace pendiente de pago', () => {
    const { quote } = withQuote(38);
    expect(quote.unlock_fee).toBe(38);
    expect(quote.unlock_status).toBe('pendiente');
  });

  it('marcarlo pagado lo desbloquea y deja rastro', () => {
    const { request, quote } = withQuote(38);
    repo.markQuotePaid(quote.id, { method: 'Bizum', reference: 'ABC123' });

    const updated = repo.getQuote(quote.id)!;
    expect(updated.unlock_status).toBe('pagado');
    expect(updated.payment_method).toBe('Bizum');
    expect(updated.paid_at).toBeTruthy();
    expect(repo.listEvents(request.id).some((e) => e.type === 'pago')).toBe(true);
  });

  it('es idempotente: Stripe puede repetir el webhook', () => {
    const { request, quote } = withQuote(38);
    repo.markQuotePaid(quote.id, { method: 'Stripe', reference: 'cs_1' });
    const firstPaidAt = repo.getQuote(quote.id)!.paid_at;

    repo.markQuotePaid(quote.id, { method: 'Stripe', reference: 'cs_1' });
    repo.markQuotePaid(quote.id, { method: 'Stripe', reference: 'cs_1' });

    expect(repo.getQuote(quote.id)!.paid_at).toBe(firstPaidAt);
    expect(repo.listEvents(request.id).filter((e) => e.type === 'pago')).toHaveLength(1);
  });

  it('se puede abrir sin cobrar', () => {
    const { quote } = withQuote(38);
    repo.exemptQuote(quote.id);
    expect(repo.getQuote(quote.id)!.unlock_status).toBe('exento');
  });
});

describe('clics en enlaces', () => {
  it('registra y lista los clics de una solicitud', () => {
    const { request } = create();
    repo.recordClick({ requestId: request.id, label: 'Vuelo', host: 'iberia.com' });
    repo.recordClick({ requestId: request.id, label: 'Alojamiento', host: 'booking.com' });

    expect(repo.countClicks(request.id)).toBe(2);
    expect(repo.listClicks(request.id).map((c) => c.label)).toContain('Alojamiento');
  });

  it('los clics se van con la solicitud si se borra', () => {
    const { request } = create();
    repo.recordClick({ requestId: request.id, label: 'Vuelo', host: 'iberia.com' });
    db.prepare('DELETE FROM requests WHERE id = ?').run(request.id);
    expect(repo.countClicks(request.id)).toBe(0);
  });
});

describe('devoluciones', () => {
  const paidQuote = () => {
    const { request } = create();
    const quote = repo.createQuote(request.id, { title: 'Roma', unlockFee: 38 });
    repo.sendQuote(quote.id);
    repo.markQuotePaid(quote.id, { method: 'Bizum' });
    return { request, quote };
  };

  it('devolver vuelve a bloquear el plan y deja constancia', () => {
    const { request, quote } = paidQuote();
    repo.refundQuote(quote.id, { reason: 'Prefiero otras fechas' });

    const updated = repo.getQuote(quote.id)!;
    expect(updated.unlock_status).toBe('reembolsado');
    expect(updated.refunded_at).toBeTruthy();
    expect(updated.refund_reason).toBe('Prefiero otras fechas');
    expect(repo.listEvents(request.id).some((e) => e.type === 'devolucion')).toBe(true);
  });

  it('no se puede devolver algo que no está pagado', () => {
    const { request } = create();
    const quote = repo.createQuote(request.id, { title: 'Roma', unlockFee: 38 });
    repo.sendQuote(quote.id);
    expect(repo.refundQuote(quote.id, {})).toBeNull();
    expect(repo.getQuote(quote.id)!.unlock_status).toBe('pendiente');
  });

  it('no se devuelve dos veces', () => {
    const { quote } = paidQuote();
    repo.refundQuote(quote.id, {});
    expect(repo.refundQuote(quote.id, {})).toBeNull();
  });
});
