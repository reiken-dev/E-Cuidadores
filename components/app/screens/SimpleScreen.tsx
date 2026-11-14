'use client';

// MODO SIMPLE — la app vista por el propio adulto mayor. Letra muy grande (26 px y 44 px), alto
// contraste y UNA sola acción: "Ya la tomé". La confirmación queda a nombre del familiar y todos
// los hermanos la ven. Sin barra inferior.

import { sincroTexto } from '@/lib/oferta';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, CalendarClock, Check, Pill as PillIcon } from 'lucide-react';
import { useReducedMotionSafe } from '@/components/landing/ui';
import { atTime, cap, fmtLongDate, fmtTime, keyFromMs, relativeDay } from '@/lib/dates';
import { nameOf, nextDoseInfo, type DoseInstance } from '@/lib/schedule';
import { actions, useAppData, useNow } from '@/lib/store';
import { SELF_ID } from '@/lib/types';

export default function SimpleScreen() {
  const data = useAppData();
  const now = useNow();
  const router = useRouter();
  const reduce = useReducedMotionSafe();
  const [hecho, setHecho] = useState<DoseInstance | null>(null);

  const hoyK = keyFromMs(now);
  const info = nextDoseInfo(data, now);
  const nombre = data.profile.name;
  const faltaMucho = !!info.next && info.next.at - now > 2 * 3600000;
  const cita = [...data.appts]
    .filter((a) => a.status === 'pendiente' && atTime(a.date, a.time) >= now - 2 * 3600000)
    .sort((a, b) => atTime(a.date, a.time) - atTime(b.date, b.time))[0];

  // El modo simple es una PANTALLA, no una preferencia que se queda guardada: al salir por cualquier
  // camino (botón "Volver", atrás del navegador, otro enlace) el interruptor de Familia vuelve a apagado.
  useEffect(
    () => () => {
      actions.updateSettings({ simpleMode: false });
    },
    []
  );

  function volver() {
    router.push('/app');
  }

  function yaLaTome() {
    const d = info.next;
    if (!d) return;
    if (actions.confirmDose({ medId: d.med.id, date: d.date, time: d.time, byId: SELF_ID })) setHecho(d);
  }

  function meEquivoque() {
    if (!hecho) return;
    actions.undoDose(hecho.med.id, hecho.date, hecho.time);
    setHecho(null);
  }

  const entrada = {
    initial: { opacity: 0, y: reduce ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
  };

  return (
    <div className="flex min-h-[calc(100dvh-48px)] flex-col gap-6">
      <div>
        <button
          type="button"
          onClick={volver}
          className="t-body inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] pr-4 font-medium text-[var(--text-secondary)] [touch-action:manipulation]"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Volver
        </button>
      </div>

      <header>
        <h1 className="s-hero text-[var(--text-primary)]">Hola, {nombre}</h1>
        <p className="s-body mt-2 text-[var(--text-primary)]">{cap(fmtLongDate(hoyK))}</p>
      </header>

      <motion.section
        {...entrada}
        aria-live="polite"
        className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] p-6 shadow-[var(--shadow-2)] ring-2 ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full"
          style={{ background: 'radial-gradient(closest-side, color-mix(in oklab, var(--accent) 18%, transparent), transparent)' }}
        />
        {hecho ? (
          <div className="relative flex flex-col gap-4">
            <span
              aria-hidden="true"
              className="flex size-20 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--ok)_26%,transparent)]"
            >
              <Check size={44} strokeWidth={3} color="var(--ok-text)" />
            </span>
            <p className="s-hero text-[var(--text-primary)]">Muy bien, {nombre}.</p>
            <p className="s-body text-[var(--text-primary)]">
              Quedó anotado que tomaste {hecho.med.name}.{sincroTexto(' Tu familia lo verá al abrir la app.', ' Quedó con tu nombre y la hora.')}
            </p>
            <button
              type="button"
              onClick={() => setHecho(null)}
              className="s-btn mt-2 flex h-24 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] text-[var(--bg)] [touch-action:manipulation]"
            >
              Listo
            </button>
            <button
              type="button"
              onClick={meEquivoque}
              className="s-body min-h-14 w-full rounded-[var(--radius-button)] font-medium text-[var(--text-secondary)] underline underline-offset-4 [touch-action:manipulation]"
            >
              Me equivoqué, todavía no
            </button>
          </div>
        ) : info.next ? (
          <div className="relative flex flex-col gap-4">
            <p className="s-body text-[var(--text-secondary)]">
              {info.next.status === 'atrasada' ? 'Tu pastilla que falta' : 'Tu próxima pastilla'}
            </p>
            <div>
              <p className="s-hero text-[var(--text-primary)]">{info.next.med.name}</p>
              <p className="s-hero mt-2 text-[var(--accent)]">a las {fmtTime(info.next.time)}</p>
            </div>
            <p className="s-body text-[var(--text-primary)]">
              {[info.next.med.dose, info.next.med.notes].filter(Boolean).join('. ')}
            </p>
            {faltaMucho ? (
              // Nunca se anota una pastilla que todavía no toca: el botón aparece 2 horas antes.
              <p className="s-body mt-2 rounded-[var(--radius-card)] bg-[var(--surface-2)] p-5 text-[var(--text-primary)]">
                Todavía falta para tu pastilla. El botón aparece 2 horas antes.
              </p>
            ) : (
              <button
                type="button"
                onClick={yaLaTome}
                className="s-btn mt-2 flex h-28 w-full items-center justify-center gap-4 rounded-[var(--radius-button)] bg-[var(--accent)] text-[var(--bg)] shadow-[0_8px_24px_color-mix(in_oklab,var(--accent)_28%,transparent)] transition-transform duration-150 active:scale-[0.98] [touch-action:manipulation]"
              >
                <Check size={40} strokeWidth={3} aria-hidden="true" />
                Ya la tomé
              </button>
            )}
          </div>
        ) : (
          <div className="relative flex flex-col gap-4">
            <span
              aria-hidden="true"
              className="flex size-20 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--ok)_26%,transparent)]"
            >
              <PillIcon size={40} color="var(--ok-text)" />
            </span>
            <p className="s-hero text-[var(--text-primary)]">
              {info.total === 0 ? 'Hoy no tomas pastillas.' : 'Ya tomaste todo por hoy.'}
            </p>
            <p className="s-body text-[var(--text-primary)]">
              {info.upcoming
                ? `Lo que sigue: ${info.upcoming.med.name}, ${relativeDay(info.upcoming.date, hoyK).toLowerCase()} a las ${fmtTime(info.upcoming.time)}`
                : 'Gracias por cuidarte.'}
            </p>
          </div>
        )}
      </motion.section>

      {cita && (
        <motion.section {...entrada} transition={{ ...entrada.transition, delay: reduce ? 0 : 0.1 }} className="flex items-start gap-4 rounded-[var(--radius-card)] bg-[var(--surface)] p-6 shadow-[var(--shadow-1)] ring-1 ring-[color-mix(in_oklab,var(--text-tertiary)_25%,transparent)]">
          <CalendarClock size={36} aria-hidden="true" className="mt-1 shrink-0 text-[var(--accent)]" />
          <p className="s-body text-[var(--text-primary)]">
            <span className="text-[var(--text-secondary)]">Tu próxima cita: </span>
            {relativeDay(cita.date, hoyK).toLowerCase()}
            , {fmtTime(cita.time)}, con {cita.specialist}.
            {cita.attendeeId ? ` Te acompaña ${nameOf(data, cita.attendeeId)}.` : ''}
          </p>
        </motion.section>
      )}
    </div>
  );
}
