// Documento legal (Privacidad, Términos, Reembolsos): título, fecha de última actualización, índice
// con enlaces y secciones numeradas. Server component: sin hooks ni motion.
// Solo usa tokens de components/landing/tokens.css (cero hex sueltos).

import Link from 'next/link';
import { MARCA } from '@/lib/marca';
import { ArrowLeft, ShieldAlert } from './icons';
import { BrandMark } from './primitives';

export type { LegalBlock, LegalSection } from '@/lib/legal';
import type { LegalSection } from '@/lib/legal';

export const SOPORTE_EMAIL = MARCA.soporteEmail;

const OTROS = [
  { href: '/privacidad', label: 'Política de Privacidad' },
  { href: '/terminos', label: 'Términos y Condiciones' },
  { href: '/reembolsos', label: 'Política de Reembolsos' },
  { href: '/cookies', label: 'Política de Cookies' },
  { href: '/aviso-medico', label: 'Aviso médico' },
];

/** Parte un párrafo largo en trozos de 1-2 oraciones (solo presentación: el texto no cambia). */
function trocear(texto: string): string[] {
  const oraciones = texto.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡"])/);
  const trozos: string[] = [];
  let actual = '';
  for (const o of oraciones) {
    if (actual && (actual + " " + o).length > 170) {
      trozos.push(actual);
      actual = o;
    } else actual = actual ? actual + ' ' + o : o;
  }
  if (actual) trozos.push(actual);
  return trozos;
}

export function LegalDocument({
  titulo,
  actualizado,
  intro,
  aviso,
  secciones,
  rutaActual,
}: {
  titulo: string;
  actualizado: string;
  intro: string;
  /** Recuadro destacado al inicio (por ejemplo, el aviso de que la app no reemplaza al médico). */
  aviso?: { titulo: string; texto: string };
  secciones: LegalSection[];
  rutaActual: string;
}) {
  return (
    <main className="min-h-dvh bg-[var(--bg)] px-4 pt-6 pb-16 [font-family:var(--font-body)] text-[var(--text-primary)]">
      <div className="mx-auto w-full max-w-[38rem]">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--text-secondary)] underline-offset-4 hover:underline"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Volver al inicio
        </Link>

        <header className="mt-4">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[var(--accent)] uppercase">
            <BrandMark size={20} />
            {MARCA.nombre}
          </p>
          <h1 className="mt-2 text-3xl leading-tight font-bold text-balance [font-family:var(--font-display)] md:text-4xl">{titulo}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Última actualización: {actualizado}</p>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-primary)]">{intro}</p>
        </header>

        {aviso && (
          <aside
            role="note"
            aria-label={aviso.titulo}
            className="mt-6 flex items-start gap-3 rounded-[var(--radius-card)] bg-[color-mix(in_oklab,var(--accent)_10%,var(--surface))] p-4 ring-1 ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
          >
            <ShieldAlert size={24} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--accent)]" />
            <div>
              <p className="text-base font-bold [font-family:var(--font-display)]">{aviso.titulo}</p>
              <p className="mt-1 text-base leading-relaxed">{aviso.texto}</p>
            </div>
          </aside>
        )}

        <nav aria-label="Contenido de esta página" className="mt-8 rounded-[var(--radius-card)] bg-[var(--surface)] p-4 shadow-[var(--shadow-1)] ring-1 ring-[color-mix(in_oklab,var(--text-tertiary)_20%,transparent)]">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">En esta página</p>
          <ol className="mt-2 flex flex-col">
            {secciones.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex min-h-11 items-center gap-3 text-base text-[var(--text-primary)] underline-offset-4 hover:underline"
                >
                  <span className="w-6 shrink-0 text-sm font-semibold text-[var(--accent)] tabular-nums">{i + 1}.</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-8 flex flex-col gap-4">
          {secciones.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-t`}
              className="scroll-mt-6 rounded-[var(--radius-card)] bg-[var(--surface)] p-5 shadow-[var(--shadow-1)] ring-1 ring-[color-mix(in_oklab,var(--accent)_8%,transparent)]"
            >
              <h2 id={`${s.id}-t`} className="flex items-start gap-3 text-lg leading-snug font-bold text-balance [font-family:var(--font-display)] md:text-xl">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-strong)] text-[16px] text-[var(--bg)]"
                >
                  {i + 1}
                </span>
                <span className="pt-0.5">{s.title}</span>
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {s.blocks.map((b, j) =>
                  typeof b === 'string' ? (
                    trocear(b).map((t, k) => (
                      <p key={`${j}-${k}`} className="text-[16px] leading-relaxed text-[var(--text-secondary)] first:text-[var(--text-primary)]">
                        {t}
                      </p>
                    ))
                  ) : (
                    <ul key={j} className="flex list-disc flex-col gap-2 pl-6 marker:text-[var(--accent)]">
                      {b.list.map((li, k) => (
                        <li key={k} className="text-[16px] leading-relaxed text-[var(--text-secondary)]">
                          {li}
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-[color-mix(in_oklab,var(--text-tertiary)_25%,transparent)] pt-6">
          <p className="text-base leading-relaxed">
            ¿Tienes dudas sobre este documento? Escríbenos a{' '}
            <a href={`mailto:${SOPORTE_EMAIL}`} className="inline-flex min-h-11 items-center font-semibold text-[var(--accent)] underline underline-offset-4">
              {SOPORTE_EMAIL}
            </a>
            .
          </p>
          <nav aria-label="Otros documentos legales" className="mt-4 flex flex-col">
            {OTROS.filter((o) => o.href !== rutaActual).map((o) => (
              <Link
                key={o.href}
                href={o.href}
                className="inline-flex min-h-11 items-center text-base text-[var(--text-secondary)] underline underline-offset-4"
              >
                {o.label}
              </Link>
            ))}
          </nav>
        </footer>
      </div>
    </main>
  );
}
