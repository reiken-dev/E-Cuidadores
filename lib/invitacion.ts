// Ayudas de la invitación por enlace. Sin datos de salud: el enlace solo lleva el código al azar del círculo.
import { CODIGO_CIRCULO_RE } from './codigo-circulo';

/** Código en mayúsculas y sin espacios, o null si no tiene la forma válida. */
export function normalizarCodigo(crudo: unknown): string | null {
  if (typeof crudo !== 'string') return null;
  const c = crudo.trim().toUpperCase();
  return CODIGO_CIRCULO_RE.test(c) ? c : null;
}

/** Ruta interna de la página que recibe el enlace. */
export const rutaUnirme = (codigo: string): string => `/unirme/${codigo}`;

/** Máximo de miembros por círculo (el mismo tope que invitaciones.sql). */
export const MAX_MIEMBROS = 12;
