import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/LegalDocument';
import { LEGAL } from '@/lib/legal';
import { MARCA } from '@/lib/marca';
import { terminos } from '@/lib/legal-textos';

export const metadata: Metadata = {
  title: `Términos y Condiciones | ${MARCA.nombre}`,
  description: 'Las reglas de uso: qué es el servicio, tu cuenta, los planes, la renovación y las responsabilidades de cada parte.',
};

export default function Page() {
  const t = terminos();
  return <LegalDocument titulo={t.titulo} actualizado={LEGAL.actualizado} intro={t.intro} aviso={t.aviso} secciones={t.secciones} rutaActual="/terminos" />;
}
