import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import UnirmeForm from './UnirmeForm';
import { MARCA } from '@/lib/marca';
import { normalizarCodigo, rutaUnirme } from '@/lib/invitacion';
import { consentimientosAlDia, sesionDelServidor, tieneCirculo } from '@/lib/sesion';

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
  // Un enlace copiado a medias (p. ej. con un «%» suelto) no debe dar error 500: se muestra «Este enlace no sirve».
  let crudo = (await params).codigo;
  try {
    crudo = decodeURIComponent(crudo);
  } catch {
    crudo = '';
  }
  const codigo = normalizarCodigo(crudo);
  const destino = codigo ? rutaUnirme(codigo) : null;
  if (!codigo || !destino) return <UnirmeForm codigo={null} sesion={false} />;
  if (!(await sesionDelServidor())) return <UnirmeForm codigo={codigo} sesion={false} />;
  if (!(await consentimientosAlDia())) redirect(`/aceptar?next=${encodeURIComponent(destino)}`);
  // Quien ya tiene un círculo no puede unirse a otro: se le dice antes de pedirle el nombre.
  if ((await tieneCirculo()) === true) return <UnirmeForm codigo={codigo} sesion yaTieneCirculo />;
  return <UnirmeForm codigo={codigo} sesion />;
}
