'use client';

// ONBOARDING — OnboardingUI.tsx
// Piezas compartidas del funnel (pregunta, reconocimiento, loading, paywall, login).
// Especificación visual: pasos del recorrido de alta.
// Consume SOLO los tokens de components/landing/tokens.css (ya importado en globals.css) —
// nunca hex nuevos aquí. Reutiliza useReducedMotionSafe del kit de landing para no repetir
// el fix de hidratación ya documentado.

import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { ChevronLeft, ChevronRight, CircleAlert, type LucideIcon, Check, Lock, X } from 'lucide-react';
import { MARCA } from '@/lib/marca';
import { BrandMark, useReducedMotionSafe } from '@/components/landing/ui';

export { useReducedMotionSafe };

/* Fondo del recorrido con 3 niveles: base crema + mesh radial coral arriba y una
   franja "hundida" cálida al pie que asienta el CTA. Lo comparten preguntas y pantalla de carga. */
export const FUNNEL_BG =
  'radial-gradient(color-mix(in oklab, var(--accent) 13%, transparent) 1px, transparent 1.4px) 0 0 / 18px 18px, ' +
  'radial-gradient(560px 360px at 85% -8%, color-mix(in oklab, var(--accent-warm) 16%, transparent) 0%, transparent 60%), ' +
  'radial-gradient(480px 320px at 0% 100%, color-mix(in oklab, var(--accent-warm) 8%, transparent) 0%, transparent 55%), ' +
  'linear-gradient(to top, color-mix(in oklab, var(--surface-2) 70%, transparent) 0%, transparent 22%)';

/* ── <FunnelBrand> — logo + nombre arriba de TODA pantalla del funnel.
   Tocar vuelve a "/". Si hay progreso en el wizard, confirma antes de salir con un modal
   PROPIO del kit (tokens/radius/Baloo 2) — un window.confirm() nativo rompía la identidad
   "Cálido/Sereno" justo en el momento más delicado. El modal es un diálogo
   accesible: role="dialog" + aria-modal, foco inicial en "Seguir aquí", foco atrapado, Escape
   y toque en el fondo lo cierran, y el foco vuelve al enlace. ── */
export function FunnelBrand({ hasProgress = false, compact = false }: { hasProgress?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  return (
    <>
      <Link prefetch={false}
        href="/"
        onClick={(e) => {
          if (hasProgress) {
            e.preventDefault();
            setConfirmando(true);
          }
        }}
        aria-label={compact ? 'Salir del recorrido y volver al inicio' : undefined}
        className={`inline-flex items-center gap-2 rounded-lg text-[14px] font-semibold text-[var(--text-primary)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
          compact ? 'size-11 justify-center' : 'py-3'
        }`}
      >
        {compact ? (
          <X size={22} strokeWidth={2.25} aria-hidden="true" className="text-[var(--text-secondary)]" />
        ) : (
          <>
            <BrandMark size={24} />
            {MARCA.nombre}
          </>
        )}
      </Link>

      <AnimatePresence>
        {confirmando && <ExitDialog onStay={() => setConfirmando(false)} onLeave={() => router.push('/')} />}
      </AnimatePresence>
    </>
  );
}

function ExitDialog({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  const reduce = useReducedMotionSafe();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  const onStayRef = useRef(onStay);
  useEffect(() => {
    onStayRef.current = onStay;
  });

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    stayRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onStayRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button, [href]'));
      if (focusables.length === 0) return;
      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      const activo = document.activeElement;
      if (e.shiftKey && (activo === primero || !panelRef.current.contains(activo))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (activo === ultimo || !panelRef.current.contains(activo))) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previo?.focus?.();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onStay();
      }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_oklab,var(--text-primary)_45%,transparent)] p-4 sm:items-center"
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: reduce ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reduce ? 0 : 16 }}
        transition={{ duration: reduce ? 0.15 : 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[360px] rounded-[var(--radius-card)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-2)]"
      >
        <h2 id={titleId} className="text-[18px] font-bold text-[var(--text-primary)] [font-family:var(--font-display)]">
          ¿Salir del recorrido?
        </h2>
        <p className="mt-2 text-[16px] leading-snug text-[var(--text-secondary)]">
          Tus respuestas quedan guardadas en este navegador, pero el recorrido se detiene aquí.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            ref={stayRef}
            type="button"
            onClick={onStay}
            className="flex h-12 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] bg-[image:var(--grad-cta)] text-[16px] font-semibold text-[var(--bg)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Seguir aquí
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="flex h-12 w-full items-center justify-center rounded-[var(--radius-button)] text-[16px] font-medium text-[var(--text-secondary)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Salir de todos modos
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── <TopProgress> — atrás (44×44 táctil) + barra fina animada + % real.
   Arranca en piso 8% (endowed progress) y NUNCA retrocede entre pantallas hacia
   adelante; el back SÍ revierte visualmente al volver. ── */
export function TopProgress({
  percent,
  onBack,
  showBack,
}: {
  percent: number;
  onBack?: () => void;
  showBack: boolean;
}) {
  const reduce = useReducedMotionSafe();
  return (
    <div className="flex min-h-11 items-center">
      {/* Con atrás oculto (pregunta 1) el hueco se cierra: la barra arranca en el margen de 16px. */}
      <motion.div
        initial={false}
        animate={{ width: showBack ? 56 : 0, opacity: showBack ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="shrink-0 overflow-hidden"
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Atrás"
          tabIndex={showBack ? 0 : -1}
          aria-hidden={showBack ? undefined : true}
          className="flex size-11 items-center justify-center rounded-full text-[var(--text-secondary)] focus-visible:outline-[3px] focus-visible:outline-[var(--accent)]"
        >
          <ChevronLeft size={22} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </motion.div>
      <div
        role="progressbar"
        aria-label="Avance del recorrido"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--text-tertiary)_14%,transparent)]"
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)] bg-[image:var(--grad-brand)]"
          animate={{ width: `${percent}%` }}
          transition={{ duration: reduce ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      {/* Sin "N%" escrito: el avance ya lo dicen la barra y el "N de 5 preguntas" (una sola señal, no cuatro) */}
    </div>
  );
}

