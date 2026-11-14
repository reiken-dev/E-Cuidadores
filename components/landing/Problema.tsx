// LANDING — PROBLEMA
// En vez de una lista de preguntas, la escena exacta del dolor: el chat familiar a las 9:40 de la
// noche (voz literal de la familia). Burbujas cortas, una por mensaje, dentro de una
// sola tarjeta con encabezado: nada de párrafos y cada idea en su propia caja.

import {SectionShell, Kicker} from './primitives';
import { MarkedCopy } from './MarkedCopy';

export interface MensajeChat {
  autor: string;
  hora: string;
  texto: string;
  /** Color de la inicial: variedad cromática de la marca. */
  tono: 'accent' | 'violet' | 'sun';
  /** Mensaje enviado por la persona lectora (burbuja a la derecha, en acento). */
  propio?: boolean;
}

export interface ProblemaProps {
  kicker?: string;
  titulo: string;
  mensajes: MensajeChat[];
  /** Una sola línea de cierre, copy MARCADO. */
  cierreMarked: string;
  etiqueta?: string;
  id?: string;
}

// Las iniciales van en tonos oscuros de cada color para cumplir 4,5:1 en texto pequeño (el violeta puro no llega).
const TONO: Record<MensajeChat['tono'], string> = {
  accent: 'bg-[color-mix(in_oklab,var(--accent)_16%,var(--surface))] text-[var(--accent-strong)]',
  violet: 'bg-[color-mix(in_oklab,var(--accent-2)_18%,var(--surface))] text-[color-mix(in_oklab,var(--accent-2)_75%,var(--text-primary))]',
  sun: 'bg-[color-mix(in_oklab,var(--sun)_38%,var(--surface))] text-[var(--sun-text)]',
};

export function Problema({ kicker = 'EL PROBLEMA', titulo, mensajes, cierreMarked, etiqueta, id }: ProblemaProps) {
  return (
    <SectionShell id={id} elevacion="elevada" flush="bottom" ariaLabel="El problema">
      <div
        className="mx-auto max-w-[560px]"
      >
        <div data-reveal>
          <Kicker>{kicker}</Kicker>
          <h2 className="text-balance text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)] md:text-[36px]">
            {titulo}
          </h2>
        </div>

        <div
          data-reveal
          className="mt-8 overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg)] shadow-[var(--shadow-2)] ring-1 ring-[color-mix(in_oklab,var(--accent)_14%,transparent)]"
        >
          <div className="flex items-center justify-between border-b border-[color-mix(in_oklab,var(--text-tertiary)_16%,transparent)] bg-[var(--surface)] px-4 py-3">
            <p className="text-[16px] font-semibold text-[var(--text-primary)]">Chat familiar</p>
            {etiqueta && <p className="text-[16px] text-[var(--text-secondary)]">{etiqueta}</p>}
          </div>
          <ul className="flex flex-col gap-3 p-4">
            {mensajes.map((m, i) => (
              <li key={i} className={`flex items-end gap-2 ${m.propio ? 'flex-row-reverse' : ''}`}>
                <span
                  aria-hidden="true"
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${TONO[m.tono]}`}
                >
                  {m.autor.charAt(0)}
                </span>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    m.propio
                      ? 'rounded-br-md bg-[var(--accent)] bg-[image:var(--grad-cta)] text-[var(--bg)]'
                      : 'rounded-bl-md bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-1)]'
                  }`}
                >
                  <p className={`text-[12px] font-semibold ${m.propio ? '' : 'text-[var(--text-secondary)]'}`}>
                    {m.autor} · {m.hora}
                  </p>
                  <p className="mt-0.5 text-[16px] leading-snug">{m.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p data-reveal className="mt-6 text-center text-[18px] font-medium leading-snug text-[var(--text-primary)]">
          <MarkedCopy text={cierreMarked} />
        </p>
      </div>
    </SectionShell>
  );
}
