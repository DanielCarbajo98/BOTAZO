import { describe, expect, it } from 'vitest';
import { briefSchema } from '@/lib/brief';
import { completedSteps, initialState, toBrief, toDraftBrief, validateStep } from '@/components/wizard/state';
import { estimate } from '@/lib/estimator';
import { futureDate } from './factories';

const fill = () => {
  const state = initialState();
  state.trip.destinations = ['Roma'];
  state.origin.airports = ['MAD'];
  state.dates.startDate = futureDate(60);
  state.dates.endDate = futureDate(64);
  state.contact.name = 'Ana';
  state.contact.email = 'ana@example.com';
  state.contact.phone = '+34600000000';
  state.contact.privacyAccepted = true;
  return state;
};

describe('validateStep', () => {
  it('el estado inicial no está completo', () => {
    const state = initialState();
    expect(Object.keys(validateStep('destino', state))).toHaveLength(1);
    expect(Object.keys(validateStep('origen', state))).toHaveLength(1);
    expect(Object.keys(validateStep('contacto', state))).not.toHaveLength(0);
  });

  it('un destino precargado deja el primer paso válido', () => {
    expect(validateStep('destino', initialState('Lisboa'))).toEqual({});
  });

  it('detecta la vuelta anterior a la ida', () => {
    const state = fill();
    state.dates.endDate = futureDate(50);
    expect(validateStep('fechas', state).endDate).toBeTruthy();
  });

  it('pide teléfono si el canal es WhatsApp', () => {
    const state = fill();
    state.contact.channel = 'whatsapp';
    state.contact.phone = '';
    expect(validateStep('contacto', state).phone).toBeTruthy();
  });

  it('no acepta más habitaciones que viajeros', () => {
    const state = fill();
    state.travelers.rooms = 5;
    expect(validateStep('viajeros', state).rooms).toBeTruthy();
  });

  it('marca todos los pasos como completos cuando el formulario está bien', () => {
    const done = completedSteps(fill());
    expect(done.size).toBe(9);
  });
});

describe('toBrief', () => {
  it('produce un brief que pasa la validación del servidor', () => {
    const result = briefSchema.safeParse(toBrief(fill()));
    expect(result.success).toBe(true);
  });

  it('omite los campos opcionales vacíos en lugar de mandar cadenas vacías', () => {
    const brief = toBrief(fill());
    expect(brief.trip.avoid).toBeUndefined();
    expect(brief.flights.notes).toBeUndefined();
  });

  it('solo envía flexDays cuando las fechas son flexibles', () => {
    const state = fill();
    state.dates.mode = 'exact';
    expect(toBrief(state).dates.flexDays).toBeUndefined();
    state.dates.mode = 'flexible';
    expect(toBrief(state).dates.flexDays).toBe(3);
  });
});

describe('toDraftBrief', () => {
  it('permite estimar desde el primer paso, con el formulario vacío', () => {
    const draft = toDraftBrief(initialState());
    expect(() => estimate(draft)).not.toThrow();
    expect(estimate(draft).total).toBeGreaterThan(0);
  });
});
