import { Suspense } from 'react';
import type { Metadata } from 'next';
import EntrarForm from './EntrarForm';
import { MARCA } from '@/lib/marca';

export const metadata: Metadata = {
  title: `Entrar a ${MARCA.nombre}`,
};

// useSearchParams (?modo=crear) exige un límite Suspense para que la ruta siga
// prerenderizándose como estática.
export default function EntrarPage() {
  return (
    <Suspense fallback={null}>
      <EntrarForm />
    </Suspense>
  );
}
