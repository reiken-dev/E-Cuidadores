// Vuelta del enlace por correo (acceso o confirmación de cuenta) y paso final tras crear la cuenta con sesión.
// - Con ?code=…: intercambia el código por la sesión.
// - Sin código: usa la sesión que ya hay en las cookies (alta con sesión inmediata). No abre nada: igualmente
//   se valida con getUser() y /app sigue exigiendo sesión y consentimientos.
// Luego guarda los consentimientos del alta y redirige a una ruta interna (nunca a un destino externo).
import { NextResponse, type NextRequest } from 'next/server';
import { MARCA } from '@/lib/marca';
import { registrarConsentimientos, tieneConsentimientos } from '@/lib/alta';
import { rutaSegura } from '@/lib/ruta-segura';
import { crearClienteServidor } from '@/lib/supabase/servidor';

export async function GET(request: NextRequest) {
  const { searchParams, origin: origenDeLaPeticion } = new URL(request.url);
  // Detrás de un dominio propio, request.url puede traer el host interno: se prefiere la URL pública configurada.
  const origin = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin : origenDeLaPeticion;
  const fallo = NextResponse.redirect(`${origin}/entrar?error=acceso`);
  if (!MARCA.conexiones.supabase) return fallo;

  const db = await crearClienteServidor();
  if (!db) return fallo;

  const code = searchParams.get('code');
  if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (error) return fallo;
  }

  // getUser() valida el token con Supabase (no getSession()).
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return fallo;

  const alta = await registrarConsentimientos(db, data.user);
  if (!alta.ok) {
    // Las casillas estaban incompletas o no se pudo guardar: se cierra la sesión que acaba de abrirse.
    await db.auth.signOut();
    return NextResponse.redirect(`${origin}/entrar?error=consentimientos`);
  }
  // Sin los dos consentimientos guardados (p. ej. entró por un enlace sin marcar las casillas) no pasa a /app:
  // va a /aceptar, donde los marca y se guardan desde el servidor.
  if (!(await tieneConsentimientos(db))) return NextResponse.redirect(`${origin}/aceptar`);

  return NextResponse.redirect(`${origin}${rutaSegura(searchParams.get('next'))}`);
}
