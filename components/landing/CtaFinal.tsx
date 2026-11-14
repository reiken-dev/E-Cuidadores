// LANDING — CTA FINAL EMOCIONAL + PS
// El bloque de MÁXIMO contraste de la página: fondo INVERTIDO (usa
// --text-primary como fondo y --bg como texto), sin nav ni distracciones.
// H2 emocional ≤8 palabras (warn) · future pacing 1-2 líneas en presente y 2ª
// persona · CTA ≥56px con el MISMO verbo del hero (42) · recap riesgo/urgencia
// SOLO con datos reales · PS estilo carta (borde izquierdo en acento) — el
// segundo texto más leído de la página. Nada se interpone entre el PS
// y el footer.

import { Circulo } from '@/components/brand/Circulo';
import { CtaButton } from './primitives';
import { MarkedCopy, warnCopy } from './MarkedCopy';

export interface CtaFinalProps {
  /** Copy MARCADO — headline emocional, máx 8 palabras (warn). */
  h2Marked: string;
  /** Copy MARCADO — future pacing 1-2 líneas, presente, 2ª persona (warn a 24). */
  futurePacingMarked: string;
  /** MISMO texto y verbo del CTA héroe (42). */
  ctaLabel: string;
  ctaHref: string;
  /** Recap riesgo/urgencia bajo el CTA — cupo SOLO si es real (19). */
  recap?: string;
  /** El PS de la oferta Hormozi — máx 4 líneas (~55 palabras, warn). */
  psMarked?: string;
  /** default 'cta-final' — lo observa StickyCtaMobile para ocultarse. */
  id?: string;
}

export function CtaFinal({
  h2Marked,
  futurePacingMarked,
  ctaLabel,
  ctaHref,
  recap,
  psMarked,
  id = 'cta-final',
}: CtaFinalProps) {
  warnCopy('CtaFinal → h2', h2Marked, 8);
  warnCopy('CtaFinal → future pacing', futurePacingMarked, 24);
  if (psMarked !== undefined) warnCopy('CtaFinal → PS', psMarked, 55);

  return (
    <section
      id={id}
      aria-label="Empieza hoy"
      className="grano grano-oscuro relative overflow-hidden py-20 md:py-24"
      style={{ background: 'linear-gradient(170deg, var(--navy) 0%, var(--navy-2) 100%)' }}
    >
      {/* Profundidad también en el bloque invertido: radial sutil del acento */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(720px 420px at 50% 0%, color-mix(in oklab, var(--accent-warm) 26%, transparent) 0%, transparent 62%), radial-gradient(420px 320px at 100% 100%, color-mix(in oklab, var(--accent-2) 22%, transparent) 0%, transparent 70%)',
        }}
      />

      <Circulo simple size={460} className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />
      <div
        className="relative mx-auto flex max-w-[680px] flex-col items-center px-5 text-center"
      >
        <h2
          data-reveal
          className="text-balance text-[28px] font-bold leading-[1.15] [font-family:var(--font-display)] md:text-[48px]"
          style={{ color: 'var(--bg)', ['--accent' as string]: 'var(--accent-warm)' }}
        >
          <MarkedCopy text={h2Marked} />
        </h2>

        <p
          data-reveal
          className="mt-4 max-w-[520px] text-[18px] leading-relaxed"
          style={{ color: 'color-mix(in oklab, var(--bg) 78%, transparent)' }}
        >
          <MarkedCopy text={futurePacingMarked} />
        </p>

        <div data-reveal className="mt-8 w-full sm:w-auto">
          {/* Acento pleno sobre fondo invertido = el máximo contraste de la página */}
          <CtaButton href={ctaHref} alto={56} id="cta-final">
            {ctaLabel}
          </CtaButton>
        </div>

        {recap && (
          <p
            data-reveal
            className="mt-3 text-[16px]"
            style={{ color: 'color-mix(in oklab, var(--bg) 65%, transparent)' }}
          >
            {recap}
          </p>
        )}

        {psMarked !== undefined && (
          <p
            data-reveal
            className="mt-8 max-w-[440px] rounded-2xl bg-[color-mix(in_oklab,var(--bg)_8%,transparent)] px-4 py-3 text-left text-[16px] leading-snug ring-1 ring-[color-mix(in_oklab,var(--bg)_14%,transparent)]"
            style={{
              borderColor: 'var(--accent)',
              color: 'color-mix(in oklab, var(--bg) 80%, transparent)',
            }}
          >
            <MarkedCopy text={psMarked} />
          </p>
        )}
      </div>
    </section>
  );
}
