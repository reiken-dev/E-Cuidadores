'use client';

// HOY — la pantalla más vista (M0). UNA misión: la próxima dosis y quién se la da.
// Objeto principal: tarjeta héroe con la hora gigante y la mancha radial cálida (dispositivo ownable).
// Debajo: la línea del día, la próxima cita y la última novedad de la bitácora.

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Clock3,
  Minus,
  ChevronRight,
  MapPin,
  Pill as PillIcon,
  Sparkles,
} from 'lucide-react';
import { Avatar, Btn, Card, CountUp, EmptyState, LinkBtn, Pill, ProgressRing, TapLink, memberTone } from '@/components/app/ui';
import { useReducedMotionSafe } from '@/components/landing/ui';
import { ConfirmDoseSheet } from '@/components/app/ConfirmDoseSheet';
import { EscenaPastilla } from '@/components/brand/Escenas';
import { useFeedback } from '@/components/app/Feedback';
import { atTime, cap, fmtClock, fmtLongDate, fmtTime, keyFromMs, relativeDay } from '@/lib/dates';
import { apptTone, daysUntilLabel, giverFor, nameOf, nextDoseInfo, type DoseInstance } from '@/lib/schedule';
import { actions, useAppData, useNow, useSeenBefore, useUiReady } from '@/lib/store';
import { sincroTexto } from '@/lib/oferta';
import { NovedadesCard, PrimerosPasos, SemanaPuntos } from '@/components/app/retencion';
import { diasDeSuscripcion, hitosNuevos, novedades } from '@/lib/retencion';
import { track } from '@/lib/analytics';
import { SKIP_REASONS } from '@/lib/types';
import type { MemberTone } from '@/lib/types';

