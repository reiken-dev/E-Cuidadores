// LANDING — AGITACIÓN
// El costo de seguir igual, sin miedo ni diagnósticos: tres costos concretos y cotidianos, cada uno
// en su propia tarjeta con ícono y UNA frase. Cierra con el contraste "ahora vs. con E-Cuidadores"
// en dos cajas. Máximo ~2 líneas por texto.

import type { Icono as LucideIcon } from './icons';
import {SectionShell} from './primitives';
import { MarkedCopy } from './MarkedCopy';

export interface CostoAgitacion {
  icon: LucideIcon;
  titulo: string;
  detalle: string;
}

export interface AgitacionProps {
  escenaMarked: string;
  costos: CostoAgitacion[];
  id?: string;
}

export function Agitacion({ escenaMarked, costos, id }: AgitacionProps) {
  return (
    <SectionShell id={id} elevacion="elevada" flush="top" ariaLabel="El costo de seguir igual">
      <div
        className="mx-auto max-w-[620px]"
      >
        <div data-reveal className="relative isolate">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -z-10"
            style={{
              inset: '-40px -20px',
              background:
                'radial-gradient(closest-side, color-mix(in oklab, var(--accent-warm) 24%, transparent) 0%, transparent 100%)',
            }}
          />
          <p className="text-balance text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)] md:text-[36px]">
            <MarkedCopy text={escenaMarked} />
          </p>
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-3">
          {costos.map((c, i) => (
            <li
              key={i}
              data-reveal
              className="flex items-start gap-4 rounded-[var(--radius-card)] bg-[var(--bg)] p-4 ring-1 ring-[color-mix(in_oklab,var(--accent)_10%,transparent)]"
            >
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--grad-soft)] ring-1 ring-[color-mix(in_oklab,var(--accent)_18%,transparent)]"
              >
                <c.icon size={22} strokeWidth={2} color="var(--accent)" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">{c.titulo}</h3>
                <p className="mt-0.5 text-[16px] leading-snug text-[var(--text-secondary)]">{c.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}
