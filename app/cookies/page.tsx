import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/LegalDocument';
import { LEGAL } from '@/lib/legal';
import { MARCA } from '@/lib/marca';
import { cookies } from '@/lib/legal-textos';

export const metadata: Metadata = {
  title: `Política de Cookies | ${MARCA.nombre}`,
  description: 'Qué guardamos en tu dispositivo y cómo borrarlo.',
};

export default function Page() {
  const t = cookies();
  return <LegalDocument titulo={t.titulo} actualizado={LEGAL.actualizado} intro={t.intro} aviso={t.aviso} secciones={t.secciones} rutaActual="/cookies" />;
}
