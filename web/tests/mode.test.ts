import { afterEach, describe, expect, it, vi } from 'vitest';

/** Carga el módulo de modo desde cero con la variable de entorno indicada. */
async function loadMode(value?: string) {
  vi.resetModules();
  if (value === undefined) vi.unstubAllEnvs();
  else vi.stubEnv('NEXT_PUBLIC_SITE_MODE', value);
  return import('@/config/mode');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('modo de operación', () => {
  it('sin configurar, arranca en modo asesor', async () => {
    const { mode, isAdvisor } = await loadMode(undefined);
    expect(mode).toBe('asesor');
    expect(isAdvisor).toBe(true);
  });

  it('cualquier valor raro cae también en asesor: el modo seguro', async () => {
    for (const value of ['', 'AGENCIA', 'cualquiera', 'true']) {
      const { mode } = await loadMode(value);
      expect(mode).toBe('asesor');
    }
  });

  it('solo "agencia" exacta activa el modo con licencia', async () => {
    const { mode, isAdvisor } = await loadMode('agencia');
    expect(mode).toBe('agencia');
    expect(isAdvisor).toBe(false);
  });
});

describe('textos del modo asesor', () => {
  it('no se presenta como agencia de viajes en ningún texto legal', async () => {
    const { modeCopy } = await loadMode('asesor');
    const legalTexts = [modeCopy.roleShort, modeCopy.roleLegal, modeCopy.legalObject, modeCopy.conditionsObject];
    for (const text of legalTexts) {
      expect(text.toLowerCase()).not.toMatch(/\bagencia de viajes\b(?!,? no)/);
    }
    expect(modeCopy.roleShort).not.toMatch(/[Aa]gencia/);
  });

  it('deja claro que no es un viaje combinado', async () => {
    const { modeCopy } = await loadMode('asesor');
    expect(modeCopy.legalObject).toMatch(/no comercializamos viajes combinados/i);
    expect(modeCopy.conditionsObject).toMatch(/no actúa como agencia de viajes/i);
  });

  it('dice que reserva el cliente', async () => {
    const { modeCopy } = await loadMode('asesor');
    expect(modeCopy.finalStep.title.toLowerCase()).toContain('reservas tú');
    expect(modeCopy.faqWhoBooks.answer.toLowerCase()).toContain('la haces tú');
  });

  it('no promete gestionar reservas en la lista de incluidos', async () => {
    const { modeCopy } = await loadMode('asesor');
    const joined = modeCopy.includes.map(([title]) => title.toLowerCase()).join(' | ');
    expect(joined).not.toContain('gestión de las reservas');
    expect(joined).toContain('enlaces directos de reserva');
  });

  it('llama honorarios a lo que cobra, no tarifa de gestión', async () => {
    const { modeCopy } = await loadMode('asesor');
    expect(modeCopy.feeLabel).toBe('honorarios');
  });
});

describe('textos del modo agencia', () => {
  it('recupera el lenguaje de agencia al activar la licencia', async () => {
    const { modeCopy } = await loadMode('agencia');
    // La promesa comercial no cambia con la licencia; lo que cambia es lo legal
    expect(modeCopy.roleShort).toBe('Expertos en viajar barato');
    expect(modeCopy.roleLegal).toBe('agencia de viajes');
    expect(modeCopy.feeLabel).toBe('tarifa de gestión');
    expect(modeCopy.finalStep.title).toContain('Reservamos');
  });

  it('los dos modos rellenan exactamente las mismas claves', async () => {
    const advisor = (await loadMode('asesor')).modeCopy;
    const agency = (await loadMode('agencia')).modeCopy;
    expect(Object.keys(advisor).sort()).toEqual(Object.keys(agency).sort());
    for (const key of Object.keys(advisor) as (keyof typeof advisor)[]) {
      expect(advisor[key], `falta contenido en ${String(key)}`).toBeTruthy();
    }
  });
});
