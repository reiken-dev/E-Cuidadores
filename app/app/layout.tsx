import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import './tokens-app.css';
import { AppShell } from '@/components/app/AppShell';
import { MARCA } from '@/lib/marca';
import { appEnDemostracion, consentimientosAlDia, sesionDelServidor, tieneCirculo } from '@/lib/sesion';

export const metadata: Metadata = {
  title: { default: `${MARCA.nombre}: el panel del cuidado`, template: `%s · ${MARCA.nombre}` },
  description: 'Medicinas, citas y novedades del cuidado de tu familiar, entre todos los hermanos.',
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const demo = appEnDemostracion();
  // Guard de sesión: con Supabase conectado, /app solo se abre con sesión. Sin ella, a /entrar.
  // Y solo con los dos consentimientos guardados (términos y datos de salud): si faltan, a /aceptar.
  if (!demo) {
    if (!(await sesionDelServidor())) redirect('/entrar');
    if (!(await consentimientosAlDia())) redirect('/aceptar');
    // Y con un círculo creado: si aún no tiene, a /bienvenida (si no se pudo comprobar, se abre y la app muestra el error).
    if ((await tieneCirculo()) === false) redirect('/bienvenida');
  }
  return (
    <>
      {demo && (
        <p
          role="status"
          data-captura="oculto"
          className="no-print px-4 py-2 text-center text-[16px] leading-snug text-[var(--text-secondary)] shadow-[inset_0_-1px_0_color-mix(in_oklab,var(--text-tertiary)_25%,transparent)]"
        >
          Demostración: los datos se quedan en este navegador y no hay cuentas reales.
        </p>
      )}
      <AppShell>{children}</AppShell>
    </>
  );
}
