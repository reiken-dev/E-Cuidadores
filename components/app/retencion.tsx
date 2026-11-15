'use client';

// PIEZAS DE RETENCIÓN de la app interna: la semana del círculo en una mirada, lo que pasó mientras no
// estabas y el aviso de pago pendiente. Todo sale de lo que la familia ya registró (lib/retencion.ts).
// Tono: calmado y agradecido. Nunca culpa, nunca "nos abandonaste".

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, ChevronRight, HeartHandshake, Sparkles } from 'lucide-react';
import { Card, TapLink } from '@/components/app/ui';
import { useReducedMotionSafe } from '@/components/landing/ui';
import { MARCA } from '@/lib/marca';
import { datosTexto, sincroTexto } from '@/lib/oferta';
import { track } from '@/lib/analytics';
import { addDays, fmtClock, keyFromMs } from '@/lib/dates';
import { estadoDia, novedades, racha } from '@/lib/retencion';
import type { AppData } from '@/lib/types';

/* ── La semana en una mirada: siete puntos + la racha del círculo ── */
export function SemanaPuntos({ data, now, compacto = false }: { data: AppData; now: number; compacto?: boolean }) {
  const reduce = useReducedMotionSafe();
  const r = racha(data, now);
  const hoy = keyFromMs(now);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const k = addDays(hoy, i - 6);
    return { k, estado: estadoDia(data, k, now) };
  });
  if (data.meds.filter((m) => !m.paused).length === 0) return null;
  // Una sola frase por estado, sin presión por la racha perdida.
  const texto =
    r.dias >= 2 ? `${r.dias} días con todo anotado` : r.dias === 1 ? '1 día con todo anotado' : 'Tu semana';
  return (
    <TapLink
      href="/app/semana"
      aria-label={`${texto}. Abrir la semana del círculo`}
      className={
        compacto
          ? 'flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] px-2'
          : 'mt-2 flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-card)] bg-[var(--surface)] px-4 py-2 shadow-[var(--shadow-1)] ring-1 ring-[color-mix(in_oklab,var(--accent)_14%,transparent)]'
      }
    >
      <span aria-hidden="true" className={`flex items-center ${compacto ? 'gap-0.5' : 'gap-1.5'}`}>
        {dias.map((d, i) => (
          <motion.span
            key={d.k}
            initial={{ scale: reduce ? 1 : 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: reduce ? 0 : i * 0.04, duration: 0.25 }}
            className={`block ${compacto ? 'size-2' : 'size-3'} rounded-full ${
              d.estado === 'completo'
                ? 'shadow-[0_2px_6px_-1px_color-mix(in_oklab,var(--accent)_60%,transparent)]'
                : d.estado === 'abierto'
                  ? 'bg-transparent ring-2 ring-[var(--accent)]'
                  : d.estado === 'incompleto'
                    ? 'bg-[color-mix(in_oklab,var(--text-tertiary)_30%,transparent)]'
                    : 'size-1.5 bg-[color-mix(in_oklab,var(--text-tertiary)_22%,transparent)]'
            }`}
            style={d.estado === 'completo' ? { background: 'var(--grad-brand)' } : undefined}
          />
        ))}
      </span>
      <span className={`t-body min-w-0 break-words font-semibold text-[var(--text-primary)] ${compacto ? '' : 'flex-1'}`}>
        {texto}
      </span>
      {!compacto && <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-[var(--text-secondary)]" />}
    </TapLink>
  );
}

/* ── Mientras no estabas: lo que hicieron los demás, contado con gratitud ── */
export function NovedadesCard({
  data,
  now,
  desde,
  proxima,
  onCerrar,
}: {
  data: AppData;
  now: number;
  desde: number;
  /** Texto de lo siguiente que toca (para retomar con calma tras una ausencia larga). */
  proxima?: string;
  onCerrar: () => void;
}) {
  const n = novedades(data, desde, now);
  useEffect(() => {
    if (n) track('novedades_vistas', { reingreso: n.reingreso });
    // Solo al mostrarse por primera vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!n]);
  if (!n) return null;
  const partes: string[] = [];
  const unaSola = n.dosis.length === 1 && n.dosis[0].n === 1 && n.ultima;
  if (unaSola && n.ultima) partes.push(`${n.ultima.nombre} dio ${n.ultima.medicina} ${keyFromMs(n.ultima.at) === keyFromMs(now) ? 'hoy' : keyFromMs(n.ultima.at) === addDays(keyFromMs(now), -1) ? 'ayer' : 'hace unos días'} a las ${fmtClock(n.ultima.at).replace(' ', '\u00a0')}`);
  else for (const d of n.dosis.slice(0, 3)) partes.push(`${d.nombre} dio ${d.n === 1 ? 'una dosis' : `${d.n} dosis`}`);
  if (n.omitidas > 0) partes.push(`${n.omitidas === 1 ? 'se anotó 1 dosis' : `se anotaron ${n.omitidas} dosis`} como no dada${n.omitidas === 1 ? '' : 's'}`);
  if (n.notas.length > 0) partes.push(`${n.notas.length === 1 ? 'hay 1 novedad nueva' : `hay ${n.notas.length} novedades nuevas`} en la bitácora`);
  const titulo = n.reingreso ? 'Qué bueno verte de nuevo' : 'Mientras no estabas';
  return (
    <section
      aria-labelledby="novedades"
      className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--grad-soft)] px-4 py-2 ring-1 ring-[color-mix(in_oklab,var(--accent)_16%,transparent)]"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--bg)]" style={{ background: 'var(--grad-brand)' }}>
          <HeartHandshake size={16} />
        </span>
        <h2 id="novedades" className="t-body min-w-0 flex-1 font-semibold text-[var(--text-primary)]">
          {titulo}
        </h2>
        <button type="button" onClick={onCerrar} className="t-btn -mr-2 min-h-11 px-2 font-semibold text-[var(--text-secondary)] [touch-action:manipulation]">
          Entendido
        </button>
      </div>
      <ul className="t-body mt-1 flex flex-col gap-0.5 pb-2 pl-11 text-[var(--text-secondary)]">
        {partes.map((p) => {
          const frase = p.charAt(0).toUpperCase() + p.slice(1);
          // "p. m." y "a. m." ya terminan en punto: no añadimos otro.
          return <li key={p}>{/\.$/.test(frase) ? frase : `${frase}.`}</li>;
        })}
      </ul>
      {(n.reingreso && proxima) || n.notas.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 pb-1 pl-11">
          {n.reingreso && proxima && <p className="t-body font-medium text-[var(--text-primary)]">Para retomar: {proxima}</p>}
          {n.notas.length > 0 && (
            <TapLink href="/app/bitacora" className="t-label flex min-h-11 items-center font-semibold text-[var(--accent-strong)] underline underline-offset-4">
              Ver la bitácora
            </TapLink>
          )}
        </div>
      ) : null}
    </section>
  );
}

