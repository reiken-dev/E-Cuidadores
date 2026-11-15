// SESIÓN DE /app.
// - Con Supabase desconectado (conexiones.supabase = false en lib/marca.ts), /app es una demostración con banner
//   y no se consulta ninguna sesión.
// - Con Supabase conectado, /app exige sesión: sin ella redirige a /entrar (ver app/app/layout.tsx).
//   Si faltan las variables públicas de Supabase, el guard falla cerrado: nadie entra.
import { MARCA } from './marca';
import { tieneConsentimientos } from './alta';
import { crearClienteServidor } from './supabase/servidor';

export interface SesionServidor {
  userId: string;
}

/** Sesión de quien abre /app, o null. */
export async function sesionDelServidor(): Promise<SesionServidor | null> {
  const db = await crearClienteServidor();
  if (!db) return null;
  // getUser() valida el token con el servidor de Supabase. No uses getSession() para decidir el acceso:
  // lee las cookies sin comprobar nada.
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return null;
  return { userId: data.user.id };
}

/**
 * ¿La persona ya tiene un círculo? RLS solo deja ver los propios. true / false, o null si no se pudo saber
 * (error de lectura): quien llama decide, sin tratar un fallo como «no tiene círculo».
 */
export async function tieneCirculo(): Promise<boolean | null> {
  const db = await crearClienteServidor();
  if (!db) return null;
  const { data, error } = await db.from('circles').select('id').limit(1);
  if (error || !data) return null;
  return data.length > 0;
}

/** ¿La sesión tiene los dos consentimientos obligatorios guardados? Falla cerrado: sin cliente o con error, false. */
export async function consentimientosAlDia(): Promise<boolean> {
  const db = await crearClienteServidor();
  if (!db) return false;
  return tieneConsentimientos(db);
}

/** ¿/app funciona como demostración (sin cuentas reales)? Mientras Supabase esté desconectado, sí. */
export const appEnDemostracion = (): boolean => !MARCA.conexiones.supabase;
