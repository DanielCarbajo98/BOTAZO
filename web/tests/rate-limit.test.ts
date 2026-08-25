import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clientIp, rateLimit, resetRateLimits } from '@/lib/rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.useRealTimers();
  });

  it('permite hasta el límite y bloquea después', () => {
    for (let i = 0; i < 3; i += 1) {
      expect(rateLimit('clave', 3, 1000).ok).toBe(true);
    }
    expect(rateLimit('clave', 3, 1000).ok).toBe(false);
  });

  it('cuenta cada clave por separado', () => {
    rateLimit('a', 1, 1000);
    expect(rateLimit('a', 1, 1000).ok).toBe(false);
    expect(rateLimit('b', 1, 1000).ok).toBe(true);
  });

  it('se reinicia al pasar la ventana', () => {
    vi.useFakeTimers();
    rateLimit('c', 1, 1000);
    expect(rateLimit('c', 1, 1000).ok).toBe(false);
    vi.advanceTimersByTime(1500);
    expect(rateLimit('c', 1, 1000).ok).toBe(true);
    vi.useRealTimers();
  });

  it('informa de cuánto falta para reintentar', () => {
    rateLimit('d', 1, 60_000);
    const blocked = rateLimit('d', 1, 60_000);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.remaining).toBe(0);
  });
});

describe('clientIp', () => {
  it('usa la primera IP de x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(clientIp(headers)).toBe('1.2.3.4');
  });

  it('cae en x-real-ip y luego en un valor neutro', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9');
    expect(clientIp(new Headers())).toBe('0.0.0.0');
  });
});
