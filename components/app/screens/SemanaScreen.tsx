'use client';

// LA SEMANA DEL CÍRCULO — el ritual semanal: qué logró la familia en siete días, quién ayudó y qué viene.
// Es lo que hace que la app se sienta del equipo (no de una sola persona) y da un motivo para volver
// el domingo. Se calcula solo con lo registrado; nada se envía.

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, CalendarClock, FileText, Heart, Info, UserPlus } from 'lucide-react';
import { Avatar, Card, CountUp, LinkBtn, PageHeader, memberTone } from '@/components/app/ui';
import { HitoChip } from '@/components/app/retencion';
import { useFeedback } from '@/components/app/Feedback';
import { useReducedMotionSafe } from '@/components/landing/ui';
import { track } from '@/lib/analytics';
import { cap, fmtDayMonth, fmtShortDate, fmtTime, weekday } from '@/lib/dates';
import { hitosLogrados, racha, semana } from '@/lib/retencion';
import { actions, newId, useAppData, useNow } from '@/lib/store';
import { sincroTexto } from '@/lib/oferta';

const INICIAL_DIA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function SemanaScreen() {
  const data = useAppData();
  const now = useNow();
  const reduce = useReducedMotionSafe();
  const { notify } = useFeedback();
  useEffect(() => {
    track('semana_vista');
  }, []);

  const s = semana(data, now);
  const r = racha(data, now);
  const hitos = hitosLogrados(data, now);
  const paciente = data.profile.name;

  function agradecer(nombre: string) {
    const id = newId();
    actions.saveNote({
      id,
      kind: 'otra',
      authorId: data.currentUserId,
      at: now,
      text: `Gracias, ${nombre}, por estar en el cuidado de ${paciente} esta semana.`,
    });
    notify(`Gracias a ${nombre}: quedó en la bitácora.${sincroTexto(' Todos lo ven.', '')}`, { label: 'Deshacer', onClick: () => actions.deleteNote(id) });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="La semana del círculo"
        subtitle={`${cap(fmtDayMonth(s.desde))} al ${fmtDayMonth(s.hasta)} · cuidando a ${paciente}`}
      />

      {s.diasConDosis === 0 ? (
        <Card className="p-6 text-center">
          <p className="t-sub text-[var(--text-primary)]">Aquí verás la semana de tu círculo</p>
          <p className="t-body mt-2 text-[var(--text-secondary)]">Cuando registren la primera medicina y sus dosis, esta pantalla cuenta lo que logran entre todos.</p>
          <LinkBtn href="/app/medicinas?nueva=1" size="lg" full className="mt-4">
            Agregar la primera medicina
          </LinkBtn>
        </Card>
      ) : (
        <motion.section
          initial={{ opacity: reduce ? 1 : 0.5, y: reduce ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="borde-grad relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] p-5 shadow-[var(--shadow-2)]"
        >
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: 'var(--grad-brand)' }} />
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-40 blur-2xl" style={{ background: 'color-mix(in oklab, var(--accent) 45%, transparent)' }} />
          <p className="t-body text-[var(--text-secondary)]">Registro de la semana</p>
          <p className="t-hero texto-grad mt-1">
            {s.pct === null ? '—' : <CountUp to={s.pct} />}
            {s.pct !== null && <span className="t-title">%</span>}
          </p>
          <p className="t-body mt-1 text-[var(--text-primary)]">
            {s.dadas + s.omitidas} de {s.esperadas} dosis registradas
            {s.omitidas > 0 && (
              <span className="text-[var(--text-secondary)]">
                {' '}
                · {s.omitidas} no dada{s.omitidas === 1 ? '' : 's'}
              </span>
            )}
          </p>

          <ol className="mt-4 grid grid-cols-7 gap-1" aria-label="Los siete días de la semana">
            {s.dias.map((d, i) => {
              const estado = d.estado;
              return (
                <li key={d.k} className="flex flex-col items-center gap-1.5">
                  <motion.span
                    initial={{ scale: reduce ? 1 : 0.5, opacity: reduce ? 1 : 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: reduce ? 0 : 0.15 + i * 0.05, type: 'spring', bounce: 0.25, duration: 0.25 }}
                    role="img"
                    aria-label={`${cap(fmtShortDate(d.k))}: ${estado === 'completo' ? 'registro completo' : estado === 'abierto' ? 'en curso' : estado === 'incompleto' ? 'quedó algo sin registrar' : 'sin dosis'}`}
                    className={`flex size-9 items-center justify-center rounded-full text-[14px] font-bold ${
                      estado === 'completo'
                        ? 'text-[var(--bg)]'
                        : estado === 'abierto'
                          ? 'bg-transparent text-[var(--accent)] ring-2 ring-[var(--accent)]'
                          : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'
                    }`}
                    style={estado === 'completo' ? { background: 'var(--grad-brand)' } : undefined}
                  >
                    {estado === 'completo' ? <Check size={16} strokeWidth={2.5} aria-hidden="true" /> : null}
                  </motion.span>
                  <span className="t-label text-[var(--text-secondary)]">{INICIAL_DIA[weekday(d.k)]}</span>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 rounded-2xl bg-[var(--grad-soft)] p-3">
            <p className="t-body font-semibold text-[var(--text-primary)]">
              {r.dias >= 2
                ? `${r.dias} días con todo anotado`
                : r.dias === 1
                  ? '1 día con todo anotado. Así empieza.'
                  : 'Cada día que registran suma.'}
            </p>
            <p className="t-body mt-0.5 text-[var(--text-secondary)]">
              Cuenta lo que registre cualquiera, también si una dosis no se dio.
              {r.comodines > 0 && ` Comodines: ${r.comodines}.`}
            </p>
          </div>
        </motion.section>
      )}

      {s.porMiembro.length > 0 && (
        <Card as="section" className="p-4">
          <h2 className="t-sub text-[var(--text-primary)]">
            {s.porMiembro.length === 1 ? 'Ayudó 1 persona' : `Ayudaron ${s.porMiembro.length} personas`}
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {s.porMiembro.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Avatar name={m.nombre} tone={memberTone(data.members, m.id)} size="sm" />
                <p className="t-body min-w-0 flex-1 text-[var(--text-primary)]">
                  {m.nombre} <span className="text-[var(--text-secondary)]">dio {m.dadas === 1 ? 'una dosis' : `${m.dadas} dosis`}</span>
                </p>
                {m.id !== data.currentUserId && m.id !== 'self' && (
                  <button
                    type="button"
                    onClick={() => agradecer(m.nombre)}
                    className="t-btn flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 font-semibold text-[var(--accent-strong)] ring-1 ring-[color-mix(in_oklab,var(--accent)_30%,transparent)] [touch-action:manipulation]"
                  >
                    <Heart size={14} aria-hidden="true" />
                    Agradecer
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(s.citasAtendidas.length > 0 || s.proximasCitas.length > 0) && (
        <Card as="section" className="p-4">
          <h2 className="t-sub text-[var(--text-primary)]">Citas</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {s.citasAtendidas.map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <CalendarClock size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--ok-text)]" />
                <p className="t-body text-[var(--text-primary)]">
                  Atendida: {a.title} <span className="text-[var(--text-secondary)]">· {cap(fmtShortDate(a.date))}</span>
                </p>
              </li>
            ))}
            {s.proximasCitas.map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <CalendarClock size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <p className="t-body text-[var(--text-primary)]">
                  Viene: {a.title} <span className="text-[var(--text-secondary)]">· {cap(fmtShortDate(a.date))}, {fmtTime(a.time)}</span>
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {hitos.length > 0 && (
        <section aria-labelledby="hitos">
          <h2 id="hitos" className="t-sub mb-2 text-[var(--text-primary)]">
            Lo que ya lograron
          </h2>
          <div className="flex flex-wrap gap-2">
            {hitos.map((h) => (
              <HitoChip key={h.id} titulo={h.titulo} />
            ))}
          </div>
        </section>
      )}

      <LinkBtn href="/app/resumen" variant="secondary" size="lg" full>
        <FileText size={18} aria-hidden="true" />
        Preparar el resumen para el médico
      </LinkBtn>
      {data.members.length < 3 && (
        <LinkBtn href="/app/familia?invitar=1" variant="ghost" size="md" full>
          <UserPlus size={18} aria-hidden="true" />
          Invitar a un hermano
        </LinkBtn>
      )}
      <p className="t-body flex items-start gap-2 text-[var(--text-secondary)]">
        <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
        Un día sin registro no define el cuidado: lo que importa es retomar.
      </p>
    </div>
  );
}
