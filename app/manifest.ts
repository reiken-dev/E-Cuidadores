import type { MetadataRoute } from 'next';
import { MARCA } from '@/lib/marca';

// Manifest de la app web: el nombre sale de lib/marca.ts (cámbialo allí, no aquí).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: MARCA.nombre,
    short_name: MARCA.nombre,
    description: `${MARCA.nombre}: el cuidado de un familiar mayor, compartido entre hermanos.`,
    start_url: '/',
    display: 'standalone',
    lang: 'es',
    background_color: '#f3f7fd',
    theme_color: '#1f5bd6',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
