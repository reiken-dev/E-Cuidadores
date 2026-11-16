// Vuelta del enlace por correo (acceso o confirmación de cuenta) y paso final tras crear la cuenta con sesión.
// - Con ?token_hash=…&type=…: verifica el código del correo en el servidor (verifyOtp). Funciona abriendo el enlace en
//   CUALQUIER navegador o dispositivo; el enlace «PKCE» de Supabase (?code=) solo sirve en el navegador donde se empezó.
//   Las plantillas de correo de supabase/plantillas-correo/ usan este formato.
// - Con ?code=…: intercambia el código por la sesión.
// - Sin código: usa la sesión que ya hay en las cookies (alta con sesión inmediata). No abre nada: igualmente
//   se valida con getUser() y /app sigue exigiendo sesión y consentimientos.
// Luego guarda los consentimientos del alta y redirige a una ruta interna (nunca a un destino externo).
import { NextResponse, type NextRequest } from 'next/server';
import { MARCA } from '@/lib/marca';
import { registrarConsentimientos, tieneConsentimientos } from '@/lib/alta';
import { rutaSegura } from '@/lib/ruta-segura';
import { crearClienteServidor } from '@/lib/supabase/servidor';

/** Tipos de verificación que aceptamos del enlace del correo. Cualquier otro valor se rechaza. */
const TIPOS_DE_CORREO = ['email', 'signup', 'magiclink', 'recovery', 'email_change'] as const;
type TipoDeCorreo = (typeof TIPOS_DE_CORREO)[number];
const esTipoDeCorreo = (t: string | null): t is TipoDeCorreo => !!t && (TIPOS_DE_CORREO as readonly string[]).includes(t);

/** Origen público configurado, o el de la petición si falta o está mal escrito (así no se cae con un 500). */
function origenPublico(deLaPeticion: string): string {
  const configurado = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configurado) return deLaPeticion;
  try {
    return new URL(configurado).origin;
  } catch {
    return deLaPeticion;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin: origenDeLaPeticion } = new URL(request.url);
  // Detrás de un dominio propio, request.url puede traer el host interno: se prefiere la URL pública configurada.
  const origin = origenPublico(origenDeLaPeticion);
  const fallo = NextResponse.redirect(`${origin}/entrar?error=acceso`);
  if (!MARCA.conexiones.supabase) return fallo;

  const db = await crearClienteServidor();
  if (!db) return fallo;

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  if (tokenHash) {
    const tipo = searchParams.get('type');
    if (!esTipoDeCorreo(tipo) || tokenHash.length > 200) return fallo;
    const { error } = await db.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (error) return fallo;
  } else if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (error) return fallo;
  }

  // getUser() valida el token con Supabase (no getSession()).
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return fallo;

  // Destino tras entrar; se conserva si hay que pasar antes por /aceptar (p. ej. el enlace de un hermano).
  const destino = rutaSegura(searchParams.get('next'));
  const aceptar = destino === '/app' ? `${origin}/aceptar` : `${origin}/aceptar?next=${encodeURIComponent(destino)}`;
  const alta = await registrarConsentimientos(db, data.user);
  // Alguna casilla venía sin marcar: la sesión es legítima, así que se resuelve en /aceptar.
  if (!alta.ok && alta.incompletos) return NextResponse.redirect(aceptar);
  if (!alta.ok) {
    // No se pudo guardar: se cierra la sesión que acaba de abrirse.
    await db.auth.signOut();
    return NextResponse.redirect(`${origin}/entrar?error=consentimientos`);
  }
  // Sin los dos consentimientos guardados (p. ej. entró por un enlace sin marcar las casillas) no pasa a /app:
  // va a /aceptar, donde los marca y se guardan desde el servidor.
  if (!(await tieneConsentimientos(db))) return NextResponse.redirect(aceptar);

  return NextResponse.redirect(`${origin}${destino}`);
}