/* ── Variants de transición entre pasos: sale a la izq/entra desde la der en
   avance; se invierte en retroceso. prefers-reduced-motion: solo cross-fade. ── */
export function useStepVariants(): Variants {
  const reduce = useReducedMotionSafe();
  return {
    enter: (dir: number) => ({ opacity: 0, x: reduce ? 0 : dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0, transition: { duration: reduce ? 0.2 : 0.25, ease: [0.16, 1, 0.3, 1] } },
    exit: (dir: number) => ({ opacity: 0, x: reduce ? 0 : dir > 0 ? -24 : 24, transition: { duration: 0.2 } }),
  };
}

/* ── <StepFrame> — envoltorio de cada pantalla del wizard: marca + progreso + AnimatePresence. ── */
export function StepFrame({
  direction,
  stepKey,
  percent,
  onBack,
  showBack,
  showProgress = true,
  hasProgress = false,
  children,
}: {
  direction: number;
  stepKey: string | number;
  percent: number;
  onBack?: () => void;
  showBack: boolean;
  showProgress?: boolean;
  hasProgress?: boolean;
  children: ReactNode;
}) {
  const variants = useStepVariants();
  const contenido = useRef<HTMLDivElement>(null);
  const primeraVez = useRef(true);
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden px-4 pt-3 md:my-8 md:min-h-[calc(100dvh-64px)] md:rounded-[var(--radius-card)] md:shadow-[var(--shadow-2)] md:ring-1 md:ring-[color-mix(in_oklab,var(--text-tertiary)_14%,transparent)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: FUNNEL_BG }} />
      {showProgress ? (
        <div className="mb-2 flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <TopProgress percent={percent} onBack={onBack} showBack={showBack} />
          </div>
          <FunnelBrand hasProgress={hasProgress} compact />
        </div>
      ) : (
        <FunnelBrand hasProgress={hasProgress} />
      )}
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={stepKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          ref={contenido}
          onAnimationComplete={(def) => {
            // Al cambiar de pregunta el foco pasa al título nuevo (lectores de pantalla y teclado),
            // salvo que ya haya un campo con foco (autoFocus de nombre y medicamento).
            if (def !== 'center') return;
            if (primeraVez.current) {
              primeraVez.current = false;
              return;
            }
            if (document.activeElement instanceof HTMLInputElement) return;
            contenido.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
          }}
          className="flex flex-1 flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

/* ── <StepDatum> — el dispositivo ownable de la ficha (dato-héroe gigante con mancha radial
   cálida detrás) llevado al recorrido: el número de la pregunta. Misma altura en todos los
   pasos, así el título no salta de un paso a otro. ── */
export function StepDatum({ paso, total }: { paso: number; total: number }) {
  return (
    <div className="relative isolate mt-1 flex h-11 items-center gap-3" role="img" aria-label={`Pregunta ${paso} de ${total}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -z-10 size-36"
        style={{
          left: -36,
          top: -48,
          background: 'radial-gradient(closest-side, color-mix(in oklab, var(--accent-warm) 22%, transparent) 0%, transparent 100%)',
        }}
      />
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-full text-[22px] font-bold leading-none tabular-nums text-[var(--bg)] shadow-[0_8px_18px_-8px_color-mix(in_oklab,var(--accent)_60%,transparent)] [font-family:var(--font-display)]"
        style={{ background: 'var(--grad-brand)' }}
      >
        {paso}
      </span>
      <span aria-hidden="true" className="text-[14px] font-semibold text-[var(--text-secondary)]">
        de {total}
      </span>
    </div>
  );
}

/* ── <QuestionHeading> — display 28px/700 + micro-copy opcional.
   Con `paso` pinta arriba el dato-héroe de la pregunta. ── */
export function QuestionHeading({
  title,
  micro,
  paso,
  total = 5,
}: {
  title: ReactNode;
  micro?: ReactNode;
  paso?: number;
  total?: number;
}) {
  return (
    <div className="mt-2 mb-7">
      {paso !== undefined && <StepDatum paso={paso} total={total} />}
      <h1
        tabIndex={-1}
        className="mt-3 text-balance text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-[var(--text-primary)] outline-none [font-family:var(--font-display)]"
      >
        {title}
      </h1>
      {micro && <p className="mt-2 text-[16px] leading-snug text-[var(--text-secondary)]">{micro}</p>}
    </div>
  );
}

/* ── <ChipOption> — selección única, ancho completo, 60px, check + anillo de acento + fondo
   al seleccionar. Sin borde duro: la elevación es sombra tintada de 2 capas
   Ícono opcional 22px a la izquierda (Lucide, jamás emoji). ── */
export function ChipOption({
  label,
  icon: Icono,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  icon?: LucideIcon;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const reduce = useReducedMotionSafe();
  return (
    <motion.button
      type="button"
      whileTap={disabled || reduce ? undefined : { scale: 0.98 }}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex min-h-[60px] w-full items-center gap-3 rounded-[var(--radius-button)] px-5 py-4 text-left transition-[background-color,box-shadow] duration-150 [touch-action:manipulation] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
        selected
          ? 'bg-[var(--chip-bg)] shadow-[0_0_0_2px_var(--accent),0_8px_20px_-6px_color-mix(in_oklab,var(--accent)_30%,transparent)]'
          : 'bg-[var(--surface)] shadow-[var(--shadow-soft)]'
      }`}
    >
      {Icono && (
        <span
          aria-hidden="true"
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
            selected ? 'bg-[color-mix(in_oklab,var(--accent)_16%,transparent)]' : 'bg-[var(--surface-2)]'
          }`}
        >
          <Icono size={20} strokeWidth={2} color={selected ? 'var(--accent)' : 'var(--text-secondary)'} aria-hidden="true" />
        </span>
      )}
      <span className="flex-1 self-center text-[16px] font-medium leading-snug text-[var(--text-primary)]">{label}</span>
      {!selected && (
        <ChevronRight size={20} aria-hidden="true" className="shrink-0 self-center text-[var(--text-secondary)]" />
      )}
      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex size-5 shrink-0 items-center justify-center self-center rounded-full bg-[var(--accent)]"
          >
            <Check size={13} strokeWidth={3} color="var(--bg)" aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ── <SkipLink> — salida explícita de una pregunta (flexibilidad): sigue sin guardar nada. ── */
export function SkipLink({ onClick, children = 'Prefiero responder después' }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto mt-2 flex min-h-11 items-center rounded-full px-4 text-[16px] font-medium text-[var(--text-secondary)] underline underline-offset-4 [touch-action:manipulation] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      {children}
    </button>
  );
}

/* ── <ChipList> — stagger de entrada 50-60ms entre chips. ── */
export function ChipList({ children }: { children: ReactNode }) {
  const reduce = useReducedMotionSafe();
  const contenedor: Variants = { hidden: {}, visible: { transition: { staggerChildren: reduce ? 0 : 0.055 } } };
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };
  return (
    <motion.div variants={contenedor} initial="hidden" animate="visible" className="flex flex-col gap-3 px-[2px] py-[2px]">
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div key={i} variants={item}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}

/* ── <TextField> — input libre 56px con label accesible (visible solo para lectores de
   pantalla: la pregunta de arriba ya es la etiqueta visual), sin borde duro (elevación por
   sombra de 2 capas) y error DEBAJO del campo con aria-invalid/aria-describedby.
   onEnter dispara el CTA con la tecla Enter (heurística 7). ── */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoFocus,
  inputMode,
  onEnter,
  error,
  hint,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  onEnter?: () => void;
  error?: string;
  /** Ayuda bajo el campo (qué pasa si se deja vacío, formato, etc.). Se oculta cuando hay error. */
  hint?: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block px-2 text-[14px] font-semibold text-[var(--text-secondary)]">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnter?.();
        }}
        placeholder={placeholder}
        type={type}
        inputMode={inputMode}
        autoFocus={autoFocus}
        maxLength={60}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`h-14 w-full rounded-[var(--radius-button)] bg-[var(--surface)] px-5 text-[16px] text-[var(--text-primary)] outline-none transition-shadow duration-150 placeholder:text-[color-mix(in_oklab,var(--text-tertiary)_78%,var(--surface))] ${
          error
            ? 'shadow-[0_0_0_2px_var(--error-text)] focus:shadow-[0_0_0_2px_var(--error-text)]'
            : 'shadow-[var(--shadow-soft)] focus:shadow-[0_0_0_2px_var(--accent),0_8px_20px_-6px_color-mix(in_oklab,var(--accent)_30%,transparent)]'
        }`}
      />
      {hint && !error && (
        <p id={hintId} className="mt-2 px-2 text-[16px] leading-snug text-[var(--text-secondary)]">
          {hint}
        </p>
      )}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={errorId}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 flex items-start gap-1.5 px-2 text-[16px] leading-snug text-[var(--error-text)]"
          >
            <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── <QuickChips> — atajos de una pulsación que RELLENAN un campo (no avanzan solos). Cada uno
   lleva un rótulo y su valor; el que coincide con lo escrito se ve seleccionado. 2 líneas, 56px. ── */
export function QuickChips({
  legend,
  options,
  value,
  onPick,
}: {
  legend: string;
  options: { label: string; value: string }[];
  value: string;
  onPick: (v: string) => void;
}) {
  const reduce = useReducedMotionSafe();
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 px-2 text-[14px] font-medium text-[var(--text-secondary)]">{legend}</legend>
      <div className="grid grid-cols-3 gap-2 px-[2px] py-[2px]">
        {options.map((o) => {
          const selected = value.trim().toLowerCase() === o.value.toLowerCase();
          return (
            <motion.button
              key={o.label}
              type="button"
              whileTap={reduce ? undefined : { scale: 0.97 }}
              onClick={() => onPick(o.value)}
              aria-pressed={selected}
              className={`flex min-h-14 flex-col items-center justify-center rounded-[var(--radius-button)] px-2 py-2 text-center transition-[background-color,box-shadow] duration-150 [touch-action:manipulation] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                selected
                  ? 'bg-[var(--chip-bg)] shadow-[0_0_0_2px_var(--accent)]'
                  : 'bg-[var(--surface)] shadow-[var(--shadow-soft)]'
              }`}
            >
              <span className="text-[14px] font-semibold leading-tight text-[var(--text-primary)]">{o.label}</span>
              <span className="text-[14px] leading-tight text-[var(--text-secondary)]">{o.value}</span>
            </motion.button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ── <PrivacyNote> — línea de calma al pie de las preguntas de selección: llena el aire
   con una promesa real (las respuestas solo arman el plan) en vez de vacío muerto. ── */
export function PrivacyNote({ pegada = false }: { pegada?: boolean }) {
  return (
    <p className={`${pegada ? 'mt-3' : 'mt-auto'} flex items-start justify-center gap-1.5 pt-6 pb-[max(20px,env(safe-area-inset-bottom))] text-center text-[16px] text-[var(--text-secondary)]`}>
      <Lock size={14} aria-hidden="true" className="mt-[5px] shrink-0" />
      <span className="text-balance">Solo usamos tus respuestas para armar tu plan.</span>
    </p>
  );
}

/* ── <FixedCta> — CTA fijo abajo con safe-area. SIEMPRE vivo (acento pleno):
   el gate "CTA héroe vivo" del núcleo de cierre prohíbe el estado gris apagado por
   defecto. El tap SIEMPRE dispara onClick; la
   validación de campos vacíos la hace el padre mostrando el error junto al campo
   (TextField), nunca apagando el botón. */
export function FixedCta({
  label,
  onClick,
  loading,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
}) {
  const reduce = useReducedMotionSafe();
  return (
    <div className="mt-auto pt-6 pb-[max(16px,env(safe-area-inset-bottom))]">
      <motion.button
        type="button"
        whileTap={reduce ? undefined : { scale: 0.97 }}
        onClick={onClick}
        disabled={loading}
        className="flex h-14 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] bg-[image:var(--grad-cta)] text-[18px] font-semibold text-[var(--bg)] shadow-[0_8px_30px_color-mix(in_oklab,var(--accent)_25%,transparent)] transition-opacity [touch-action:manipulation] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-80"
      >
        {loading ? 'Un momento…' : label}
      </motion.button>
    </div>
  );
}

/** Hook de auto-avance: selecciona visualmente, pausa 300ms bloqueando doble-tap, avanza. */
export function useAutoAdvance(onAdvance: () => void) {
  const lockRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const cancel = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    lockRef.current = false;
  };
  // Si la pantalla se cierra durante la pausa de 300 ms, no se avanza nada.
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    []
  );
  const run = (value: string, setSelected: (v: string) => void) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setSelected(value);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onAdvance();
      lockRef.current = false;
    }, 300);
  };
  // "Atrás" dentro de esa ventana cancela el avance pendiente (si no, terminaba avanzando).
  return { run, cancel };
}
