import type { Metadata } from 'next';
import BajaForm from './BajaForm';
import { MARCA } from '@/lib/marca';
import { verificarBaja } from '@/lib/baja';

// El enlace lleva una firma: no se indexa ni sale en la cabecera Referer hacia otros sitios.
export const metadata: Metadata = {
  title: `Darme de baja de los correos de ${MARCA.nombre}`,
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export const dynamic = 'force-dynamic';

// Abrir el enlace NO da de baja a nadie (los antivirus de correo lo abren solos): la baja se confirma con un botón.
export default async function BajaPage({ searchParams }: { searchParams: Promise<{ t?: string | string[] }> }) {
  const t = (await searchParams).t;
  const token = typeof t === 'string' ? t : null;
  const valido = token !== null && verificarBaja(token, process.env.BAJA_SECRET) !== null;
  return <BajaForm token={valido ? token : null} />;
}
