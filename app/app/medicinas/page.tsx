import { Suspense } from 'react';
import MedicinasScreen from '@/components/app/screens/MedicinasScreen';

export const metadata = { title: 'Medicinas' };

export default function MedicinasPage() {
  return (
    <Suspense fallback={null}>
      <MedicinasScreen />
    </Suspense>
  );
}
