// PRUEBA SOCIAL — la sección de testimonios de la landing.
// No se pinta nada mientras no haya testimonios reales en lib/prueba-social.ts.

import { TESTIMONIOS, type Testimonio } from '@/lib/prueba-social';
import { Kicker, SectionShell } from './primitives';

export function PruebaSocial({ testimonios = TESTIMONIOS }: { testimonios?: Testimonio[] }) {
  if (testimonios.length === 0) return null;
  return (
    <SectionShell elevacion="base" compacta ariaLabel="Lo que dicen las familias">
      <div className="mx-auto max-w-[620px]">
        <div data-reveal>
          <Kicker>Lo que dicen</Kicker>
          <h2 className="text-balance text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)] md:text-[36px]">
            Familias que ya cuidan en círculo
          </h2>
        </div>
        <ul className="mt-6 flex flex-col gap-4">
          {testimonios.map((t) => (
            <li
              key={`${t.nombre}-${t.frase}`}
              data-reveal
              className="rounded-[var(--radius-card)] bg-[var(--surface)] p-5 shadow-[var(--shadow-1)]"
            >
              <p className="text-[18px] leading-snug text-[var(--text-primary)]">«{t.frase}»</p>
              <p className="mt-3 text-[16px] text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">{t.nombre}</span> · {t.relacion}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}
