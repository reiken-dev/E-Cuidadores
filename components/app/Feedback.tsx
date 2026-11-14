'use client';

// AVISOS DE LA APP: mensajes breves (con "Deshacer" opcional) y el momento discreto de
// confirmar una dosis (check suave con el nombre de quien la dio). Nada de confeti ni culpa.
// Ambos se anuncian con aria-live y se pueden cerrar tocando.

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Info } from 'lucide-react';
import { useReducedMotionSafe } from '@/components/landing/ui';

interface ToastState {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}
interface MomentState {
  id: number;
  title: string;
  body: string;
}

interface FeedbackApi {
  notify: (message: string, action?: { label: string; onClick: () => void }) => void;
  celebrate: (title: string, body: string) => void;
}

const Ctx = createContext<FeedbackApi>({ notify: () => {}, celebrate: () => {} });

export function useFeedback(): FeedbackApi {
  return useContext(Ctx);
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotionSafe();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [moment, setMoment] = useState<MomentState | null>(null);
  const seq = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const momentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback<FeedbackApi['notify']>((message, action) => {
    seq.current += 1;
    setToast({ id: seq.current, message, action });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), action ? 7000 : 4500);
  }, []);

  const celebrate = useCallback<FeedbackApi['celebrate']>((title, body) => {
    seq.current += 1;
    setMoment({ id: seq.current, title, body });
    if (momentTimer.current) clearTimeout(momentTimer.current);
    momentTimer.current = setTimeout(() => setMoment(null), 3200);
  }, []);

  const api = useMemo(() => ({ notify, celebrate }), [notify, celebrate]);

  return (
    <Ctx.Provider value={api}>
      {children}

      {/* Mensaje breve, sobre la barra inferior */}
      <div
        aria-live="polite"
        className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[60] mx-auto flex w-full max-w-lg justify-center px-4"
      >
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-[var(--text-primary)] py-3 pr-2 pl-4 text-[var(--bg)] shadow-[var(--shadow-2)]"
            >
              <Info size={18} className="shrink-0" aria-hidden="true" />
              <p className="t-body min-w-0 flex-1">{toast.message}</p>
              {toast.action ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    setToast(null);
                  }}
                  className="t-btn h-11 shrink-0 rounded-[var(--radius-button)] px-4 text-[var(--bg)] underline underline-offset-4 [touch-action:manipulation]"
                >
                  {toast.action.label}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="t-btn h-11 shrink-0 px-4 text-[var(--bg)] [touch-action:manipulation]"
                >
                  Cerrar
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Momento de confirmar: check suave con el nombre de quien la dio */}
      <div
        role="status"
        className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-[60] mx-auto flex w-full max-w-lg justify-center px-4"
      >
        <AnimatePresence>
          {moment && (
            <motion.button
              key={moment.id}
              type="button"
              onClick={() => setMoment(null)}
              aria-label={`${moment.title} ${moment.body}. Toca para cerrar.`}
              initial={{ opacity: 0, y: reduce ? 0 : 24, scale: reduce ? 1 : 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduce ? 0 : 8 }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.25 }}
              className="pointer-events-auto flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-[color-mix(in_oklab,var(--ok)_18%,var(--surface))] px-4 py-3 text-left shadow-[var(--shadow-2)] ring-1 ring-[color-mix(in_oklab,var(--ok)_55%,transparent)]"
            >
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--ok)_30%,var(--surface))]"
              >
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="var(--ok-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    initial={{ pathLength: reduce ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : 0.15, ease: [0.16, 1, 0.3, 1] }}
                  />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="t-body ff-display block font-bold text-[var(--text-primary)]">{moment.title}</span>
                <span className="t-body block text-[var(--text-primary)]">{moment.body}</span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
