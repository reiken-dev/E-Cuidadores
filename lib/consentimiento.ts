// PREFERENCIA DE COOKIES (solo medición no esencial). No es el consentimiento del registro: ese NUNCA se
// guarda en el navegador para premarcarlo (en un dispositivo compartido atribuiría la decisión a otra persona).
// Aquí solo se recuerda si esta persona aceptó o rechazó la medición.

import { COOKIES_KEY, LEGAL } from './legal';

export type PreferenciaCookies = 'si' | 'no' | null;

export function leerPreferencia(): PreferenciaCookies {
  try {
    const v = window.localStorage.getItem(COOKIES_KEY);
    return v === 'si' || v === 'no' ? v : null;
  } catch {
    return null;
  }
}

export function guardarPreferencia(v: 'si' | 'no') {
  try {
    window.localStorage.setItem(COOKIES_KEY, v);
  } catch {
    // Sin almacenamiento: la decisión vale solo para esta visita.
  }
}

/** ¿Se puede medir? Sin medición no esencial siempre; con ella, solo tras un "Aceptar" explícito. */
export function puedeMedir(): boolean {
  if (!LEGAL.analiticaNoEsencial) return true;
  return leerPreferencia() === 'si';
}
