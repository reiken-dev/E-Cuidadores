'use client';

// AVISO DE COOKIES — solo aparece si LEGAL.analiticaNoEsencial es true. "Aceptar" y "Rechazar" son
// idénticos en tamaño y peso (rechazar no cuesta más que aceptar) y nada se mide antes de aceptar.

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { guardarPreferencia, leerPreferencia } from '@/lib/consentimiento';
import { LEGAL } from '@/lib/legal';

const sinSuscripcion = () => () => {};

export function CookieBanner() {
  const [decidido, setDecidido] = useState(false);
  // En el servidor no se muestra; en el navegador solo si la medición está activa y aún no se eligió.
  const pendiente = useSyncExternalStore(
    sinSuscripcion,
    () => LEGAL.analiticaNoEsencial && leerPreferencia() === null,
    () => false
  );
  if (!pendiente || decidido) return null;
  const decidir = (v: 'si' | 'no') => {
    guardarPreferencia(v);
    setDecidido(true);
  };
  const boton =
    'flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-[var(--accent)] px-4 text-[16px] font-semibold text-[var(--accent)] [touch-action:manipulation]';
  return (
    <div
      role="dialog"
      aria-label="Preferencias de cookies"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[560px] rounded-t-[var(--radius-card)] bg-[var(--surface)] p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-12px_32px_-12px_rgb(14_27_51/0.25)]"
    >
      <p className="text-[16px] leading-snug text-[var(--text-primary)]">
        Usamos una medición de uso para mejorar la app. Nunca incluye nombres, medicinas ni notas, y solo se activa si aceptas.{' '}
        <Link href="/cookies" className="underline underline-offset-2">
          Más información
        </Link>
      </p>
      <div className="mt-3 flex gap-3">
        <button type="button" className={boton} onClick={() => decidir('no')}>
          Rechazar
        </button>
        <button type="button" className={boton} onClick={() => decidir('si')}>
          Aceptar
        </button>
      </div>
    </div>
  );
}
