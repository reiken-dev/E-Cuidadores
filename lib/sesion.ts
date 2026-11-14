// SESIÓN DE /app. Hoy no hay sesión real: sesionDelServidor() devuelve null.
// - Con Supabase desconectado (conexiones.supabase = false en lib/marca.ts), /app es una demostración con banner
//   y no se consulta ninguna sesión.
// - Con Supabase conectado, /app exige sesión: sin ella redirige a /entrar. Hasta implementarla, el guard
//   falla cerrado (nadie entra). Guía y código de ejemplo: docs/conexion/guard-sesion.ts.txt.
import { MARCA } from './marca';

export interface SesionServidor {
  userId: string;
}

/** Sesión de quien abre /app, o null. [COMPLETAR: implementar con Supabase Auth; ver docs/conexion/guard-sesion.ts.txt] */
export async function sesionDelServidor(): Promise<SesionServidor | null> {
  return null;
}

/** ¿/app funciona como demostración (sin cuentas reales)? Mientras Supabase esté desconectado, sí. */
export const appEnDemostracion = (): boolean => !MARCA.conexiones.supabase;
