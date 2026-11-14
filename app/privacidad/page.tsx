import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/LegalDocument';
import { LEGAL } from '@/lib/legal';
import { MARCA } from '@/lib/marca';
import { privacidad } from '@/lib/legal-textos';

export const metadata: Metadata = {
  title: `Política de Privacidad | ${MARCA.nombre}`,
  description: 'Qué datos guardamos, para qué, con quién se comparten y cómo ejercer tus derechos.',
};

export default function Page() {
  const t = privacidad();
  return <LegalDocument titulo={t.titulo} actualizado={LEGAL.actualizado} intro={t.intro} aviso={t.aviso} secciones={t.secciones} rutaActual="/privacidad" />;
}
