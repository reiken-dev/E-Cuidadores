// A DÓNDE VA EL BOTÓN DE COMPRA — una sola decisión, probada en lib/cobro.test.ts.
// Con un enlace de Hotmart conectado (lib/marca.ts), el cobro lo hace Hotmart y la plantilla no cobra nada.
// Sin ningún enlace, la plantilla solo simula el flujo (demo): nunca un alta falsa presentada como real.

import { MARCA } from './marca';

export type PlanCobro = 'anual' | 'mensual';

export type DestinoCobro =
  | { tipo: 'externo'; url: string }
  | { tipo: 'sin-enlace' }
  | { tipo: 'demo' };

export interface EnlacesCobro {
  mensual: string | null;
  anual: string | null;
}

const ENLACES_ACTUALES: EnlacesCobro = { mensual: MARCA.checkoutUrl, anual: MARCA.checkoutAnualUrl };

/**
 * Decide qué hace el botón de compra del paywall para el plan elegido.
 * - Ningún enlace conectado → 'demo' (simulación local, sin cobro).
 * - Hay enlaces, pero no el del plan elegido → 'sin-enlace' (no se simula un alta: se avisa).
 * - Enlace del plan → 'externo' (Hotmart cobra).
 */
export function destinoDelCobro(plan: PlanCobro, enlaces: EnlacesCobro = ENLACES_ACTUALES): DestinoCobro {
  const hayConectado = Boolean(enlaces.mensual || enlaces.anual);
  if (!hayConectado) return { tipo: 'demo' };
  const url = plan === 'anual' ? enlaces.anual : enlaces.mensual;
  return url ? { tipo: 'externo', url } : { tipo: 'sin-enlace' };
}

/**
 * Plan que llega seleccionado al paywall. Si el pedido no tiene enlace de cobro y el otro sí, se elige el otro:
 * así nadie se encuentra con un error desde el primer clic (p. ej. vender solo el mensual).
 * Sin ningún enlace conectado (demostración) se respeta el pedido.
 */
export function planConEnlace(pedido: PlanCobro, enlaces: EnlacesCobro = ENLACES_ACTUALES): PlanCobro {
  if (!enlaces.mensual && !enlaces.anual) return pedido;
  const tieneEnlace = pedido === 'anual' ? Boolean(enlaces.anual) : Boolean(enlaces.mensual);
  if (tieneEnlace) return pedido;
  return pedido === 'anual' ? 'mensual' : 'anual';
}
