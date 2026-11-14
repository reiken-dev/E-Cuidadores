import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// CONTENT-SECURITY-POLICY
// Decisión: un CSP con "nonce" por petición obligaría a que TODAS las páginas sean
// dinámicas (se pierde el prerenderizado estático) y a tocar el layout raíz. Para una plantilla
// que se publica en Vercel usamos un CSP por cabecera fija y válido:
//  - script-src permite 'unsafe-inline' porque Next.js inyecta pequeños scripts en línea para
//    hidratar la página; en desarrollo también 'unsafe-eval' (lo necesita el recargado en vivo).
//  - style-src permite 'unsafe-inline' porque React/Motion escriben estilos en línea (style="...").
//  - Las fuentes de next/font se descargan al construir y se sirven desde el propio dominio,
//    por eso font-src es 'self' (no hace falta abrir fonts.googleapis.com).
//  - Todo lo demás queda cerrado: sin frames, sin objetos, sin formularios hacia otros sitios.
// PARA EL COMPRADOR: al conectar servicios externos, abre SOLO el dominio que uses y solo en la
// directiva que corresponda. Ejemplos: Supabase -> connect-src https://TU-PROYECTO.supabase.co
// (y wss:// del mismo dominio para tiempo real); analítica -> script-src y connect-src de su dominio.
// Si más adelante quieres un CSP estricto con nonce, sigue la guía de Next.js "Content Security Policy".
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), interest-cohort=()",
  },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  // Raíz de Turbopack = la carpeta del proyecto. Sin esto, Next toma un package-lock.json de una carpeta
  // padre (p. ej. la de tu espacio de trabajo) y avisa en cada build. Los comandos se corren desde la raíz.
  turbopack: { root: process.cwd() },
  // React Compiler (estable en Next 16): memoiza componentes automáticamente. Requiere babel-plugin-react-compiler.
  reactCompiler: true,
  // Apaga el indicador flotante de dev (esquina inferior) — tapaba contenido en las
  // capturas a 375px usadas para revisión visual.
  devIndicators: false,
  // No anunciar la tecnología del servidor en cada respuesta (cabecera X-Powered-By).
  poweredByHeader: false,
  // Imágenes optimizadas: AVIF/WebP en lugar de PNG de ~200 KB (LCP de la landing).
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75],
    // 580 = el teléfono de la landing (290 px) a 2x: se sirve ese tamaño exacto, no el siguiente (640).
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 580],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Las capturas de la landing no cambian entre despliegues: caché larga.
      { source: "/mockups/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