/** Qué pasa cuando la suscripción ya no está activa (la base deja el círculo de solo lectura: se lee y se descarga, no se escribe). */
export const TEXTO_SUSCRIPCION_INACTIVA =
  'Lo que anotaron sigue guardado en tu cuenta y pueden consultarlo y descargarlo, pero no se podrán agregar cambios hasta que se reactive el acceso.';

/* ── Aviso de pago pendiente: claro, sin alarma y sin amenazar con perder los datos ── */
export function PlanBanner({ data }: { data: AppData }) {
  const pendiente = data.plan.estado === 'pago_pendiente';
  const inactiva = data.plan.motivo === 'inactiva'; // vencida, cancelada o reembolsada: el círculo está de solo lectura
  useEffect(() => {
    if (pendiente) track('pago_pendiente_visto');
  }, [pendiente]);
  if (!pendiente) return null;
  const href = MARCA.panelComprasUrl ?? '/app/plan';
  return (
    <div
      role="status"
      className="no-print mb-3 flex items-start gap-3 rounded-[var(--radius-card)] bg-[color-mix(in_oklab,var(--warn)_20%,var(--surface))] p-4 text-[var(--text-primary)] ring-1 ring-[color-mix(in_oklab,var(--warn)_45%,transparent)]"
    >
      <AlertCircle size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--warn-text)]" />
      <div className="min-w-0 flex-1">
        <p className="t-body font-semibold">{inactiva ? 'Tu suscripción no está activa' : 'No pudimos cobrar tu último pago'}</p>
        <p className="t-body mt-0.5 text-[var(--text-secondary)]">
          {inactiva ? TEXTO_SUSCRIPCION_INACTIVA : 'Actualiza tu medio de pago en Hotmart para mantener el acceso. '}
          {!inactiva && datosTexto(
            'Lo que anotaron sigue guardado en tu cuenta, y este cobro no borra nada. Si el acceso se suspende, podrán seguir consultándolo y descargarlo.',
            sincroTexto('Lo que anotaron sigue guardado, y este cobro no borra nada.', 'Lo que anotaron se guarda en este dispositivo, y este cobro no borra nada.')
          )}
        </p>
        <TapLink href={href} className="t-label mt-1 inline-flex min-h-11 items-center font-semibold text-[var(--accent-strong)] underline underline-offset-4">
          {inactiva ? 'Reactivar mi acceso en Hotmart' : 'Actualizar el medio de pago'}
        </TapLink>
      </div>
    </div>
  );
}

/* ── Hito: pieza pequeña reutilizable (Semana) ── */
export function HitoChip({ titulo }: { titulo: string }) {
  return (
    <span className="t-label inline-flex items-center gap-1.5 rounded-full bg-[var(--chip-bg)] px-3 py-1.5 font-semibold text-[var(--accent-strong)]">
      <Sparkles size={14} aria-hidden="true" />
      {titulo}
    </span>
  );
}

/* ── Los primeros 30 días: la guía que convierte una compra en un hábito ── */
export function PrimerosPasos({ data, titulo }: { data: AppData; titulo: string }) {
  const pasos = [
    { ok: data.doses.some((d) => !d.skipped), t: 'Confirmar tu primera dosis', href: '/app' },
    { ok: data.members.length >= 2, t: 'Invitar a un hermano', href: '/app/familia?invitar=1' },
    { ok: data.appts.length > 0, t: 'Agregar la próxima cita', href: '/app/citas' },
    { ok: data.notes.length > 0, t: 'Escribir una novedad', href: '/app/bitacora' },
  ];
  const hechos = pasos.filter((p) => p.ok).length;
  if (hechos === pasos.length) return null;
  return (
    <Card as="section" className="p-5">
      <h2 className="t-body font-semibold text-[var(--text-primary)]">{titulo}</h2>
      <p className="t-body text-[var(--text-secondary)]">{hechos} de {pasos.length}: así se vuelve un hábito del círculo</p>
      <ul className="mt-3 flex flex-col">
        {pasos.map((p) => (
          <li key={p.t} className="border-t border-[color-mix(in_oklab,var(--text-tertiary)_14%,transparent)] first:border-t-0">
            <a href={p.href} className="flex min-h-11 items-center gap-3 py-2 [touch-action:manipulation]">
              <CheckCircle2 size={20} aria-hidden="true" className={p.ok ? 'text-[var(--ok-text)]' : 'text-[var(--text-tertiary)] opacity-60'} />
              <span className={`t-body ${p.ok ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}`}>{p.t}</span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

