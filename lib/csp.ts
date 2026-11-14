// CONTENT-SECURITY-POLICY: se construye aquí (y no en next.config.ts) para poder probarla.
// Decisión: un CSP con "nonce" por petición obligaría a que TODAS las páginas sean
// dinámicas (se pierde el prerenderizado estático) y a tocar el layout raíz. Para una plantilla
// que se publica en Vercel usamos un CSP por cabecera fija y válido:
//  - script-src permite 'unsafe-inline' porque Next.js inyecta pequeños scripts en línea para
//    hidratar la página; en desarrollo también 'unsafe-eval' (lo necesita el recargado en vivo).
//  - style-src permite 'unsafe-inline' porque React/Motion escriben estilos en línea (style="...").
//  - Las fuentes de next/font se descargan al construir y se sirven desde el propio dominio,
//    por eso font-src es 'self' (no hace falta abrir fonts.googleapis.com).
//  - Todo lo demás queda cerrado: sin frames, sin objetos, sin formularios hacia otros sitios.
//  - connect-src abre SOLO el origen exacto de tu proyecto de Supabase (NEXT_PUBLIC_SUPABASE_URL): el navegador
//    habla con Supabase para registrarse y entrar. Nunca un comodín como *.supabase.co.
// PARA EL COMPRADOR: al conectar otros servicios externos, abre SOLO el dominio que uses y solo en la
// directiva que corresponda (p. ej. analítica -> script-src y connect-src de su dominio; tiempo real de
// Supabase -> además wss:// del mismo dominio).
// Si más adelante quieres un CSP estricto con nonce, sigue la guía de Next.js "Content Security Policy".

/** Origen (https://host) de una URL de Supabase, o null si falta o no es una URL http(s) válida. */
export function origenDeSupabase(url: string | undefined | null): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : null;
  } catch {
    return null;
  }
}

export function construirCsp({ dev, supabaseUrl }: { dev: boolean; supabaseUrl?: string | null }): string {
  const supabase = origenDeSupabase(supabaseUrl);
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${supabase ? ` ${supabase}` : ''}${dev ? ' ws: wss:' : ''}`,
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}
