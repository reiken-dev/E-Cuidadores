// PRIMITIVOS de la landing — SIN estado ni hooks: se renderizan en el servidor y no suman JavaScript.
// (Lo que necesita el navegador —observadores, barras fijas— vive en ui.tsx y reveal.tsx.)

import type { ReactNode } from 'react';
import { Check, HeartHandshake } from './icons';
import type { Icono as LucideIcon } from './icons';

/* ── <BrandMark> — la marca: cuadrado acento con el glifo de "cuidar entre todos" (manos
   y corazón). Se usa igual en header, mini-header, funnel y footer para que la marca no
   sea un cuadrado vacío. ── */
export function BrandMark({ size = 24 }: { size?: 20 | 24 | 28 }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center shadow-[0_4px_12px_-4px_rgb(31_91_214/0.55)]"
      style={{ width: size, height: size, borderRadius: Math.round(size / 3), background: 'var(--grad-brand)' }}
    >
      <HeartHandshake size={Math.round(size * 0.62)} strokeWidth={2.2} color="var(--bg)" aria-hidden="true" />
    </span>
  );
}

/* ── <Accent> — la palabra que vende, en el acento del kit ─────────────────── */
export function Accent({ children }: { children: ReactNode }) {
  return <span className="text-[var(--accent)]">{children}</span>;
}

/* ── <Kicker> — caps 12px/600 tracking +0.08em en acento (máx 1 por sección) ── */
export function Kicker({ children, centrado = false }: { children: ReactNode; centrado?: boolean }) {
  return (
    <p className={`mb-3 flex items-center gap-2 ${centrado ? 'justify-center' : ''} text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]`}>
      <span aria-hidden="true" className="h-1 w-6 rounded-full" style={{ background: 'var(--grad-brand)' }} />
      {children}
    </p>
  );
}

/* ── <IconChip> — ícono SVG 22px dentro de chip 44px (jamás emoji) ──────
   tone 'accent' para secciones cálidas · 'muted' para íconos de dolor (
   neutro apagado, nunca checks verdes). La FORMA la decide --radius-button:
   una sola forma de chip por página. */
export function IconChip({ icon: Icono, tone = 'accent' }: { icon: LucideIcon; tone?: 'accent' | 'muted' }) {
  const acento = tone === 'accent';
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] border ${
        acento
          ? 'border-[color-mix(in_oklab,var(--accent)_22%,transparent)] bg-[var(--chip-bg)]'
          : 'border-[color-mix(in_oklab,var(--text-tertiary)_35%,transparent)] bg-[color-mix(in_oklab,var(--text-tertiary)_12%,transparent)]'
      }`}
    >
      <Icono size={22} strokeWidth={2} color={acento ? 'var(--accent)' : 'var(--text-secondary)'} aria-hidden="true" />
    </span>
  );
}

/* ── <Hairline> — borde degradado 1-2px, técnica padding-box/border-box.
   Señal de "esto importa": máx 1-3 usos por página (plan recomendado, garantía,
   chip del mecanismo). emphasis = EL elemento de la vista (2px, acento 55%). ── */
export function Hairline({
  emphasis = false,
  surface = 'surface',
  className = '',
  children,
}: {
  emphasis?: boolean;
  surface?: 'surface' | 'surface-2' | 'bg';
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] ${className}`}
      style={{
        border: `${emphasis ? 2 : 1}px solid transparent`,
        background:
          `linear-gradient(var(--${surface}), var(--${surface})) padding-box, ` +
          `linear-gradient(135deg, color-mix(in oklab, var(--accent) ${emphasis ? 55 : 40}%, transparent), transparent 60%) border-box`,
      }}
    >
      {children}
    </div>
  );
}

/* ── <CheckCustom> — círculo acento 12% + check SVG (55 repertorio #9).
   Nunca el ✓ del sistema ni emoji. ── */
export function CheckCustom() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]"
    >
      <Check size={13} strokeWidth={2.5} color="var(--accent)" aria-hidden="true" />
    </span>
  );
}

/* ── <SectionShell> — ritmo vertical y alternancia base↔elevado (55 T1).
   64px mobile / 96px desktop; compacta (garantía) 48/64. flush pega las
   secciones que son UN movimiento visual (problema+agitación). ── */
export function SectionShell({
  id,
  elevacion = 'base',
  compacta = false,
  flush = 'none',
  ariaLabel,
  className = '',
  children,
}: {
  id?: string;
  elevacion?: 'base' | 'elevada';
  compacta?: boolean;
  flush?: 'none' | 'top' | 'bottom';
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const pt = flush === 'top' ? 'pt-0' : compacta ? 'pt-12 md:pt-16' : 'pt-16 md:pt-24';
  const pb = flush === 'bottom' ? 'pb-8 md:pb-10' : compacta ? 'pb-12 md:pb-16' : 'pb-16 md:pb-24';
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={`${elevacion === 'elevada' ? 'bg-[var(--surface)]' : ''} ${pt} ${pb} ${className}`}
    >
      <div className="mx-auto w-full max-w-[1140px] px-5">{children}</div>
    </section>
  );
}

/* ── <CtaButton> — el CTA vivo del kit: ≥52px, feedback al toque (escala 0.97), sombra tintada.
   El texto sobre acento usa --bg: si tu identidad rompe el contraste AA ahí,
   ajusta los tokens, no el componente. ── */
export function CtaButton({
  href,
  children,
  fullMobile = true,
  id,
  evento = 'inicio-compra',
}: {
  href: string;
  children: ReactNode;
  alto?: 56; // CTA principal: 56 px en móvil
  fullMobile?: boolean;
  /** id estable del CTA (para medir sin depender del texto). */
  id: string;
  /** Nombre del evento de medición: 'inicio-compra' lleva al recorrido de compra (ver docs/conexion/README.md). */
  evento?: string;
}) {
  return (
    <a href={href}
      id={id}
      data-evento={evento}
      data-cta="boton"
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] bg-[var(--accent)] bg-[image:var(--grad-cta)] px-4 text-[16px] font-semibold sm:px-8 sm:text-[18px] text-[var(--bg)] shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_10px_28px_-8px_color-mix(in_oklab,var(--accent)_55%,transparent)] transition-[transform,background-color] duration-150 hover:bg-[color-mix(in_oklab,var(--accent)_88%,var(--text-primary))] active:scale-[0.97] [touch-action:manipulation] ${
        'h-16'
      } ${fullMobile ? 'w-full sm:w-auto' : ''}`}
    >
      {children}
    </a>
  );
}
