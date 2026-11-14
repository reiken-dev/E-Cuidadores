import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/LegalDocument';
import { LEGAL } from '@/lib/legal';
import { MARCA } from '@/lib/marca';
import { tieneTrial } from '@/lib/oferta';
import { reembolsos } from '@/lib/legal-textos';

export const metadata: Metadata = {
  title: `Política de Reembolsos | ${MARCA.nombre}`,
  description: `Garantía, ${tieneTrial ? 'prueba gratis, ' : ''}cómo pedir tu reembolso y cuánto tarda en llegar.`,
};

export default function Page() {
  const t = reembolsos();
  return <LegalDocument titulo={t.titulo} actualizado={LEGAL.actualizado} intro={t.intro} aviso={t.aviso} secciones={t.secciones} rutaActual="/reembolsos" />;
}
