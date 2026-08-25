import { pricing } from '@/config/site';
import { isAdvisor } from '@/config/mode';

/**
 * Escala de tarifas activa.
 *
 * En modo asesor cobramos menos y antes: el cliente paga por desbloquear el
 * plan, no por una gestión de reservas que no hacemos. En modo agencia vuelve
 * la escala completa.
 */
export type FeeTierValue = {
  readonly id: string;
  readonly label: string;
  readonly feePerPerson: number;
  readonly minPerBooking: number;
};

export const feeTiers: { escapada: FeeTierValue; granViaje: FeeTierValue } = isAdvisor
  ? { escapada: pricing.asesor.escapada, granViaje: pricing.asesor.granViaje }
  : { escapada: pricing.escapada, granViaje: pricing.granViaje };
