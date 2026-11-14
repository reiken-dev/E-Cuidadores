'use client';

// PIEZAS DE LA APP INTERNA — botones, campos, chips, tarjetas, estados vacíos, skeleton, anillo.
// Consumen SOLO los tokens de components/landing/tokens.css + app/app/tokens-app.css.
// Reutilizan IconChip, CheckCustom y Hairline del kit de la landing.

import { useEffect, useId, type ReactNode } from 'react';
import Link from 'next/link';
import { animate, motion, useMotionValue, useTransform, type HTMLMotionProps } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Circulo } from '@/components/brand/Circulo';
import { IconChip, useReducedMotionSafe } from '@/components/landing/ui';
import type { Member, MemberTone } from '@/lib/types';

/* ── Botones ─────────────────────────────────────────────────────────────── */
export type BtnVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'inverso';
export type BtnSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-button)] t-btn transition-colors duration-150 [touch-action:manipulation] disabled:opacity-60';
const VARIANTS: Record<BtnVariant, string> = {
  primary:
    'bg-[var(--accent)] bg-[image:var(--grad-cta)] text-[var(--bg)] shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_10px_24px_-8px_color-mix(in_oklab,var(--accent)_55%,transparent)] hover:brightness-95',
  secondary:
    'bg-[var(--surface)] text-[var(--text-primary)] ring-1 ring-[color-mix(in_oklab,var(--text-tertiary)_35%,transparent)] shadow-[var(--shadow-1)]',
  soft: 'bg-[var(--chip-bg)] text-[var(--accent-strong)]',
  ghost: 'text-[var(--text-secondary)]',
  danger: 'bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] text-[var(--danger-text)]',
  // Para usarse sobre un bloque de confianza (degradé de marca): botón blanco con texto azul AA.
  inverso:
    'bg-[var(--surface)] text-[var(--accent-strong)] shadow-[inset_0_-2px_0_color-mix(in_oklab,var(--accent)_18%,transparent),0_12px_28px_-12px_color-mix(in_oklab,var(--navy-2)_75%,transparent)] hover:brightness-95',
};
const SIZES: Record<BtnSize, string> = { sm: 'h-11 px-4', md: 'h-12 px-6', lg: 'h-14 px-8' };

export function btnClass(variant: BtnVariant = 'primary', size: BtnSize = 'md', full = false): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${full ? 'w-full' : ''}`;
}

export function Btn({
  variant = 'primary',
  size = 'md',
  full = false,
  className = '',
  type = 'button',
  ...props
}: { variant?: BtnVariant; size?: BtnSize; full?: boolean } & HTMLMotionProps<'button'>) {
  const reduce = useReducedMotionSafe();
  return (
    <motion.button
      type={type}
      whileTap={props.disabled || reduce ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className={`${btnClass(variant, size, full)} ${className}`}
      {...props}
    />
  );
}

/** Enlace de Next con respuesta al toque (se omite con movimiento reducido). */
const MotionLink = motion.create(Link);
export function TapLink({
  href,
  className = '',
  scale = 0.97,
  children,
  'aria-label': ariaLabel,
}: {
  href: string;
  className?: string;
  scale?: number;
  children: ReactNode;
  'aria-label'?: string;
}) {
  const reduce = useReducedMotionSafe();
  return (
    <MotionLink prefetch={false} href={href} aria-label={ariaLabel} whileTap={reduce ? undefined : { scale }} className={className}>
      {children}
    </MotionLink>
  );
}

export function LinkBtn({
  href,
  variant = 'primary',
  size = 'md',
  full = false,
  className = '',
  children,
}: {
  href: string;
  variant?: BtnVariant;
  size?: BtnSize;
  full?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <TapLink href={href} className={`${btnClass(variant, size, full)} ${className}`}>
      {children}
    </TapLink>
  );
}

/* ── Tarjeta ─────────────────────────────────────────────────────────────── */
export function Card({
  className = '',
  children,
  as: Tag = 'div',
  plano = false,
}: {
  className?: string;
  /** Tarjeta secundaria: nivel hundido, sin sombra (solo la héroe se eleva). */
  plano?: boolean;
  children: ReactNode;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <Tag
      className={`rounded-[var(--radius-card)] ring-1 ring-[color-mix(in_oklab,var(--text-tertiary)_14%,transparent)] ${
        plano ? 'bg-[color-mix(in_oklab,var(--surface-2)_55%,var(--surface))]' : 'superficie-premium bg-[var(--surface)] shadow-[var(--shadow-2)]'
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

/* ── Encabezado de pantalla ─────────────────────────────────────────────── */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 pb-4">
      <div className="min-w-0">
        <h1 className="t-h1 text-balance text-[var(--text-primary)]">{title}</h1>
        {subtitle && <p className="t-body mt-1 text-[var(--text-secondary)]">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/* ── Campos de formulario (label visible, aria-invalid, error inline con role="alert") ── */
export function inputClass(error?: string): string {
  return `w-full rounded-[var(--radius-button)] border bg-[var(--surface)] px-6 text-base text-[var(--text-primary)] shadow-[var(--shadow-1)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus:border-[var(--accent)] ${
    error ? 'border-[var(--danger)]' : 'border-[color-mix(in_oklab,var(--text-tertiary)_30%,transparent)]'
  }`;
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (a11y: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode;
}) {
  const id = useId();
  const errId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="t-body mb-2 block font-medium text-[var(--text-primary)]">
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="t-body mt-2 text-[var(--text-secondary)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="t-body mt-2 flex items-start gap-2 text-[var(--danger-text)]">
          <AlertCircle size={16} className="mt-px shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  type = 'text',
  inputMode,
  autoFocus,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  type?: 'text' | 'time' | 'date' | 'number' | 'tel';
  inputMode?: 'text' | 'numeric' | 'tel';
  autoFocus?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(a11y) => (
        <input
          {...a11y}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          inputMode={inputMode}
          placeholder={placeholder}
          autoFocus={autoFocus}
          min={min}
          max={max}
          className={`${inputClass(error)} h-14`}
        />
      )}
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  rows = 4,
  maxLength,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  autoFocus?: boolean;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(a11y) => (
        <textarea
          {...a11y}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength ?? 120}
          autoFocus={autoFocus}
          className={`${inputClass(error)} resize-none rounded-[var(--radius-card)] py-4 leading-relaxed`}
        />
      )}
    </Field>
  );
}

