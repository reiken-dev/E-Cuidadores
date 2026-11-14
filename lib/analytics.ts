// MEDICIÓN — puntos de conexión del embudo, SIN proveedor conectado.
// `track()` no envía nada: en desarrollo escribe en la consola y en producción no hace nada.
// Para medir de verdad, conecta tu proveedor dentro de `enviar()` (Plausible, PostHog, GA4, Vercel
// Analytics…) y actualiza la política de privacidad y el aviso de cookies si hace falta.
//
// REGLA DE PRIVACIDAD (datos de salud): los eventos llevan SOLO etiquetas de un conjunto cerrado y
// números. Nunca nombres, medicinas, notas, correos ni nada que escriba la persona. El tipo
// `Propiedades` lo impide a propósito.

import { puedeMedir } from './consentimiento';

export type Evento =
  | 'landing_cta' // tocó un botón de la página de ventas
  | 'onboarding_paso' // vio un paso del recorrido (paso: 0-8)
  | 'onboarding_omitido' // usó "Prefiero responder después" (paso)
  | 'paywall_visto'
  | 'paywall_plan' // eligió un plan (plan: anual | mensual)
  | 'paywall_cta' // pulsó el botón principal (plan)
  | 'paywall_error' // falló la activación (intento: 1, 2…)
  | 'prueba_iniciada' // terminó el paywall (plan)
  | 'dosis_confirmada' // primera victoria del producto
  | 'dosis_omitida' // anotó que NO se dio (motivo: etiqueta cerrada)
  | 'hito' // se celebró un hito (id)
  | 'semana_vista' // abrió la semana del círculo
  | 'novedades_vistas' // abrió lo que pasó mientras no estaba (reingreso: true/false)
  | 'invitacion_compartida' // tocó compartir la invitación (canal)
  | 'plan_visto' // abrió la pantalla de la suscripción
  | 'plan_anual_visto' // vio la sugerencia del plan anual
  | 'cancelacion_motivo' // eligió un motivo al querer cancelar (motivo: etiqueta cerrada)
  | 'cancelacion_gestionar' // pasó al panel de compras para gestionar o cancelar
  | 'pago_pendiente_visto' // vio el aviso de pago pendiente
  | 'resumen_abierto';

type Valor = string | number | boolean;
export type Propiedades = Record<string, Valor>;

function enviar(evento: Evento, props: Propiedades) {
  // Con medición no esencial activa (lib/legal.ts), no se envía NADA hasta que la persona acepte las cookies.
  if (!puedeMedir()) return;
  // CONECTA AQUÍ tu proveedor. Ejemplo (Plausible): window.plausible?.(evento, { props });
  if (process.env.NODE_ENV !== 'production') console.debug('[track]', evento, props);
}

export function track(evento: Evento, props: Propiedades = {}): void {
  if (typeof window === 'undefined') return;
  try {
    enviar(evento, props);
  } catch {
    // La medición nunca debe romper la app.
  }
}
