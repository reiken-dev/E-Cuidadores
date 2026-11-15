import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import UnirmeForm from './UnirmeForm';
import { MARCA } from '@/lib/marca';
import { normalizarCodigo, rutaUnirme } from '@/lib/invitacion';
import { consentimientosAlDia, sesionDelServidor } from '@/lib/sesion';

// El código es un secreto de acceso: no se indexa y no sale en la cabecera Referer hacia otros sitios.
export const metadata: Metadata = {
  title: `Te invitaron a ${MARCA.nombre}`,
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

// Depende de la sesión: nunca se prerenderiza.
export const dynamic = 'force-dynamic';

// Aquí llega quien abre el enlace de un hermano. No muestra el nombre del familiar ni datos de salud.
export default async function UnirmePage({ params }: { params: Promise<{ codigo: string }> }) {
  if (!MARCA.conexiones.supabase) redirect('/entrar');
  const codigo = normalizarCodigo(decodeURIComponent((await params).codigo));
  const destino = codigo ? rutaUnirme(codigo) : null;
  if (!codigo || !destino) return <UnirmeForm codigo={null} sesion={false} />;
  if (!(await sesionDelServidor())) return <UnirmeForm codigo={codigo} sesion={false} />;
  if (!(await consentimientosAlDia())) redirect(`/aceptar?next=${encodeURIComponent(destino)}`);
  return <UnirmeForm codigo={codigo} sesion />;
}