/* ── Interruptor (role="switch", área táctil de toda la fila) ─────────────── */
export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-l`}
      aria-describedby={description ? `${id}-d` : undefined}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center justify-between gap-4 text-left [touch-action:manipulation]"
    >
      <span className="min-w-0">
        <span id={`${id}-l`} className="t-body block font-medium text-[var(--text-primary)]">
          {label}
        </span>
        {description && (
          <span id={`${id}-d`} className="t-label block text-[var(--text-secondary)]">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-[var(--accent)]' : 'bg-[color-mix(in_oklab,var(--text-tertiary)_35%,transparent)]'
        }`}
      >
        <span
          className={`absolute top-1 size-6 rounded-full bg-[var(--surface)] shadow-[var(--shadow-1)] transition-transform duration-200 ${
            checked ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  );
}

/* ── Chip seleccionable (filtros, opciones) ──────────────────────────────── */
export function ChipToggle({
  selected,
  onClick,
  icon: Icono,
  children,
  role,
  className = '',
}: {
  className?: string;
  selected: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  children: ReactNode;
  role?: 'radio';
}) {
  return (
    <button
      type="button"
      role={role}
      aria-pressed={role ? undefined : selected}
      aria-checked={role ? selected : undefined}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] px-4 t-body font-medium transition-colors duration-150 [touch-action:manipulation] ${className} ${
        selected
          ? 'bg-[var(--chip-bg)] text-[var(--accent)] ring-[1.5px] ring-[var(--accent)]'
          : 'bg-[var(--surface)] text-[var(--text-primary)] ring-1 ring-[color-mix(in_oklab,var(--text-tertiary)_30%,transparent)]'
      }`}
    >
      {Icono && <Icono size={18} aria-hidden="true" />}
      {children}
    </button>
  );
}

/* ── Avatar de iniciales ─────────────────────────────────────────────────── */
const TONO_BG: Record<MemberTone | 'neutral', string> = {
  accent: 'bg-[color-mix(in_oklab,var(--accent)_20%,var(--surface))]',
  indigo: 'bg-[color-mix(in_oklab,var(--accent-2)_26%,var(--surface))]',
  green: 'bg-[color-mix(in_oklab,var(--ok)_30%,var(--surface))]',
  amber: 'bg-[color-mix(in_oklab,var(--warn)_36%,var(--surface))]',
  neutral: 'bg-[var(--surface-2)]',
};

export function Avatar({
  name,
  tone = 'neutral',
  size = 'md',
}: {
  name: string;
  tone?: MemberTone | 'neutral';
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'size-14 t-title' : size === 'sm' ? 'size-8 t-label' : 'size-11 t-body';
  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full font-bold text-[var(--text-primary)] ${TONO_BG[tone]} ff-display`}
    >
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

export function memberTone(members: Member[], id: string | null): MemberTone | 'neutral' {
  return members.find((m) => m.id === id)?.tone ?? 'neutral';
}

/* ── Pastilla de estado (siempre con ícono o texto: nunca solo color) ─────── */
export type PillTone = 'ok' | 'warn' | 'danger' | 'neutral' | 'accent' | 'indigo';
const PILL: Record<PillTone, string> = {
  ok: 'bg-[color-mix(in_oklab,var(--ok)_16%,transparent)] text-[var(--ok-text)]',
  warn: 'bg-[color-mix(in_oklab,var(--warn)_22%,transparent)] text-[var(--warn-text)]',
  danger: 'bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] text-[var(--danger-text)]',
  neutral: 'bg-[var(--surface-2)] text-[var(--text-secondary)]',
  accent: 'bg-[var(--chip-bg)] text-[var(--accent-strong)]',
  indigo: 'bg-[color-mix(in_oklab,var(--accent-2)_16%,transparent)] text-[var(--text-primary)]',
};

export function Pill({
  tone = 'neutral',
  icon: Icono,
  grande = false,
  children,
}: {
  tone?: PillTone;
  icon?: LucideIcon;
  /** Texto de lectura (16 px) en vez de etiqueta (14 px): para frases completas como "Va Marta". */
  grande?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-[var(--radius-button)] px-3 py-1 ${grande ? 't-body font-semibold' : 't-label'} ${PILL[tone]}`}>
      {Icono && <Icono size={14} aria-hidden="true" />}
      {children}
    </span>
  );
}

