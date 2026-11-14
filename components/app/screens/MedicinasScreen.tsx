'use client';

// MEDICINAS — lista, agregar, editar, pausar, eliminar (con confirmación propia) e historial de
// confirmaciones de cada una. Arriba, un resumen de la semana (adherencia calculada de verdad).

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { ChevronRight, Clock3, Pause, Pencil, Pill as PillIcon, Play, Plus, Trash2 } from 'lucide-react';
import { Avatar, Btn, Card, ChipToggle, CountUp, EmptyState, PageHeader, Pill, memberTone } from '@/components/app/ui';
import { Sheet, ConfirmSheet } from '@/components/app/Sheet';
import { MedForm } from '@/components/app/MedForm';
import { useFeedback } from '@/components/app/Feedback';
import { useReducedMotionSafe } from '@/components/landing/ui';
import { SKIP_REASONS } from '@/lib/types';
import { addDays, cap, fmtClock, fmtTime, keyFromMs, relativeDay, DIAS_CORTOS, parseKey } from '@/lib/dates';
import { adherence, dayStats, freqLabel, nameOf } from '@/lib/schedule';
import { actions, useAppData, useNow } from '@/lib/store';
import { sincroTexto } from '@/lib/oferta';
import type { Med } from '@/lib/types';

type Filtro = 'todas' | 'activas' | 'pausadas';

