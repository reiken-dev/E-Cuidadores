// Vuelta del enlace por correo (acceso o confirmación de cuenta) y paso final tras crear la cuenta con sesión.
// - Con ?code=…: intercambia el código por la sesión.
// - Sin código: usa la sesión que ya hay en las cookies.
// Luego guarda los consentimientos del alta y redirige a una ruta interna (nunca a un destino externo).
import { NextResponse, type NextRequest } from 'next/server';
import { MARCA } from '@/lib/marca';
import { registrarConsentimientos } from '@/lib/alta';
import { rutaSegura } from '@/lib/ruta-segura';
import { crearClienteServidor } from '@/lib/supabase/servidor';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
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
  // Sin el registro de consentimientos la cuenta nueva no debe seguir: se avisa en /entrar.
  if (!alta.ok) return NextResponse.redirect(`${origin}/entrar?error=consentimientos`);

  return NextResponse.redirect(`${origin}${rutaSegura(searchParams.get('next'))}`);
}