/* ── Skeleton con la forma exacta del contenido ──────────────────────────── */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

/* ── Estado vacío que activa: ícono + título que no dice "vacío" + CTA ─────── */
export function EmptyState({
  icon,
  escena,
  title,
  text,
  children,
}: {
  /** Ícono en el centro del Círculo (vacíos sin ilustración propia). */
  icon?: LucideIcon;
  /** Ilustración propia del vacío (componentes de components/brand/Escenas.tsx). Reemplaza al Círculo. */
  escena?: ReactNode;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-8 text-center">
      {escena ?? <Circulo simple size={132} centro={icon ? <IconChip icon={icon} /> : undefined} />}
      <h2 className="t-title mt-2 text-balance text-[var(--text-primary)]">{title}</h2>
      <p className="t-body mt-2 max-w-72 text-[var(--text-secondary)]">{text}</p>
      {children && <div className="mt-6 w-full max-w-72">{children}</div>}
    </Card>
  );
}

/* ── Número que cuenta de 0 al valor ───────────────────────── */
export function CountUp({ to, className = '' }: { to: number; className?: string }) {
  const reduce = useReducedMotionSafe();
  const mv = useMotionValue(reduce ? to : 0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  useEffect(() => {
    if (reduce) {
      mv.set(to);
      return;
    }
    const c = animate(mv, to, { duration: 0.25, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [to, reduce, mv]);
  return <motion.span className={className}>{rounded}</motion.span>;
}

/* ── Anillo de progreso que se dibuja ──────────────────────── */
export function ProgressRing({
  done,
  total,
  label,
  segmentos,
}: {
  done: number;
  total: number;
  label: string;
  /** Un tramo por dosis de hoy, en orden: el tono de quien la dio, o null si falta. Cada hermano deja su color en el anillo. */
  segmentos?: (MemberTone | 'neutral' | null)[];
}) {
  const reduce = useReducedMotionSafe();
  const frac = total > 0 ? done / total : 0;
  if (segmentos && segmentos.length === total && total >= 2 && total <= 8) {
    const C = 2 * Math.PI * 26;
    const paso = C / total;
    const arco = Math.max(2, paso - 22); // los extremos redondos comen ~8: el hueco visible queda en ~7
    const COLOR: Record<MemberTone | 'neutral', string> = { accent: 'var(--accent)', indigo: 'var(--accent-2)', green: 'var(--ok)', amber: 'var(--warn)', neutral: 'var(--text-tertiary)' };
    return (
      <div className="relative size-16 shrink-0 rounded-full bg-[var(--surface)] shadow-[var(--shadow-1)]" role="img" aria-label={label}>
        <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden="true">
          {segmentos.map((t, i) => (
            <motion.circle
              key={i}
              cx="32"
              cy="32"
              r="26"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              stroke={t ? COLOR[t] : 'color-mix(in oklab, var(--accent) 24%, transparent)'}
              initial={{ opacity: 1, strokeDasharray: reduce ? `${arco} ${C - arco}` : `0 ${C}` }}
              animate={{ strokeDasharray: `${arco} ${C - arco}` }}
              transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              strokeDashoffset={-(i * paso + 7.5)}
            />
          ))}
        </svg>
        <span className="ff-display absolute inset-0 flex items-center justify-center text-[var(--text-primary)] t-body font-bold tabular-nums">
          <CountUp to={done} />
          <span className="t-label text-[var(--text-secondary)]">/{total}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="relative size-16 shrink-0 rounded-full bg-[var(--surface)] shadow-[var(--shadow-1)]" role="img" aria-label={label}>
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r="26" fill="none" strokeWidth="8" stroke="color-mix(in oklab, var(--accent) 16%, transparent)" />
        {frac > 0 && (
        <motion.circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke="var(--accent)"
          initial={{ pathLength: reduce ? frac : 0 }}
          animate={{ pathLength: frac }}
          transition={{ duration: reduce ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
        )}
      </svg>
      <span className="ff-display absolute inset-0 flex items-center justify-center text-[var(--text-primary)] t-body font-bold tabular-nums">
        <CountUp to={done} />
        <span className="t-label text-[var(--text-secondary)]">/{total}</span>
      </span>
    </div>
  );
}

/* ── Línea "hecho" con check custom (mismo sello del kit) ─────────────────── */
export function DoneMark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--ok)_22%,transparent)]"
    >
      <CheckCircle2 size={16} color="var(--ok-text)" />
    </span>
  );
}
