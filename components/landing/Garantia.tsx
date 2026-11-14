// LANDING — GARANTÍA
// Franja propia compacta (48-64px) bajo la oferta — NO una línea perdida.
// Escudo SVG en chip 60px (jamás emoji), nombre PROPIO de la garantía en acento,
// condición máx 3 líneas (warn a las 30 palabras), piso Hotmart con candado SVG.
// Nunca placeholders ("garantía visible"): se nombra la política concreta o la
// sección no se monta. El plazo = el configurado en Hotmart.

import { Lock, ShieldCheck } from './icons';
import type { Icono as LucideIcon } from './icons';
import {Accent, Hairline, SectionShell} from './primitives';
import { MarkedCopy, warnCopy } from './MarkedCopy';

export interface GarantiaProps {
  /** Nombre PROPIO ("la Garantía del Primer Día Claro") — se pinta en acento. */
  nombre: string;
  /** Copy MARCADO de la condición — máx 3 líneas (~30 palabras, warn). */
  condicionMarked: string;
  /** Piso legal verificable ("Respaldada por la garantía Hotmart de 7 días"). */
  pisoLegal?: string;
  /** default ShieldCheck (Lucide) — siempre SVG. */
  icon?: LucideIcon;
  id?: string;
}

export function Garantia({ nombre, condicionMarked, pisoLegal, icon: Icono = ShieldCheck, id }: GarantiaProps) {
  warnCopy('Garantía → condición', condicionMarked, 30);

  return (
    <SectionShell id={id} elevacion="elevada" compacta ariaLabel="Garantía">
      <div
        className="mx-auto max-w-[560px]"
      >
        <div data-reveal>
          {/* La card de garantía: uno de los 1-3 usos de hairline permitidos por vista */}
          <Hairline surface="surface" className="shadow-[var(--shadow-1)]">
            <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
              <span
                aria-hidden="true"
                className="flex size-15 items-center justify-center rounded-[var(--radius-button)] shadow-[0_10px_24px_-8px_rgb(31_91_214/0.55)]"
                style={{ background: 'var(--grad-brand)' }}
              >
                <Icono size={30} strokeWidth={1.8} color="var(--bg)" aria-hidden="true" />
              </span>
              <h2 className="text-balance text-[28px] font-bold leading-[1.15] [font-family:var(--font-display)]">
                <Accent>{nombre}</Accent>
              </h2>
              <p className="max-w-[40ch] text-[16px] leading-snug text-[var(--text-secondary)]">
                <MarkedCopy text={condicionMarked} />
              </p>
              {pisoLegal && (
                <p className="flex items-center justify-center gap-1.5 text-balance text-center text-[16px] text-[var(--text-secondary)]">
                  <Lock size={14} aria-hidden="true" className="shrink-0" />
                  {pisoLegal}
                </p>
              )}
            </div>
          </Hairline>
        </div>
      </div>
    </SectionShell>
  );
}
