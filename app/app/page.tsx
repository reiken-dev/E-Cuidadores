import HoyScreen from '@/components/app/screens/HoyScreen';
import { MARCA } from '@/lib/marca';

// Esta página comparte segmento con el layout de /app, que pone el sufijo solo a las rutas hijas: el título va completo.
export const metadata = { title: { absolute: `Hoy · ${MARCA.nombre}` } };

export default function HoyPage() {
  return <HoyScreen />;
}
