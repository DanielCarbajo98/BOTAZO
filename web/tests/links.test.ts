import { describe, expect, it } from 'vitest';
import { signLink, trackedHref, verifyLink, type LinkPayload } from '@/lib/links';

const payload: LinkPayload = {
  u: 'https://www.booking.com/hotel/es/x.html?aid=123',
  r: 'req-1',
  q: 'quote-1',
  o: 'option-1',
  l: 'Alojamiento',
};

describe('enlaces con seguimiento', () => {
  it('firma y recupera el destino intacto', () => {
    const recovered = verifyLink(signLink(payload));
    expect(recovered?.u).toBe(payload.u);
    expect(recovered?.o).toBe('option-1');
    expect(recovered?.l).toBe('Alojamiento');
  });

  it('no es un redirector abierto: sin nuestra firma no vale', () => {
    const fake = Buffer.from(JSON.stringify({ ...payload, u: 'https://sitio-malicioso.com', exp: 99999999999 })).toString('base64url');
    expect(verifyLink(`${fake}.firmainventada`)).toBeNull();
    expect(verifyLink(fake)).toBeNull();
    expect(verifyLink('')).toBeNull();
    expect(verifyLink('basura')).toBeNull();
  });

  it('un destino manipulado invalida la firma', () => {
    const token = signLink(payload);
    const [body, mac] = token.split('.');
    const tampered = Buffer.from(JSON.stringify({ ...payload, u: 'https://otro.com', exp: 99999999999 })).toString('base64url');
    expect(verifyLink(`${tampered}.${mac}`)).toBeNull();
    expect(verifyLink(`${body}.otramac`)).toBeNull();
  });

  it('rechaza esquemas peligrosos aunque vengan firmados por nosotros', () => {
    const token = signLink({ ...payload, u: 'javascript:alert(1)' });
    expect(verifyLink(token)).toBeNull();
    expect(trackedHref({ ...payload, u: 'javascript:alert(1)' })).toBeNull();
  });

  it('trackedHref apunta a nuestro dominio, no al del proveedor', () => {
    const href = trackedHref(payload);
    expect(href).toMatch(/^\/ir\//);
    expect(href).not.toContain('booking.com');
  });
});
