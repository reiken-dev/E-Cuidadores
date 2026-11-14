// Cliente de Supabase para el NAVEGADOR. Solo URL y clave anon (públicas, protegidas por RLS).
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Cliente del navegador, o null si faltan las variables públicas. */
export function crearClienteNavegador(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) return null;
  return createBrowserClient(url, clave);
}