export default function MedicinasScreen() {
  const data = useAppData();
  const now = useNow();
  const { notify } = useFeedback();
  const params = useSearchParams();
  const [formOpen, setFormOpen] = useState(params.get('nueva') === '1');
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Med | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [delMed, setDelMed] = useState<Med | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const usarFiltros = data.meds.length > 8;
  const ordenadas = [...data.meds].sort(
    (a, b) => Number(a.paused) - Number(b.paused) || a.times[0].localeCompare(b.times[0])
  );
  const visibles = ordenadas.filter((m) => (filtro === 'todas' ? true : filtro === 'activas' ? !m.paused : m.paused));
  const activas = data.meds.filter((m) => !m.paused).length;
  const detail = data.meds.find((m) => m.id === detailId) ?? null;

  function abrirForm(med: Med | null) {
    setEditing(med);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Medicinas"
        subtitle={`${activas} ${activas === 1 ? 'activa' : 'activas'} de ${data.profile.name}`}
        action={
          data.meds.length > 0 ? (
            <Btn size="md" onClick={() => abrirForm(null)}>
              <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
              Agregar
            </Btn>
          ) : undefined
        }
      />

      {data.meds.length === 0 ? (
        <EmptyState
          icon={PillIcon}
          title="Aquí vivirán las medicinas"
          text={`Agrega la primera con su dosis y horario, ${sincroTexto(`y todos los hermanos sabrán cuándo le toca a ${data.profile.name}.`, `y verás cuándo le toca a ${data.profile.name}.`)}`}
        >
          <Btn size="lg" full onClick={() => abrirForm(null)}>
            Agregar la primera medicina
          </Btn>
        </EmptyState>
      ) : (
        <>
          <WeekSummary />

          {usarFiltros && (
            <div role="group" aria-label="Filtrar medicinas" className="flex flex-wrap gap-2">
              {(['todas', 'activas', 'pausadas'] as Filtro[]).map((f) => (
                <ChipToggle key={f} selected={filtro === f} onClick={() => setFiltro(f)}>
                  {cap(f)}
                </ChipToggle>
              ))}
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {visibles.map((m) => {
              const giver = data.members.find((x) => x.id === m.giverId);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailId(m.id);
                      setDetailOpen(true);
                    }}
                    className={`w-full rounded-[var(--radius-card)] bg-[var(--surface)] p-4 text-left shadow-[var(--shadow-2)] ring-1 ring-[color-mix(in_oklab,var(--text-tertiary)_14%,transparent)] [touch-action:manipulation] ${
                      m.paused ? 'opacity-80' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="t-sub text-[var(--text-primary)]">{m.name}</p>
                        <p className="t-body text-[var(--text-secondary)]">{m.dose}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {m.paused && (
                          <Pill tone="warn" icon={Pause}>
                            Pausada
                          </Pill>
                        )}
                        <ChevronRight size={20} aria-hidden="true" className="text-[var(--text-secondary)]" />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.times.map((t) => (
                        <Pill key={t} tone="neutral" icon={Clock3}>
                          {fmtTime(t)}
                        </Pill>
                      ))}
                      <Pill tone="neutral">{freqLabel(m.freq)}</Pill>
                    </div>
                    {(m.notes || giver) && (
                      <div className="mt-3 flex flex-col gap-2">
                        {m.notes && <p className="t-body text-[var(--text-secondary)]">{m.notes}</p>}
                        {giver && (
                          <p className="t-body flex items-center gap-2 text-[var(--text-secondary)]">
                            <Avatar name={giver.name} tone={giver.tone} size="sm" />
                            Suele dársela {giver.name}
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {visibles.length === 0 && (
            <Card className="p-6 text-center">
              <p className="t-body text-[var(--text-secondary)]">No hay medicinas en esta vista.</p>
              <Btn variant="soft" size="sm" className="mt-3" onClick={() => setFiltro('todas')}>
                Ver todas
              </Btn>
            </Card>
          )}
        </>
      )}

      <MedForm key={formKey} open={formOpen} onOpenChange={setFormOpen} data={data} editing={editing} />

      <Sheet
        open={detailOpen && !!detail}
        onOpenChange={setDetailOpen}
        title={detail?.name ?? ''}
        description={detail ? `${detail.dose} · ${freqLabel(detail.freq)}` : undefined}
      >
        {detail && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              {detail.times.map((t) => (
                <Pill key={t} tone="neutral" icon={Clock3}>
                  {fmtTime(t)}
                </Pill>
              ))}
              {detail.paused && (
                <Pill tone="warn" icon={Pause}>
                  Pausada: no aparece en Hoy
                </Pill>
              )}
            </div>
            {detail.notes && <p className="t-body text-[var(--text-primary)]">{detail.notes}</p>}

            <HistoryList med={detail} now={now} />

            <div className="grid grid-cols-2 gap-2">
              <Btn
                variant="secondary"
                onClick={() => {
                  setDetailOpen(false);
                  abrirForm(detail);
                }}
              >
                <Pencil size={18} aria-hidden="true" />
                Editar
              </Btn>
              <Btn
                variant="secondary"
                onClick={() => {
                  actions.toggleMedPause(detail.id);
                  notify(detail.paused ? `${detail.name} vuelve a aparecer en Hoy.` : `Pausamos ${detail.name}. No aparecerá en Hoy.`);
                }}
              >
                {detail.paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
                {detail.paused ? 'Reanudar' : 'Pausar'}
              </Btn>
            </div>
            <Btn
              variant="danger"
              onClick={() => {
                setDetailOpen(false);
                setDelMed(detail);
                setDelOpen(true);
              }}
            >
              <Trash2 size={18} aria-hidden="true" />
              Eliminar medicina
            </Btn>
          </div>
        )}
      </Sheet>

      <ConfirmSheet
        open={delOpen}
        onOpenChange={setDelOpen}
        title={delMed ? `¿Eliminar ${delMed.name}?` : '¿Eliminar?'}
        text="Se borran la medicina y todo su historial de confirmaciones. Si solo quieres dejar de verla en Hoy, mejor pausarla."
        confirmLabel="Sí, eliminar"
        onConfirm={() => {
          if (!delMed) return;
          actions.deleteMed(delMed.id);
          notify(`Eliminamos ${delMed.name}.`);
        }}
      />

      <div className="t-body flex flex-col items-center px-2 text-center text-[var(--text-secondary)]">
        <p>Esta lista organiza lo que ya indicó el médico: no recomienda ni cambia medicinas.</p>
        <Link href="/aviso-medico" className="inline-flex min-h-11 items-center underline underline-offset-2">
          Aviso médico
        </Link>
      </div>
    </div>
  );
}

/* ── Resumen de la semana: adherencia y barras por día (se dibujan al cargar) ── */
function WeekSummary() {
  const data = useAppData();
  const now = useNow();
  const reduce = useReducedMotionSafe();
  const hoyK = keyFromMs(now);
  const sem = adherence(data, 7, now);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const k = addDays(hoyK, i - 6);
    return { k, ...dayStats(data, k, now) };
  });
  return (
    <Card as="section" className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="t-sub text-[var(--text-primary)]">Esta semana</h2>
          <p className="t-body mt-1 text-balance text-[var(--text-secondary)]">
            {sem.expected > 0 ? `${sem.done} de ${sem.expected} dosis confirmadas` : 'Aún sin dosis que contar'}
          </p>
        </div>
        {sem.pct !== null && (
          <p className="t-hero text-[var(--accent)]">
            <CountUp to={sem.pct} />
            <span className="t-title">%</span>
          </p>
        )}
      </div>
      <div
        role="img"
        aria-label={`Dosis confirmadas por día: ${dias.map((d) => `${DIAS_CORTOS[parseKey(d.k).getDay()]} ${d.done} de ${d.expected}`).join(', ')}`}
        className="mt-4 flex items-end justify-between gap-2"
      >
        {dias.map((d, i) => {
          const frac = d.expected ? d.done / d.expected : 0;
          const hoy = d.k === hoyK;
          return (
            <div key={d.k} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-16 w-full items-end justify-center">
                <div className="flex h-full w-4 items-end rounded-full bg-[var(--surface-2)]">
                  <motion.div
                    className="w-full origin-bottom rounded-full bg-[var(--accent)]"
                    style={{ height: '100%', opacity: hoy ? 1 : 0.55 }}
                    initial={{ scaleY: reduce ? frac : 0 }}
                    animate={{ scaleY: frac }}
                    transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
              <span className={`t-label ${hoy ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                {DIAS_CORTOS[parseKey(d.k).getDay()].slice(0, 1).toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ── Historial de confirmaciones de una medicina: quién y cuándo ── */
function HistoryList({ med, now }: { med: Med; now: number }) {
  const data = useAppData();
  const hoyK = keyFromMs(now);
  const logs = data.doses
    .filter((d) => d.medId === med.id)
    .sort((a, b) => b.at - a.at)
    .slice(0, 12);
  const ad = adherence(data, 28, now, med.id);
  return (
    <section aria-labelledby="hist">
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="hist" className="t-sub text-[var(--text-primary)]">
          Historial
        </h3>
        {ad.pct !== null && <p className="t-body text-[var(--text-secondary)]">{ad.pct}% en 4 semanas</p>}
      </div>
      {logs.length === 0 ? (
        <p className="t-body mt-2 text-[var(--text-secondary)]">Todavía no hay confirmaciones de esta medicina.</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {logs.map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-3 border-t border-[color-mix(in_oklab,var(--text-tertiary)_14%,transparent)] py-3 first:border-t-0"
            >
              <Avatar name={nameOf(data, l.byId)} tone={memberTone(data.members, l.byId)} size="sm" />
              <p className="t-body min-w-0 flex-1 text-[var(--text-primary)]">
                {nameOf(data, l.byId)}
                <span className="text-[var(--text-secondary)]">
                  {l.skipped
                    ? ` anotó que no se dio (${SKIP_REASONS.find((r) => r.id === l.skipped)?.label.toLowerCase()})`
                    : ` la dio a las ${fmtClock(l.at)}`}
                </span>
              </p>
              <p className="t-body shrink-0 text-[var(--text-secondary)]">{relativeDay(l.date, hoyK)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
