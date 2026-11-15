import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import BienvenidaForm from './BienvenidaForm';
import { MARCA } from '@/lib/marca';
import { consentimientosAlDia, sesionDelServidor, tieneCirculo } from '@/lib/sesion';

export const metadata: Metadata = {
  title: `Crea tu círculo en ${MARCA.nombre}`,
  robots: { index: false, follow: false },
};

// Depende de la sesión: nunca se prerenderiza.
export const dynamic = 'force-dynamic';

// Primer paso de quien entra por primera vez: crear el círculo (a quién cuida). Fuera de /app para no formar bucles.
export default async function BienvenidaPage() {
  if (!MARCA.conexiones.supabase) redirect('/entrar');
  if (!(await sesionDelServidor())) redirect('/entrar');
  if (!(await consentimientosAlDia())) redirect('/aceptar');
  // Si ya tiene círculo (o no se pudo comprobar), a la app: ahí se ve el estado real y el error, si lo hay.
  if ((await tieneCirculo()) !== false) redirect('/app');
  return <BienvenidaForm />;
}
