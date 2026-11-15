// Cliente de Supabase con la CLAVE DE SERVICIO. Salta RLS: úsalo SOLO en código de servidor (Server Actions,
// app/api/*) y solo DESPUÉS de comprobar la sesión con getUser(). Nunca lo importes desde un componente 'use client'.
// La clave nunca lleva NEXT_PUBLIC_ ni se escribe en logs, git o chat.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Cliente de servicio sin sesión persistente, o null si faltan las variables (falla cerrado). */
export function crearClienteServicio(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) return null;
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}
