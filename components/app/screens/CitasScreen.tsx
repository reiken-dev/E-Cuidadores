'use client';

// CITAS — próximas y pasadas, con fechas reales y navegación entre meses. Agregar, editar,
// cancelar, marcar como atendida y anotar el resultado. Los recordatorios se muestran como
// programados: el aviso real se activa al conectar el servicio de notificaciones.

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarPlus, BellRing, Check, Info, MapPin, Pencil, Undo2, FileText, ClipboardCheck } from 'lucide-react';
import { Avatar, Btn, Card, ChipToggle, EmptyState, LinkBtn, PageHeader, Pill, memberTone } from '@/components/app/ui';
import { EscenaCalendario } from '@/components/brand/Escenas';
import { ApptForm, AttendSheet } from '@/components/app/ApptForm';
import { useFeedback } from '@/components/app/Feedback';
import { atTime, cap, fmtLongDate, fmtTime, keyFromMs, monthLabel, parseKey, DIAS, DIAS_CORTOS } from '@/lib/dates';
import { apptTone, daysUntilLabel, nameOf, reminderText } from '@/lib/schedule';
import { actions, useAppData, useNow } from '@/lib/store';
import type { Appt } from '@/lib/types';

type Filtro = 'todas' | 'pendiente' | 'atendida' | 'cancelada';
const ETIQUETA_FILTRO: Record<Filtro, string> = {
  todas: 'Todas',
  pendiente: 'Próximas',
  atendida: 'Atendidas',
  cancelada: 'Canceladas',
};

