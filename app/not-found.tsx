import Link from 'next/link';
import { Circulo } from '@/components/brand/Circulo';
import { MARCA } from '@/lib/marca';

export const metadata = {
  title: `No encontramos esa página | ${MARCA.nombre}`,
  robots: { index: false, follow: false },
};

// 404 en español y con salida clara (antes salía la página en inglés de Next.js).
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg)] px-6 text-center text-[var(--text-primary)] [font-family:var(--font-body)]">
      <Circulo size={150} />
      <p className="mt-2 text-sm font-semibold tracking-wider text-[var(--accent)] uppercase">{MARCA.nombre}</p>
      <h1 className="mt-3 text-3xl leading-tight font-bold text-balance [font-family:var(--font-display)]">
        No encontramos esa página
      </h1>
      <p className="mt-3 max-w-sm text-base leading-relaxed text-[var(--text-secondary)]">
        Puede que el enlace esté mal escrito o que la página ya no exista. Vuelve al inicio y seguimos desde ahí.
      </p>
      <Link prefetch={false}
        href="/"
        className="mt-8 flex h-14 w-full max-w-xs items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] text-lg font-semibold text-[var(--bg)] [touch-action:manipulation]"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
