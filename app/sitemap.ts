import type { MetadataRoute } from 'next';

function siteUrl(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').origin;
  } catch {
    return 'http://localhost:3000';
  }
}

// Solo las páginas públicas que conviene mostrar en buscadores.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/privacidad`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terminos`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/reembolsos`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/cookies`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/aviso-medico`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
