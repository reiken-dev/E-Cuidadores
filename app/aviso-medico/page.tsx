import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/LegalDocument';
import { LEGAL } from '@/lib/legal';
import { MARCA } from '@/lib/marca';
import { avisoMedico } from '@/lib/legal-textos';

export const metadata: Metadata = {
  title: `Aviso médico | ${MARCA.nombre}`,
  description: 'Qué hace y qué no hace la aplicación: no es consejo médico.',
};

export default function Page() {
  const t = avisoMedico();
  return <LegalDocument titulo={t.titulo} actualizado={LEGAL.actualizado} intro={t.intro} aviso={t.aviso} secciones={t.secciones} rutaActual="/aviso-medico" />;
}
