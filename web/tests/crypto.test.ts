import { describe, expect, it } from 'vitest';
import { hashPassword, newReference, newToken, safeEqual, sha256, sign, verify, verifyPassword } from '@/lib/crypto';

describe('contraseñas', () => {
  it('verifica la contraseña correcta', () => {
    const hash = hashPassword('una contraseña larga');
    expect(verifyPassword('una contraseña larga', hash)).toBe(true);
  });

  it('rechaza una contraseña incorrecta', () => {
    const hash = hashPassword('una contraseña larga');
    expect(verifyPassword('otra contraseña', hash)).toBe(false);
  });

  it('genera un hash distinto cada vez (sal aleatoria)', () => {
    expect(hashPassword('misma')).not.toBe(hashPassword('misma'));
  });

  it('no revienta con un hash corrupto', () => {
    expect(verifyPassword('x', 'basura')).toBe(false);
    expect(verifyPassword('x', 'scrypt$1$2$3$4')).toBe(false);
  });
});

describe('tokens firmados', () => {
  it('lee de vuelta lo que firmó', () => {
    const token = sign({ sub: 'abc', role: 'admin' }, 60);
    expect(verify<{ sub: string }>(token)?.sub).toBe('abc');
  });

  it('rechaza un token manipulado', () => {
    const token = sign({ sub: 'abc' }, 60);
    const [body, mac] = token.split('.');
    const tampered = `${Buffer.from(JSON.stringify({ sub: 'root', exp: 99999999999 })).toString('base64url')}.${mac}`;
    expect(verify(tampered)).toBeNull();
    expect(verify(`${body}.firmafalsa`)).toBeNull();
  });

  it('rechaza un token caducado', () => {
    expect(verify(sign({ sub: 'abc' }, -10))).toBeNull();
  });

  it('rechaza basura', () => {
    expect(verify('')).toBeNull();
    expect(verify('sin-punto')).toBeNull();
  });
});

describe('utilidades', () => {
  it('las referencias no usan caracteres ambiguos', () => {
    for (let i = 0; i < 200; i += 1) {
      const reference = newReference();
      expect(reference).toMatch(/^VJ-[2-9A-HJ-NP-Z]{6}$/);
    }
  });

  it('genera tokens distintos y suficientemente largos', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => newToken()));
    expect(tokens.size).toBe(100);
    expect(newToken().length).toBeGreaterThanOrEqual(40);
  });

  it('compara en tiempo constante sin fallar por longitudes distintas', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual(sha256('x'), sha256('x'))).toBe(true);
  });
});
