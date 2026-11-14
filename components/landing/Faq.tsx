// LANDING — FAQ
// Acordeón NATIVO (<details>/<summary>): accesible por defecto, teclado incluido, sin JavaScript ni
// librería de animación. Fila táctil completa ≥56px, chevron que rota al abrir, el primero abierto
// (la objeción #1). Las preguntas son las objeciones más comunes; respuestas cortas.

import { ChevronDown } from './icons';
import { Kicker, SectionShell } from './primitives';
import { MarkedCopy, warnCopy, warnRango } from './MarkedCopy';

export interface ItemFaq {
  /** Una objeción REAL de la ficha, en pregunta. */
  pregunta: string;
  /** Copy MARCADO — corta y honesta, cierra reduciendo riesgo (máx 40 palabras). */
  respuestaMarked: string;
}

export interface FaqProps {
  kicker?: string;
  titulo?: string;
  items: ItemFaq[];
  /** Índice abierto al cargar — default 0 (la objeción #1). null = todo cerrado. */
  abiertoInicial?: number | null;
  id?: string;
}

export function Faq({ kicker, titulo = 'Preguntas frecuentes', items, abiertoInicial = 0, id }: FaqProps) {
  warnRango('FAQ → ítems', items.length, 4, 6);
  items.forEach((it, i) => warnCopy(`FAQ → respuesta ${i + 1}`, it.respuestaMarked, 40));

  return (
    <SectionShell id={id} elevacion="base" ariaLabel="Preguntas frecuentes">
      <div className="mx-auto max-w-[680px]">
        <div data-reveal className="mb-8">
          {kicker && <Kicker>{kicker}</Kicker>}
          <h2 className="text-balance text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)] md:text-[36px]">
            {titulo}
          </h2>
        </div>

        <ul data-reveal className="flex flex-col gap-3">
          {items.map((it, i) => (
            <li
              key={i}
              className="rounded-[var(--radius-card)] bg-[var(--surface)] shadow-[var(--shadow-1)] ring-1 ring-[color-mix(in_oklab,var(--accent)_8%,transparent)]"
            >
              <details className="group" open={abiertoInicial === i}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--radius-card)] px-4 py-4 text-left [touch-action:manipulation] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] [&::-webkit-details-marker]:hidden">
                  <span className="text-[16px] font-semibold text-[var(--text-primary)]">{it.pregunta}</span>
                  <ChevronDown
                    size={20}
                    aria-hidden="true"
                    color="var(--text-secondary)"
                    className="shrink-0 transition-transform duration-200 ease-out group-open:rotate-180"
                  />
                </summary>
                <p className="px-4 pr-10 pb-4 text-[16px] leading-snug text-[var(--text-secondary)]">
                  <MarkedCopy text={it.respuestaMarked} />
                </p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}
