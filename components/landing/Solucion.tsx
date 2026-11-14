// LANDING — SOLUCIÓN
// Fondo base (el alivio también es visual). Título corto + el MECANISMO bautizado en su propia
// tarjeta con borde degradado + exactamente 3 pasos, cada uno en su caja con ícono + el antes/después
// como prueba concreta (la pregunta que desaparece vs. la línea que la reemplaza).

import { ArrowDown, CircleDot } from './icons';
import type { Icono as LucideIcon } from './icons';
import {Accent, Hairline, Kicker, SectionShell} from './primitives';
import type { ReactNode } from 'react';
import { MarkedCopy, warnCopy } from './MarkedCopy';

export interface PasoMecanismo {
  icon: LucideIcon;
  titulo: string;
  detalle: string;
}

export interface SolucionProps {
  kicker?: string;
  tituloMarked: string;
  mecanismo: string;
  definicion: string;
  bigIdeaMarked: string;
  pasos: [PasoMecanismo, PasoMecanismo, PasoMecanismo];
  antesDespues?: {
    labelAntes: string;
    antes: string;
    labelDespues: string;
    despues: string;
  };
  /** Ilustración propia (el Círculo) que acompaña al método. */
  ilustracion?: ReactNode;
  id?: string;
}

export function Solucion({
  kicker = 'CÓMO FUNCIONA',
  tituloMarked,
  mecanismo,
  definicion,
  bigIdeaMarked,
  pasos,
  antesDespues,
  ilustracion,
  id,
}: SolucionProps) {
  warnCopy('Solución → título', tituloMarked, 8);
  warnCopy('Solución → Big Idea', bigIdeaMarked, 20);
  pasos.forEach((p, i) => warnCopy(`Solución → paso ${i + 1}`, p.detalle, 12));

  return (
    <SectionShell id={id} elevacion="base" ariaLabel="Cómo funciona">
      <div
        className="mx-auto max-w-[780px]"
      >
        <div data-reveal>
          <Kicker>{kicker}</Kicker>
          <h2 className="text-balance text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)] md:text-[36px]">
            <MarkedCopy text={tituloMarked} />
          </h2>
          <p className="mt-4 max-w-[560px] text-[18px] leading-snug text-[var(--text-secondary)]">
            <MarkedCopy text={bigIdeaMarked} />
          </p>
        </div>

        {ilustracion && (
          <div data-reveal aria-hidden="true" className="mt-8 flex justify-center">
            {ilustracion}
          </div>
        )}

        {/* El mecanismo bautizado, en su propia caja con borde degradado */}
        <div data-reveal className="mt-6">
          <Hairline emphasis surface="surface" className="shadow-[var(--shadow-2)]">
            <div className="flex items-start gap-3 p-5">
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-[var(--bg)]"
                style={{ background: 'var(--grad-brand)' }}
              >
                <CircleDot size={22} strokeWidth={2} aria-hidden="true" />
              </span>
              <p className="text-[16px] leading-snug text-[var(--text-secondary)]">
                <span className="block text-[22px] font-bold text-[var(--text-primary)] [font-family:var(--font-display)]">
                  <Accent>{mecanismo}</Accent>
                </span>
                {definicion.charAt(0).toUpperCase() + definicion.slice(1)}
              </p>
            </div>
          </Hairline>
        </div>

        <ol className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {pasos.map((p, i) => (
            <li
              key={i}
              data-reveal
              className="relative flex items-start gap-4 rounded-[var(--radius-card)] bg-[var(--surface)] p-5 shadow-[var(--shadow-1)] ring-1 ring-[color-mix(in_oklab,var(--accent)_10%,transparent)] md:flex-col"
            >
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--grad-soft)] ring-1 ring-[color-mix(in_oklab,var(--accent)_20%,transparent)]"
              >
                <p.icon size={22} strokeWidth={2} color="var(--accent)" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--accent)]">Paso {i + 1}</p>
                <h3 className="mt-0.5 text-[18px] font-semibold text-[var(--text-primary)]">{p.titulo}</h3>
                <p className="mt-1 text-[16px] leading-snug text-[var(--text-secondary)]">{p.detalle}</p>
              </div>
            </li>
          ))}
        </ol>

        {antesDespues && (
          <div data-reveal className="mt-8">
            <div className="rounded-[var(--radius-card)] bg-[var(--surface-2)] p-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {antesDespues.labelAntes}
              </p>
              <p className="mt-1.5 text-[18px] leading-snug text-[var(--text-secondary)] [font-family:var(--font-display)]">
                {antesDespues.antes}
              </p>
            </div>
            <div className="flex justify-center py-1" aria-hidden="true">
              <span className="flex size-8 items-center justify-center rounded-full bg-[var(--surface)] shadow-[var(--shadow-1)]">
                <ArrowDown size={16} color="var(--accent)" />
              </span>
            </div>
            <div
              className="rounded-[var(--radius-card)] p-5 text-[var(--bg)] shadow-[var(--shadow-2)]"
              style={{ background: 'var(--grad-brand)' }}
            >
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em]">{antesDespues.labelDespues}</p>
              <p className="mt-1.5 text-[22px] font-bold leading-snug [font-family:var(--font-display)]">{antesDespues.despues}</p>
            </div>
          </div>
        )}
      </div>
    </SectionShell>
  );
}
