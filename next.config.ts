import type { NextConfig } from "next";
import { construirCsp } from "./lib/csp";

const isDev = process.env.NODE_ENV !== "production";

// CONTENT-SECURITY-POLICY: la política y su explicación están en lib/csp.ts (con pruebas).
// El origen de Supabase se abre solo si NEXT_PUBLIC_SUPABASE_URL está definida.
const csp = construirCsp({ dev: isDev, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL });

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
