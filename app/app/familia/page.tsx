import { Suspense } from 'react';
import FamiliaScreen from '@/components/app/screens/FamiliaScreen';

export const metadata = { title: 'Familia' };

export default function FamiliaPage() {
  return (
    <Suspense fallback={null}>
      <FamiliaScreen />
    </Suspense>
  );
}
