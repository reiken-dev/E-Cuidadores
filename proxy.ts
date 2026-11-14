// Proxy de Next 16 (antes "middleware"). SOLO refresca las cookies de sesión de Supabase en /app, /entrar y /aceptar.
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
      setAll: (lista, cabeceras) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        // Una respuesta que escribe cookies de sesión no debe cachearse (un CDN serviría la sesión a otra persona).
        Object.entries(cabeceras ?? {}).forEach(([k, v]) => respuesta.headers.set(k, v));
        respuesta.headers.set('Cache-Control', 'private, no-store');
      },
    },
  });
  // Valida el token y, si hace falta, lo renueva y lo escribe en las cookies de la respuesta.
  try {
    await db.auth.getUser();
  } catch {
    // Si Supabase no responde, la página sigue cargando: quien decide el acceso es app/app/layout.tsx.
  }
  return respuesta;
}

export const config = { matcher: ['/app/:path*', '/entrar', '/aceptar'] };
