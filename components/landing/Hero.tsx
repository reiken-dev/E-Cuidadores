// LANDING — HERO
// Reglas embebidas: H1 bold completo con acento vía copy marcado · subtítulo con
// tope duro de 14 palabras (warn + truncado) · CTA vivo ≥52px con sombra tintada ·
// franja de prueba social como slot (SOLO datos reales) · mesh sutil de
// fondo YA incluido · carga inmediata (fade simple, nada que compita con el LCP).

import type { ReactNode } from 'react';
import { Camera } from './icons';
import { Circulo } from '@/components/brand/Circulo';
import { CtaButton } from './primitives';
import { MarkedCopy, truncarMarcado, warnCopy } from './MarkedCopy';

export interface HeroProps {
  /** La marca y "Entrar" los pinta la cabecera fija de la página (StickyMiniHeader): aquí ya no se repiten. */
  appName: string;
  logo?: ReactNode;
  loginHref?: string;
  loginLabel?: string;
  /** Copy marcado: máx 8-10 palabras, 1-3 en [acento]. */
  h1Marked: string;
  /** Copy MARCADO — máx 14 palabras (52): el kit trunca y avisa si excede. */
  subtitleMarked: string;
  /** 1ª persona + beneficio ("Probar mi primer escaneo") — nunca "Registrarse". */
  ctaLabel: string;
  /** Destino: checkout de Hotmart u /onboarding, según el modelo. */
  ctaHref: string;
  /** Franja bajo el CTA (posición FIJA). Día 1 sin números: la garantía. */
  socialProof?: ReactNode;
  /** Screenshot real o mini-demo honesto. Sin visual → placeholder honesto. */
  visual?: ReactNode;
  /** Nota opcional bajo el visual, si hace falta aclarar algo. Sin valor, no aparece nada. */
  visualCaption?: string;
  /** Sugerencia CONCRETA de qué imagen poner en el placeholder — nunca "imagen aquí". */
  visualPlaceholderSugerencia?: string;
  /** Halo decorativo del Círculo detrás del visual. Con una firma propia (anillo del visual) se apaga: dos anillos compiten. */
  halo?: boolean;
  id?: string;
}

export function Hero({
  h1Marked,
  subtitleMarked,
  ctaLabel,
  ctaHref,
  socialProof,
  visual,
  visualCaption,
  visualPlaceholderSugerencia = 'captura de la pantalla principal con datos reales',
  halo = true,
  id = 'hero',
}: HeroProps) {
  warnCopy('Hero → h1', h1Marked, 10);
  warnCopy('Hero → subtítulo', subtitleMarked, 14);
  const subtitulo = truncarMarcado(subtitleMarked, 14);
  return (
    <section id={id} className="grano relative overflow-hidden pt-14">
      {/* Fondo con profundidad: mesh/radial sutil del acento — nunca fill plano */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(900px 480px at 50% -10%, color-mix(in oklab, var(--accent) 8%, transparent) 0%, transparent 60%), ' +
            'radial-gradient(640px 420px at 100% 0%, color-mix(in oklab, var(--accent-2) 6%, transparent) 0%, transparent 55%)',
        }}
      />

      <div className="mx-auto w-full max-w-[1140px] px-5 md:grid md:grid-cols-[minmax(0,1fr)_300px] md:items-center md:gap-8 md:px-8 lg:gap-16 lg:px-5">
        {/* Carga inmediata: el primer elemento entra sin retraso — el LCP manda (55 T4).
            Móvil: una columna centrada. Tablet y escritorio: texto a la izquierda y maqueta a la derecha. */}
        <div className="mx-auto flex max-w-[820px] flex-col items-center pt-10 text-center md:mx-0 md:max-w-none md:items-start md:pt-16 md:text-left">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--surface)] px-3 py-1.5 text-[16px] font-medium text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: 'var(--grad-brand)' }} />
            Para hermanos que cuidan juntos
          </p>
          {/* H1: bold completo por defecto; el acento lo pone el [acento] del copy */}
          <h1 className="text-balance text-[36px] font-bold leading-[1.08] tracking-[-0.01em] text-[var(--text-primary)] [font-family:var(--font-display)] md:text-[48px]">
            <MarkedCopy text={h1Marked} />
          </h1>

          {/* Titular y subtítulo se pintan desde el servidor, sin animación de entrada: el LCP no espera a JS */}
          <p className="mt-4 max-w-[560px] text-balance text-[18px] leading-relaxed text-[var(--text-secondary)] md:text-[18px]">
            <MarkedCopy text={subtitulo} />
          </p>

          <div className="mt-6 w-full sm:w-auto">
            <CtaButton href={ctaHref} id="cta-hero">{ctaLabel}</CtaButton>
          </div>

          {/* Franja de prueba social: 8-12px bajo el CTA — SOLO números reales */}
          {socialProof && (
            <div className="mt-3 text-[16px] text-[var(--text-secondary)]">
              {socialProof}
            </div>
          )}
        </div>

        {/* Visual del producto: asoma en el primer viewport e invita al scroll */}
        {/* Sin animación de entrada (div plano): es el elemento del LCP y no debe nacer en opacidad 0 */}
        <div className="relative mt-10 w-full md:mt-16">
            {halo && <Circulo simple size={400} className="pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 opacity-80" />}
            {/* El visual dibuja su propio dispositivo y su firma (anillo, píldora): aquí no se le pone marco,
                para que el anillo y los avatares no queden recortados. */}
            {visual ? (
              <div className="relative w-full">{visual}</div>
            ) : (
              /* Placeholder honesto: dashed + ratio fijo (CLS 0) + sugerencia.
                 Pendiente de montar el visual real. */
              <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-[color-mix(in_oklab,var(--text-tertiary)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_5%,transparent)] px-8">
                <Camera size={20} color="var(--text-secondary)" aria-hidden="true" />
                <p className="max-w-[36ch] text-center text-[16px] font-medium leading-snug text-[var(--text-secondary)]">
                  Sugerencia: {visualPlaceholderSugerencia}
                </p>
              </div>
            )}
            {visual && visualCaption && (
              <p className="mt-3 pb-8 text-center text-[16px] text-[var(--text-secondary)]">{visualCaption}</p>
            )}
        </div>
      </div>
    </section>
  );
}
