'use client';

// CASCARÓN DE LA APP INTERNA: fondo con profundidad, columna centrada, barra inferior fija con las
// 5 secciones (Hoy, Medicinas, Citas, Bitácora, Familia), avisos y skeleton del primer paint.
// El modo simple (/app/simple) y el resumen para el médico (/app/resumen) no llevan barra inferior.

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { MotionConfig, motion } from 'motion/react';
import { Circulo } from '@/components/brand/Circulo';
import { useReducedMotionSafe } from '@/components/landing/ui';
import { usePathname } from 'next/navigation';
import { BookText, CalendarDays, House, Info, Pill, Users, X, type LucideIcon } from 'lucide-react';
import { FeedbackProvider } from './Feedback';
import { Card, Skeleton } from './ui';
import { PlanBanner } from './retencion';
import { nextDoseInfo } from '@/lib/schedule';
import { useAppData, useNow, useUiReady } from '@/lib/store';

const TABS: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: '/app', label: 'Hoy', icon: House, match: (p) => p === '/app' },
  { href: '/app/medicinas', label: 'Medicinas', icon: Pill, match: (p) => p.startsWith('/app/medicinas') },
  { href: '/app/citas', label: 'Citas', icon: CalendarDays, match: (p) => p.startsWith('/app/citas') },
  { href: '/app/bitacora', label: 'Bitácora', icon: BookText, match: (p) => p.startsWith('/app/bitacora') },
  { href: '/app/familia', label: 'Familia', icon: Users, match: (p) => p.startsWith('/app/familia') },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ready = useUiReady();
  const reduce = useReducedMotionSafe();
  const data = useAppData();
  const [avisoCerrado, setAvisoCerrado] = useState(false);
  const sinBarra = pathname.startsWith('/app/simple') || pathname.startsWith('/app/resumen');
  // Móvil: columna de 512 px. Desde tablet (768 px) el contenido aprovecha el ancho sin estirarse de más.
  const ancho = pathname.startsWith('/app/resumen') ? 'max-w-3xl' : 'max-w-lg md:max-w-3xl';

  // Movimiento reducido en TODA la app: con "reducir movimiento" el sistema no anima ni transforma
  // ni desvanece (skipAnimations) las piezas de motion de /app, incluidas las de los hijos.
  return (
    <MotionConfig reducedMotion="user" skipAnimations={reduce}>
      <FeedbackProvider>
        <div className="app-shell relative flex min-h-dvh flex-col overflow-x-clip">
          {/* Fondo con profundidad: dos luces radiales (coral y índigo) sobre la crema */}
          <div
            aria-hidden="true"
            className="no-print pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(560px 360px at 88% -6%, color-mix(in oklab, var(--accent) 11%, transparent) 0%, transparent 62%), ' +
                'radial-gradient(520px 380px at -6% 48%, color-mix(in oklab, var(--accent-2) 8%, transparent) 0%, transparent 58%)',
            }}
          />
          <Circulo simple size={560} className="no-print pointer-events-none absolute top-32 -left-52 -z-10 hidden opacity-50 lg:block" />
          <Circulo simple size={420} className="no-print pointer-events-none absolute -right-40 bottom-24 -z-10 hidden opacity-40 lg:block" />
          <a
            href="#contenido"
            className="no-print sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:flex focus:min-h-11 focus:items-center focus:rounded-[var(--radius-button)] focus:bg-[var(--surface)] focus:px-4 focus:py-3"
          >
            Ir al contenido
          </a>
          <main
            id="contenido"
            className={`mx-auto w-full flex-1 px-4 pt-4 ${ancho} ${
              sinBarra ? 'pb-[calc(24px+env(safe-area-inset-bottom))]' : 'pb-[calc(96px+env(safe-area-inset-bottom))]'
            }`}
          >
            {data.demo && !avisoCerrado && (
              <p
                role="status"
                data-captura="oculto"
                className="no-print t-body mb-3 flex w-full items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3 py-1.5 font-medium text-[var(--text-secondary)]"
              >
                <Info size={16} aria-hidden="true" className="shrink-0 text-[var(--accent)]" />
                Datos de ejemplo, no son de tu familiar
                <button
                  type="button"
                  onClick={() => setAvisoCerrado(true)}
                  aria-label="Cerrar aviso de datos de ejemplo"
                  className="-my-3 -mr-3 ml-auto flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)]"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </p>
            )}
            <PlanBanner data={data} />
            {ready ? (
              <motion.div
                key={pathname}
                initial={{ opacity: 0.5, y: reduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {children}
              </motion.div>
            ) : (
              <PageSkeleton pathname={pathname} />
            )}
          </main>
          {!sinBarra && <BottomNav pathname={pathname} ready={ready} />}
        </div>
      </FeedbackProvider>
    </MotionConfig>
  );
}

