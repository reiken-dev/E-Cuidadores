import { Suspense } from 'react';
import ResumenScreen from '@/components/app/screens/ResumenScreen';

export const metadata = { title: 'Resumen para el médico' };

export default function ResumenPage() {
  return (
    <Suspense fallback={null}>
      <ResumenScreen />
    </Suspense>
  );
}
