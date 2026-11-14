'use client';

import Link from 'next/link';
import { Circulo } from '@/components/brand/Circulo';

// Si algo falla al mostrar una pantalla, la persona ve un mensaje claro y un botón para reintentar
// (nunca una pantalla en blanco ni un texto técnico en inglés). Los datos guardados no se tocan.

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main
      role="alert"
      className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg)] px-6 text-center text-[var(--text-primary)] [font-family:var(--font-body)]"
    >
      <Circulo simple size={130} />
      <h1 className="mt-2 text-2xl leading-tight font-bold text-balance [font-family:var(--font-display)]">
        Algo no salió como esperábamos
      </h1>
      <p className="mt-3 max-w-sm text-base leading-relaxed text-[var(--text-secondary)]">
        No se borró nada de lo que tenías guardado. Prueba de nuevo y, si sigue igual, recarga la página.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-8 flex h-14 w-full max-w-xs items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] text-lg font-semibold text-[var(--bg)] [touch-action:manipulation]"
      >
        Intentar de nuevo
      </button>
      <Link prefetch={false} href="/" className="mt-2 flex min-h-11 items-center text-base font-medium text-[var(--text-secondary)] underline underline-offset-4">
        Ir al inicio
      </Link>
    </main>
  );
}