function saludo(now: number): string {
  const h = new Date(now).getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export default function HoyScreen() {
  const data = useAppData();
  const now = useNow();
  const reduce = useReducedMotionSafe();
  const { notify, celebrate } = useFeedback();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<DoseInstance | null>(null);
  const ready = useUiReady();
  const desde = useSeenBefore();
  const [novedadesCerradas, setNovedadesCerradas] = useState(false);

  const hoyK = keyFromMs(now);
  const yo = data.members.find((m) => m.id === data.currentUserId) ?? data.members[0];
  const info = nextDoseInfo(data, now);
  const activas = data.meds.filter((m) => !m.paused);

  const proximaCita = [...data.appts]
    .filter((a) => a.status === 'pendiente' && atTime(a.date, a.time) >= now - 2 * 3600000)
    .sort((a, b) => atTime(a.date, a.time) - atTime(b.date, b.time))[0];
  // La dosis héroe vive solo arriba: la lista muestra las OTRAS dosis del día (o todas si ya no queda ninguna por dar).
  const otras = info.next ? info.today.filter((d) => d.key !== info.next?.key) : info.today;

  // Se marca esta visita para el próximo "mientras no estabas" (el valor de ESTA sesión no cambia).
  useEffect(() => {
    if (ready) actions.markSeen();
  }, [ready]);

  // Hitos: se celebran una sola vez y con calma (la ficha prohíbe confeti). En la demostración no se celebra nada.
  // Si hay "mientras no estabas" en pantalla, el hito espera a la próxima visita: una cosa a la vez.
  const reingreso = desde > 0 && (now - desde) / 3600000 >= 14 * 24;
  const hayNovedades = ready && !novedadesCerradas && novedades(data, desde, now) !== null;
  const nuevos = ready && !data.demo && !hayNovedades ? hitosNuevos(data, now) : [];
  const hitoId = nuevos[0]?.id;
  useEffect(() => {
    if (!hitoId) return;
    const h = nuevos[0];
    celebrate(h.titulo, h.mensaje);
    track('hito', { id: h.id });
    for (const x of nuevos) actions.markHito(x.id);
    // Se ejecuta cuando aparece un hito nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hitoId]);

  // Atajo de teclado (flexibilidad): "C" abre la confirmación de la próxima dosis.
  const proxima = info.next;
  useEffect(() => {
    if (!proxima || open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'c' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      setSel(proxima);
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [proxima, open]);

  function marcar(d: DoseInstance) {
    setSel(d);
    setOpen(true);
  }

  function deshacer(d: DoseInstance) {
    actions.undoDose(d.med.id, d.date, d.time);
    notify(`Se deshizo la confirmación de ${d.med.name}.`, {
      label: 'Volver a confirmarla',
      onClick: () => marcar(d),
    });
  }

  // Animación de entrada escalonada
  const item = (i: number) => ({
    // El contenido de arriba nace visible a medias (no en 0): el LCP no espera a la animación.
    initial: { opacity: i <= 3 ? 0.5 : 0, y: reduce ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.25,
      delay: reduce ? 0 : i * 0.07,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <motion.header {...item(0)} className="pb-2">
        <p className="t-body text-[var(--text-secondary)]">{cap(fmtLongDate(hoyK))}</p>
        <h1 className="t-title mt-1 text-balance text-[var(--text-primary)]">
          {saludo(now)}, {yo.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-0">
          <TapLink
            href="/app/familia"
            className="flex min-h-11 w-fit max-w-full items-center gap-2 rounded-[var(--radius-button)] bg-[var(--surface-2)] py-1 pr-3 pl-1"
          >
            <Avatar name={data.profile.name} tone="accent" size="sm" />
            <span className="t-label min-w-0 break-words text-[var(--text-primary)]">Cuidando a {data.profile.name}</span>
            <span className="sr-only">. Abrir el perfil</span>
          </TapLink>
          <SemanaPuntos data={data} now={now} compacto />
        </div>
      </motion.header>


      {activas.length === 0 ? (
        <motion.div {...item(1)}>
          <EmptyState
            escena={<EscenaPastilla />}
            title={`Empecemos por la primera medicina de ${data.profile.name}`}
            text="Agrega su medicina, dosis y horario para ver qué sigue."
          >
            <LinkBtn href="/app/medicinas?nueva=1" size="lg" full>
              Agregar la primera medicina
            </LinkBtn>
          </EmptyState>
        </motion.div>
      ) : info.next ? (
        <motion.div {...item(1)}>
          <NextDoseHero
            dose={info.next}
            done={info.done}
            total={info.total}
            giver={giverFor(info.next.med, info.next.date, data.members)}
            paciente={data.profile.name}
            now={now}
            meId={data.currentUserId}
            onMark={() => marcar(info.next as DoseInstance)}
            segmentos={info.today.map((d) => (d.status === 'dada' && d.log ? memberTone(data.members, d.log.byId) : null))}
          />
        </motion.div>
      ) : (
        <motion.div {...item(1)}>
          <AllDoneBanner data={data} info={info} hoyK={hoyK} />
        </motion.div>
      )}

      {/* Tras una ausencia larga la bienvenida va arriba; el resto de las veces espera abajo y no empuja lo urgente. */}
      {ready && !novedadesCerradas && reingreso && (
        <motion.div {...item(2)} className="empty:hidden">
          <NovedadesCard
            data={data}
            now={now}
            desde={desde}
            proxima={info.next ? `${info.next.med.name} a las ${fmtTime(info.next.time)}` : undefined}
            onCerrar={() => setNovedadesCerradas(true)}
          />
        </motion.div>
      )}

      {/* La próxima cita va justo bajo la dosis héroe: las dos cosas urgentes caben en la primera pantalla */}
      {proximaCita ? (
        <motion.section {...item(2)} aria-labelledby="prox-cita">
          <Card className="relative overflow-hidden !shadow-[var(--shadow-1)]">
            <TapLink href="/app/citas" scale={0.985} className="relative block rounded-[var(--radius-card)] p-6 pr-11 [touch-action:manipulation]">
              <ChevronRight size={20} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <div className="flex items-start gap-4">
              <div
                aria-hidden="true"
                className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[var(--surface-2)]"
              >
                <CalendarClock size={26} color="var(--accent-strong)" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="t-body text-[var(--text-secondary)]">Próxima cita</p>
                <h2 id="prox-cita" className="t-body ff-display font-bold text-[var(--text-primary)]">
                  {proximaCita.title}
                </h2>
                <p className="t-body mt-1 font-semibold text-[var(--text-primary)]">
                  {relativeDay(proximaCita.date, hoyK)} · <span className="whitespace-nowrap">{fmtTime(proximaCita.time)}</span>
                </p>
                {proximaCita.specialist && <p className="t-body text-[var(--text-secondary)]">Con {proximaCita.specialist}</p>}
                <p className="t-body mt-1 flex items-center gap-1 text-[var(--text-secondary)]">
                  <MapPin size={14} aria-hidden="true" className="shrink-0" />
                  <span className="line-clamp-2">{proximaCita.place}</span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {proximaCita.attendeeId ? (
                <Pill tone="indigo" grande>Va {nameOf(data, proximaCita.attendeeId)}</Pill>
              ) : (
                <Pill tone="warn" icon={AlertTriangle}>
                  Falta definir quién va
                </Pill>
              )}
                  {(() => {
                  const tono = apptTone(proximaCita, hoyK, now);
                  const etiqueta = daysUntilLabel(proximaCita.date, hoyK);
                  // Si el día ya se lee arriba ("Mañana, 10:00 AM"), no se repite en la píldora.
                  if (relativeDay(proximaCita.date, hoyK).toLowerCase() === etiqueta.toLowerCase() || tono === 'neutral') return null;
                  return (
                    <Pill tone={tono === 'red' ? 'danger' : 'neutral'} icon={CalendarClock} grande>
                      {etiqueta}
                    </Pill>
                  );
                })()}
                </div>
              </div>
            </div>
            </TapLink>
          </Card>
        </motion.section>
      ) : null}

      {otras.length > 0 && (
        // Sin tarjeta propia: la lista de dosis va directa sobre el fondo (una tarjeta menos en la pantalla).
        <motion.section {...item(3)} aria-labelledby="tu-dia" className="px-6">
          <h2 id="tu-dia" className="t-body pb-2 font-semibold text-[var(--text-primary)]">
            {info.next ? 'Las otras dosis de hoy' : 'Tu día'}
          </h2>
          <ul className="flex flex-col">
            {otras.map((d) => (
              <DoseRow key={d.key} d={d} now={now} data={data} onMark={() => marcar(d)} onUndo={() => deshacer(d)} />
            ))}
          </ul>
        </motion.section>
      )}

      {ready && !novedadesCerradas && !reingreso && (
        <motion.div {...item(4)} className="empty:hidden">
          <NovedadesCard
            data={data}
            now={now}
            desde={desde}
            proxima={info.next ? `${info.next.med.name} a las ${fmtTime(info.next.time)}` : undefined}
            onCerrar={() => setNovedadesCerradas(true)}
          />
        </motion.div>
      )}

      {ready && !data.demo && diasDeSuscripcion(data.plan, now) < 14 && (
        <motion.div {...item(3)} className="empty:hidden">
          <PrimerosPasos data={data} titulo="Tus primeros pasos" />
        </motion.div>
      )}

      <ConfirmDoseSheet key={sel?.key ?? 'ninguna'} open={open} onOpenChange={setOpen} dose={sel} data={data} now={now} />
    </div>
  );
}

/* ── Tarjeta héroe: la próxima dosis ── */
function NextDoseHero({
  dose,
  done,
  total,
  giver,
  paciente,
  now,
  meId,
  onMark,
  segmentos,
}: {
  segmentos?: (MemberTone | 'neutral' | null)[];
  dose: DoseInstance;
  done: number;
  total: number;
  giver: {
    id: string;
    name: string;
    tone: 'accent' | 'indigo' | 'green' | 'amber';
  } | null;
  paciente: string;
  now: number;
  meId: string;
  onMark: () => void;
}) {
  const atrasada = dose.status === 'atrasada';
  const meToca = giver?.id === meId;
  const minutosAtras = Math.max(1, Math.round((now - dose.at) / 60000));
  return (
    <section
      aria-labelledby="hero-med"
      className="bloque-confianza relative isolate overflow-hidden rounded-[var(--radius-card)] p-6 shadow-[0_18px_40px_-18px_color-mix(in_oklab,var(--navy-2)_60%,transparent)]"
      style={{ background: 'var(--grad-brand)' }}
    >
      {/* Dispositivo ownable: mancha de luz tras el dato héroe. Luz apagada para que el texto siga en AA. */}
      <div
        aria-hidden="true"
        data-testid="hero-mancha"
        className="pointer-events-none absolute top-12 -left-8 -z-10 size-72 rounded-full"
        style={{
          background:
            'radial-gradient(closest-side, color-mix(in oklab, var(--accent-glow) 46%, transparent) 0%, color-mix(in oklab, var(--accent-glow) 16%, transparent) 60%, transparent 100%)',
        }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="t-body t-sobre-bloque">
            {atrasada ? `Falta esta dosis de ${paciente}` : `Próxima dosis de ${paciente}`}
          </p>
          {meToca && <span className="t-body chip-bloque mt-2 font-semibold">Te toca a ti</span>}
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <ProgressRing done={done} total={total} label={`${done} de ${total} dosis de hoy`} segmentos={segmentos} />
          <span aria-hidden="true" className="t-label t-sobre-bloque w-16 text-center leading-none">
            dosis hoy
          </span>
        </div>
      </div>

      {/* Dato héroe: la hora a todo el ancho del bloque (56–72 px), para que se lea de un vistazo. */}
      <p className="t-dato relative mt-5">
        <span className="sr-only">{fmtTime(dose.time)}</span>
        <HoraHeroe texto={fmtTime(dose.time)} />
      </p>

      <div className="relative mt-4">
        <h2 id="hero-med" className="t-title">
          {dose.med.name}
        </h2>
        <p className="t-body mt-1 font-medium">{dose.med.dose}</p>
        {dose.med.notes && <p className="t-body mt-0.5">{dose.med.notes}</p>}
      </div>

      {(atrasada || (giver && !meToca)) && (
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          {atrasada && (
            <span className="t-body chip-bloque">
              <Clock3 size={16} aria-hidden="true" />
              {minutosAtras < 60 ? `Hace ${minutosAtras} min` : `Hace ${Math.round(minutosAtras / 60)} h`}
            </span>
          )}
          {giver && !meToca && <span className="t-body chip-bloque">{`Le toca a ${giver.name}`}</span>}
        </div>
      )}

      <Btn variant="inverso" size="lg" full onClick={onMark} aria-keyshortcuts="C" className="relative mt-6">
        <Check size={20} strokeWidth={2.5} aria-hidden="true" />
        Confirmar dosis
      </Btn>
      <p className="t-body relative mt-3 text-center">
        {/* Chip con velo azul marino: sobre la zona clara del degradé el texto baja de 4.5:1; con el velo queda ~6:1. */}
        <span className="inline-block text-balance rounded-full bg-[color-mix(in_oklab,var(--navy)_35%,transparent)] px-3 py-1">
          Quedará firmada con tu nombre y la hora
        </span>
      </p>
    </section>
  );
}

/* La hora héroe cuenta hasta su valor al aparecer; sin movimiento, aparece directa. */
function HoraHeroe({ texto }: { texto: string }) {
  // "8:00 p. m." → la hora y los minutos en la cifra gigante, el periodo más chico al lado.
  const m = texto.match(/^(\d{1,2})(:\d{2})\s(.+)$/);
  if (!m) return <>{texto}</>;
  return (
    <span aria-hidden="true">
      <CountUp to={Number(m[1])} />
      {m[2]}
      <span className="t-dato-sufijo">{m[3]}</span>
    </span>
  );
}

/* ── Todo al día: banner calmado ── */
function AllDoneBanner({
  data,
  info,
  hoyK,
}: {
  data: ReturnType<typeof useAppData>;
  info: ReturnType<typeof nextDoseInfo>;
  hoyK: string;
}) {
  const sigue = info.upcoming;
  const sinDosisHoy = info.total === 0;
  return (
    <section
      aria-labelledby="todo-al-dia"
      className="bloque-confianza relative isolate overflow-hidden rounded-[var(--radius-card)] p-6 shadow-[0_18px_40px_-18px_color-mix(in_oklab,var(--navy-2)_60%,transparent)]"
      style={{ background: 'var(--grad-brand)' }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 -z-10 size-64 rounded-full"
        style={{
          background: 'radial-gradient(closest-side, color-mix(in oklab, var(--accent-glow) 40%, transparent), transparent)',
        }}
      />
      <div className="relative flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--surface)_18%,transparent)]"
        >
          <Sparkles size={26} />
        </span>
        <div className="min-w-0">
          <h2 id="todo-al-dia" className="t-title">
            {sinDosisHoy ? 'Hoy no toca ninguna dosis' : info.skipped > 0 ? 'Todo registrado por hoy' : 'Todo al día por hoy'}
          </h2>
          <p role="status" className="t-body mt-2">
            {sinDosisHoy
              ? `${data.profile.name} no tiene medicinas programadas hoy.`
              : info.skipped > 0
                ? `Las ${info.total} dosis de hoy ya están registradas (${info.skipped} anotada${info.skipped === 1 ? '' : 's'} como no dada${info.skipped === 1 ? '' : 's'}). ${sincroTexto('Todos los hermanos lo ven.', 'Queda en el historial.')}`
                : `Las ${info.total} dosis de hoy ya están confirmadas${sincroTexto(' y todos los hermanos lo ven.', ' y quedan en el historial.')}`}
          </p>
        </div>
      </div>
      {sigue && (
        <div className="relative mt-4 flex items-center gap-3 rounded-2xl bg-[color-mix(in_oklab,var(--navy)_38%,transparent)] p-4">
          <PillIcon size={20} aria-hidden="true" className="shrink-0" />
          <p className="t-body min-w-0">
            Lo siguiente: <strong>{sigue.med.name}</strong>, {relativeDay(sigue.date, hoyK).toLowerCase()} a las{' '}
            {fmtTime(sigue.time)}
          </p>
        </div>
      )}
    </section>
  );
}

/* ── Fila de la línea del día ── */
function DoseRow({
  d,
  now,
  data,
  onMark,
  onUndo,
}: {
  d: DoseInstance;
  now: number;
  data: ReturnType<typeof useAppData>;
  onMark: () => void;
  onUndo: () => void;
}) {
  const reduce = useReducedMotionSafe();
  const dada = d.status === 'dada';
  const omitida = d.status === 'omitida';
  const atrasada = d.status === 'atrasada';
  const puedeConfirmar = !dada && !omitida && d.at - now <= 2 * 3600000;
  return (
    <li className="flex flex-col gap-3 border-t border-[color-mix(in_oklab,var(--text-tertiary)_14%,transparent)] py-3 first:border-t-0">
      <div className="flex items-center gap-3">
        {dada && d.log ? (
          // Sello de nombre: quién dio la dosis, con la marca de confirmado (la firma del producto).
          <span aria-hidden="true" className="relative shrink-0">
            <Avatar name={nameOf(data, d.log.byId)} tone={memberTone(data.members, d.log.byId)} size="sm" />
            <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-[var(--ok)] ring-2 ring-[var(--surface)]">
              <Check size={10} strokeWidth={3.5} className="text-[var(--surface)]" />
            </span>
          </span>
        ) : omitida && d.log ? (
          <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--text-tertiary)_16%,transparent)]">
            <Minus size={16} strokeWidth={3} color="var(--text-secondary)" />
          </span>
        ) : dada ? (
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--ok)_22%,transparent)]"
          >
            <Check size={16} strokeWidth={3} color="var(--ok-text)" />
          </span>
        ) : atrasada ? (
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--warn)_26%,transparent)]"
          >
            <Clock3 size={16} color="var(--warn-text)" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)]"
          >
            <Clock3 size={16} color="var(--text-secondary)" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="t-body break-words font-medium text-[var(--text-primary)]">
            {d.med.name}{' '}
            <span className="font-normal whitespace-nowrap text-[var(--text-secondary)]">· {fmtTime(d.time)}</span>
          </p>
          <p className="t-body text-[var(--text-secondary)]">
            {omitida && d.log
              ? `No se dio (${SKIP_REASONS.find((r) => r.id === d.log?.skipped)?.label.toLowerCase() ?? 'sin motivo'}) · lo anotó ${nameOf(data, d.log.byId)}`
              : dada && d.log
              ? (<>Dada por {nameOf(data, d.log.byId)} a las <span className="whitespace-nowrap">{fmtClock(d.log.at)}</span></>)
              : atrasada
                ? 'Falta confirmarla'
                : 'Pendiente'}
          </p>
        </div>
        {(dada || omitida) && (
          <motion.button
            type="button"
            onClick={onUndo}
            whileTap={reduce ? undefined : { scale: 0.95 }}
            className="t-body min-h-11 shrink-0 rounded-full px-3 font-medium text-[var(--text-secondary)] underline underline-offset-4 [touch-action:manipulation]"
          >
            Deshacer
          </motion.button>
        )}
      </div>
      {puedeConfirmar && (
        <Btn variant="secondary" size="sm" full onClick={onMark}>
          Confirmar {d.med.name}
        </Btn>
      )}
    </li>
  );
}
