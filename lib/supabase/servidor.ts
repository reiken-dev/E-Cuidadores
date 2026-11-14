// Cliente de Supabase para el SERVIDOR (Server Components, Route Handlers). Lee la sesión de las cookies.
// Solo usa la URL y la clave anon, que SÍ pueden ser públicas y las protege RLS.
// NUNCA uses aquí SUPABASE_SERVICE_ROLE_KEY: salta RLS y vive solo en el webhook y el cron.
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Cliente nuevo por petición, o null si faltan las variables públicas (falla cerrado). */
export async function crearClienteServidor(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) return null;
  const almacen = await cookies();
  return createServerClient(url, clave, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // En un Server Component no se pueden escribir cookies: el refresco de la sesión lo hace proxy.ts.
        }
      },
    },
  });
}