function BottomNav({ pathname, ready }: { pathname: string; ready: boolean }) {
  const reduceNav = useReducedMotionSafe();
  return (
    <nav
      aria-label="Secciones de la app"
      className="no-print linea-grad-top fixed inset-x-0 bottom-0 z-40 border-t border-[color-mix(in_oklab,var(--text-tertiary)_16%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex h-16 w-full max-w-lg items-stretch px-2 md:max-w-3xl">
        {TABS.map((t) => {
          const activo = t.match(pathname);
          return (
            <li key={t.href} className="min-w-0 flex-1">
              <Link prefetch={false}
                href={t.href}
                aria-current={activo ? 'page' : undefined}
                className="relative flex h-full min-h-11 flex-col items-center justify-center gap-1 [touch-action:manipulation]"
              >
                <span className="relative flex h-8 w-14 items-center justify-center rounded-full">
                  {activo && (
                    <motion.span
                      layoutId="tab-pill"
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-[var(--chip-bg)]"
                      transition={{ type: 'spring', bounce: 0.15, duration: reduceNav ? 0 : 0.25 }}
                    />
                  )}
                  <t.icon
                    size={22}
                    strokeWidth={activo ? 2.6 : 2}
                    color={activo ? 'var(--accent)' : 'var(--text-secondary)'}
                    aria-hidden="true"
                  />
                  {t.href === '/app' && !activo && ready && <AtrasoDot />}
                </span>
                <span
                  className={`t-label max-[359px]:text-[12px]! ${activo ? 'font-semibold text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
                >
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Puntito ámbar en "Hoy" cuando hay una dosis atrasada (con texto para lectores de pantalla). */
function AtrasoDot() {
  const data = useAppData();
  const now = useNow();
  const atrasada = nextDoseInfo(data, now).pending.some((d) => d.status === 'atrasada');
  if (!atrasada) return null;
  return (
    <>
      <span aria-hidden="true" className="absolute top-1 right-3 size-2.5 rounded-full bg-[var(--warn-text)] ring-2 ring-[var(--surface)]" />
      <span className="sr-only">Hay una dosis atrasada</span>
    </>
  );
}

/* ── Skeletons con la forma del contenido de cada sección ── */
function PageSkeleton({ pathname }: { pathname: string }) {
  const busy = { role: 'status' as const, 'aria-busy': true as const, 'aria-label': 'Cargando' };
  if (pathname.startsWith('/app/simple')) {
    return (
      <div {...busy} className="flex flex-col gap-6 pt-6">
        <Skeleton className="h-12 w-3/5 rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-[var(--radius-card)]" />
        <Skeleton className="h-20 w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }
  if (pathname.startsWith('/app/resumen')) {
    return (
      <div {...busy} className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/2 rounded-full" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />
        <Skeleton className="h-56 w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }
  if (pathname === '/app') {
    return (
      <div {...busy} className="flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-7 w-52 rounded-full" />
          </div>
          <Skeleton className="size-11 rounded-full" />
        </div>
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-36 rounded-full" />
              <Skeleton className="h-10 w-40 rounded-xl" />
            </div>
            <Skeleton className="size-16 rounded-full" />
          </div>
          <Skeleton className="h-6 w-1/2 rounded-full" />
          <Skeleton className="h-4 w-3/4 rounded-full" />
          <Skeleton className="h-14 w-full rounded-full" />
        </Card>
        <Skeleton className="h-48 w-full rounded-[var(--radius-card)]" />
        <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }
  return (
    <div {...busy} className="flex flex-col gap-4">
      <div className="flex items-center justify-between pb-2">
        <Skeleton className="h-9 w-40 rounded-full" />
        <Skeleton className="h-12 w-28 rounded-full" />
      </div>
      <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
      {[0, 1, 2].map((i) => (
        <Card key={i} className="flex gap-4 p-4">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-2/3 rounded-full" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-1/2 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}