export default function CitasScreen() {
  const data = useAppData();
  const now = useNow();
  const { notify } = useFeedback();
  const hoyK = keyFromMs(now);
  const [offset, setOffset] = useState(0);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Appt | null>(null);
  const [attendOpen, setAttendOpen] = useState(false);
  const [attendKey, setAttendKey] = useState(0);
  const [attending, setAttending] = useState<Appt | null>(null);

  const base = new Date(now);
  const vista = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const prefijo = `${vista.getFullYear()}-${String(vista.getMonth() + 1).padStart(2, '0')}`;
  const delMes = data.appts
    .filter((a) => a.date.startsWith(prefijo))
    .sort((a, b) => atTime(a.date, a.time) - atTime(b.date, b.time));
  const lista = delMes.filter((a) => filtro === 'todas' || a.status === filtro);
  const usarFiltros = data.appts.length > 8;
  // La próxima cita pendiente siempre a la vista, aunque caiga en otro mes.
  const proxima = [...data.appts]
    .filter((a) => a.status === 'pendiente' && atTime(a.date, a.time) >= now)
    .sort((a, b) => atTime(a.date, a.time) - atTime(b.date, b.time))[0];
  const proximaFuera = proxima && !proxima.date.startsWith(prefijo) ? proxima : null;
  const primeroDelMes = `${prefijo}-01`;
  const fechaPorDefecto = offset === 0 ? hoyK : primeroDelMes > hoyK ? primeroDelMes : hoyK;

  function abrirForm(a: Appt | null) {
    setEditing(a);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }
  function abrirResultado(a: Appt) {
    setAttending(a);
    setAttendKey((k) => k + 1);
    setAttendOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Citas"
        subtitle={`Del cuidado de ${data.profile.name}`}
        action={
          data.appts.length > 0 ? (
            <Btn onClick={() => abrirForm(null)}>
              <CalendarPlus size={18} aria-hidden="true" />
              Agregar
            </Btn>
          ) : undefined
        }
      />

      {data.appts.length === 0 ? (
        <EmptyState
          escena={<EscenaCalendario />}
          title="Ninguna cita a la vista"
          text="Agrega la próxima consulta y quién acompaña."
        >
          <Btn size="lg" full onClick={() => abrirForm(null)}>
            Agregar la primera cita
          </Btn>
        </EmptyState>
      ) : (
        <>
          {/* Navegación entre meses */}
          <nav aria-label="Cambiar de mes" className="flex items-center justify-between gap-2 rounded-[var(--radius-button)] bg-[var(--surface)] p-1 shadow-[var(--shadow-1)] ring-1 ring-[color-mix(in_oklab,var(--text-tertiary)_20%,transparent)]">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => setOffset((o) => o - 1)}
              className="flex size-12 items-center justify-center rounded-full text-[var(--text-primary)] [touch-action:manipulation]"
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <div className="text-center">
              <p aria-live="polite" className="t-sub text-[var(--text-primary)]">
                {monthLabel(vista.getFullYear(), vista.getMonth())}
              </p>
              {offset !== 0 && (
                <button
                  type="button"
                  onClick={() => setOffset(0)}
                  className="t-label min-h-11 font-semibold text-[var(--accent)] [touch-action:manipulation]"
                >
                  Volver a este mes
                </button>
              )}
            </div>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => setOffset((o) => o + 1)}
              className="flex size-12 items-center justify-center rounded-full text-[var(--text-primary)] [touch-action:manipulation]"
            >
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          </nav>

          {proximaFuera && (
            <Card as="section" className="flex items-center gap-4 p-4 ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]">
              <div className="min-w-0 flex-1">
                <p className="t-body text-[var(--text-secondary)]">Próxima cita</p>
                <h2 className="t-sub text-balance text-[var(--text-primary)]">{proximaFuera.title}</h2>
                <p className="t-body text-[var(--text-secondary)]">
                  {cap(fmtLongDate(proximaFuera.date))} · {fmtTime(proximaFuera.time)}
                </p>
              </div>
              <Btn
                variant="soft"
                size="sm"
                onClick={() => {
                  const d = parseKey(proximaFuera.date);
                  setOffset((d.getFullYear() - base.getFullYear()) * 12 + d.getMonth() - base.getMonth());
                }}
              >
                Verla
              </Btn>
            </Card>
          )}

          {usarFiltros && (
            <div role="group" aria-label="Filtrar citas" className="flex flex-wrap gap-2">
              {(Object.keys(ETIQUETA_FILTRO) as Filtro[]).map((f) => (
                <ChipToggle key={f} selected={filtro === f} onClick={() => setFiltro(f)}>
                  {ETIQUETA_FILTRO[f]}
                </ChipToggle>
              ))}
            </div>
          )}

          {lista.length === 0 ? (
            <Card className="flex flex-col items-center px-6 py-8 text-center">
              <h2 className="t-sub text-[var(--text-primary)]">
                {delMes.length === 0 ? `No hay citas en ${monthLabel(vista.getFullYear(), vista.getMonth()).toLowerCase()}` : 'Ninguna cita con este filtro'}
              </h2>
              <p className="t-body mt-2 text-[var(--text-secondary)]">
                {delMes.length === 0 ? 'Puedes agregar una para este mes o mirar otro mes.' : 'Prueba con otro filtro.'}
              </p>
              <div className="mt-4 w-full max-w-72">
                {delMes.length === 0 ? (
                  <Btn size="lg" full onClick={() => abrirForm(null)}>
                    Agregar una cita
                  </Btn>
                ) : (
                  <Btn variant="soft" size="lg" full onClick={() => setFiltro('todas')}>
                    Ver todas
                  </Btn>
                )}
              </div>
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {lista.map((a) => (
                <ApptCard
                  key={a.id}
                  a={a}
                  hoyK={hoyK}
                  now={now}
                  onEdit={() => abrirForm(a)}
                  onAttend={() => abrirResultado(a)}
                  onReactivate={() => {
                    actions.setApptStatus(a.id, 'pendiente');
                    notify('Cita reactivada.');
                  }}
                />
              ))}
            </ul>
          )}

          <p className="t-body flex items-start gap-2 rounded-2xl bg-[var(--surface-2)] p-4 text-[var(--text-secondary)]">
            <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            Avisos programados en cada cita. El envío real se activa al conectar tu servicio.
          </p>
        </>
      )}

      <ApptForm
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        data={data}
        editing={editing}
        defaultDate={fechaPorDefecto}
        now={now}
        onSaved={(fecha) => {
          const d = parseKey(fecha);
          setOffset((d.getFullYear() - base.getFullYear()) * 12 + d.getMonth() - base.getMonth());
        }}
      />
      <AttendSheet key={`a-${attendKey}`} open={attendOpen} onOpenChange={setAttendOpen} appt={attending} />
    </div>
  );
}

