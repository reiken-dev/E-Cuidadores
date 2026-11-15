import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AceptarForm from './AceptarForm';
import { MARCA } from '@/lib/marca';
import { rutaSegura } from '@/lib/ruta-segura';
import { consentimientosAlDia, sesionDelServidor } from '@/lib/sesion';

export const metadata: Metadata = {
  title: `Antes de entrar a ${MARCA.nombre}`,
  robots: { index: false, follow: false },
};

// Depende de la sesión: nunca se prerenderiza.
export const dynamic = 'force-dynamic';

// Paso obligatorio para quien tiene sesión pero aún no dejó guardados los dos consentimientos.
export default async function AceptarPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const siguiente = rutaSegura((await searchParams).next);
  if (!MARCA.conexiones.supabase) redirect('/entrar');
  if (!(await sesionDelServidor())) redirect('/entrar');
  if (await consentimientosAlDia()) redirect(siguiente);
  return <AceptarForm siguiente={siguiente} />;
}
