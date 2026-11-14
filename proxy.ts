// Proxy de Next 16 (antes "middleware"). SOLO refresca las cookies de sesión de Supabase en /app y /entrar.
// La autorización NO se decide aquí: la hace app/app/layout.tsx con sesionDelServidor().
// Con Supabase desconectado (demostración) o sin variables de entorno, no hace nada.
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { MARCA } from '@/lib/marca';

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!MARCA.conexiones.supabase || !url || !clave) return NextResponse.next({ request });

  let respuesta = NextResponse.next({ request });
  const db = createServerClient(url, clave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });
  // Valida el token y, si hace falta, lo renueva y lo escribe en las cookies de la respuesta.
  await db.auth.getUser();
  return respuesta;
}

export const config = { matcher: ['/app/:path*', '/entrar'] };
