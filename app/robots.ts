import type { MetadataRoute } from 'next';

// Dirección pública del sitio (ver .env.example). Si falta o es inválida, se usa localhost.
function siteUrl(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').origin;
  } catch {
    return 'http://localhost:3000';
  }
}

// Solo la página de ventas y los textos legales deben aparecer en buscadores.
// La app, el recorrido de bienvenida y el acceso son privados o de paso.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/app', '/onboarding', '/entrar'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
