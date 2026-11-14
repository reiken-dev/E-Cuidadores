import type { Metadata } from 'next';
import { MARCA } from '@/lib/marca';

// La página de bienvenida es un componente de cliente: su título y descripción van aquí, en el layout de servidor.
export const metadata: Metadata = {
  title: `Empieza · ${MARCA.nombre}`,
  description: 'Cinco preguntas para armar el Círculo de Cuidado de tu familiar y su primera medicina.',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