function ApptCard({
  a,
  hoyK,
  now,
  onEdit,
  onAttend,
  onReactivate,
}: {
  a: Appt;
  hoyK: string;
  now: number;
  onEdit: () => void;
  onAttend: () => void;
  onReactivate: () => void;
}) {
  const data = useAppData();
  const tono = apptTone(a, hoyK, now);
  const d = parseKey(a.date);
  const pendiente = a.status === 'pendiente';
  const yaPaso = pendiente && atTime(a.date, a.time) < now;
  const aviso = pendiente && !yaPaso ? reminderText(a) : null;

  return (
    <li>
      <Card
        as="article"
        className={`p-4 ${a.status === 'cancelada' ? 'opacity-75' : ''}`}
      >
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[var(--surface-2)]"
          >
            <span className="t-label uppercase text-[var(--text-secondary)]">{DIAS_CORTOS[d.getDay()]}</span>
            <span className="t-sub tabular-nums text-[var(--text-primary)]">{d.getDate()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className={`t-sub text-[var(--text-primary)] ${a.status === 'cancelada' ? 'line-through' : ''}`}>{a.title}</h2>
            <p className="t-body text-[var(--text-secondary)]">
              {cap(DIAS[d.getDay()])} · {fmtTime(a.time)}
              {a.specialist ? ` · ${a.specialist}` : ''}
            </p>
            {a.place && (
              <p className="t-body mt-1 flex items-center gap-1 text-[var(--text-secondary)]">
                <MapPin size={14} aria-hidden="true" className="shrink-0" />
                <span className="min-w-0 break-words">{a.place}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {tono === 'done' ? (
            <Pill tone="ok" icon={Check}>
              Atendida
            </Pill>
          ) : tono === 'muted' ? (
            <Pill tone="neutral">Cancelada</Pill>
          ) : yaPaso ? (
            <Pill tone="danger" icon={ClipboardCheck}>
              Ya pasó: ¿fue atendida?
            </Pill>
          ) : (
            <Pill tone={tono === 'red' ? 'danger' : tono === 'amber' ? 'warn' : 'neutral'}>{daysUntilLabel(a.date, hoyK)}</Pill>
          )}
          {a.attendeeId ? (
            <span className="t-label inline-flex items-center gap-2 text-[var(--text-secondary)]">
              <Avatar name={nameOf(data, a.attendeeId)} tone={memberTone(data.members, a.attendeeId)} size="sm" />
              Va {nameOf(data, a.attendeeId)}
            </span>
          ) : (
            a.status !== 'cancelada' && <Pill tone="warn">Falta definir quién va</Pill>
          )}
        </div>

        {aviso && (
          <p className="t-body mt-3 flex items-start gap-2 text-[var(--text-secondary)]">
            <BellRing size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
            {aviso}
          </p>
        )}
        {a.status === 'atendida' && (
          <p className="t-body mt-3 rounded-2xl bg-[var(--surface-2)] p-4 text-[var(--text-primary)]">
            {a.result || 'Sin resultado anotado todavía.'}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {pendiente && !yaPaso && (
            <LinkBtn href="/app/resumen" variant="soft" size="md" full>
              <FileText size={18} aria-hidden="true" />
              Preparar resumen para el médico
            </LinkBtn>
          )}
          {pendiente && yaPaso && (
            <Btn size="md" full onClick={onAttend}>
              <Check size={18} strokeWidth={2.5} aria-hidden="true" />
              Marcar como atendida
            </Btn>
          )}
          {a.status === 'atendida' && (
            <Btn variant="secondary" size="md" full onClick={onAttend}>
              <Pencil size={18} aria-hidden="true" />
              {a.result ? 'Editar el resultado' : 'Anotar el resultado'}
            </Btn>
          )}
          {a.status === 'cancelada' && (
            <Btn variant="secondary" size="md" full onClick={onReactivate}>
              <Undo2 size={18} aria-hidden="true" />
              Reactivar la cita
            </Btn>
          )}
          {pendiente && (
            <Btn variant="ghost" size="md" full onClick={onEdit}>
              <Pencil size={18} aria-hidden="true" />
              Editar o cancelar
            </Btn>
          )}
        </div>
      </Card>
    </li>
  );
}
