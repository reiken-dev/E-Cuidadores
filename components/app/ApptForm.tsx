'use client';

// Formularios de citas: crear/editar (con recordatorios configurables) y anotar el resultado.

import { sincroTexto } from '@/lib/oferta';
import { useState } from 'react';
import { Sheet, ConfirmSheet } from './Sheet';
import { Btn, ChipToggle, Switch, TextArea, TextInput } from './ui';
import { MemberPicker, TimePicker } from './pickers';
import { useFeedback } from './Feedback';
import { actions, newId } from '@/lib/store';
import { keyFromMs } from '@/lib/dates';
import type { AppData, Appt, RemindHours } from '@/lib/types';

export function ApptForm({
  open,
  onOpenChange,
  data,
  editing,
  defaultDate,
  now,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: AppData;
  editing: Appt | null;
  defaultDate: string;
  now: number;
  onSaved: (date: string) => void;
}) {
  const { notify } = useFeedback();
  const [title, setTitle] = useState(editing?.title ?? '');
  const [specialist, setSpecialist] = useState(editing?.specialist ?? '');
  const [date, setDate] = useState(editing?.date ?? defaultDate);
  const [time, setTime] = useState(editing?.time ?? '09:00');
  const [place, setPlace] = useState(editing?.place ?? '');
  const [attendeeId, setAttendeeId] = useState<string | null>(editing ? editing.attendeeId : null);
  const [dayBefore, setDayBefore] = useState(editing?.remindDayBefore ?? data.settings.defaultRemindDayBefore);
  const [hours, setHours] = useState<RemindHours>(editing?.remindHoursBefore ?? data.settings.defaultRemindHours);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cancelOpen, setCancelOpen] = useState(false);
  const hoyK = keyFromMs(now);

  function guardar() {
    const e: Record<string, string> = {};
    if (title.trim().length < 3) e.title = 'Escribe de qué es la cita, por ejemplo Control de cardiología.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) e.date = 'Elige la fecha de la cita.';
    else if (!editing && date < hoyK) e.date = 'Elige una fecha desde hoy en adelante.';
    if (!/^\d{2}:\d{2}$/.test(time)) e.time = 'Elige la hora de la cita.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const appt: Appt = {
      id: editing?.id ?? newId(),
      title: title.trim(),
      specialist: specialist.trim(),
      date,
      time,
      place: place.trim(),
      attendeeId,
      remindDayBefore: dayBefore,
      remindHoursBefore: hours,
      status: editing?.status ?? 'pendiente',
      result: editing?.result ?? '',
    };
    actions.saveAppt(appt);
    onOpenChange(false);
    onSaved(date);
    notify(editing ? 'Guardamos los cambios de la cita.' : `Cita agregada.${sincroTexto(' Todos los hermanos la ven.', '')}`);
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={editing ? 'Editar cita' : 'Agregar una cita'}
        description={`Para ${data.profile.name}. Elige quién va y cuándo avisarles.`}
      >
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={(ev) => {
            ev.preventDefault();
            guardar();
          }}
        >
          <TextInput label="De qué es la cita" value={title} onChange={setTitle} error={errors.title} placeholder="Ej: Control de cardiología" autoFocus={!editing} />
          <TextInput label="Médico o especialista" value={specialist} onChange={setSpecialist} placeholder="Ej: Dr. Ibarra" />
          <TextInput label="Fecha" type="date" value={date} onChange={setDate} error={errors.date} min={editing ? undefined : hoyK} />
          <TimePicker label="Hora" value={time} onChange={setTime} error={errors.time} />
          <TextInput label="Lugar" value={place} onChange={setPlace} placeholder="Ej: Clínica del Valle, consultorio 304" />
          <MemberPicker label="Quién asiste" members={data.members} value={attendeeId} onChange={setAttendeeId} noneLabel="Aún sin definir" />

          <fieldset className="rounded-2xl bg-[var(--surface-2)] px-4 py-2">
            <legend className="sr-only">Recordatorios</legend>
            <Switch label="Avisar un día antes" description="A las 6:00 p. m. del día anterior" checked={dayBefore} onChange={setDayBefore} />
            <div className="pb-4">
              <p id="horas-cita" className="t-body mb-2 font-medium text-[var(--text-primary)]">
                Avisar horas antes
              </p>
              <div role="radiogroup" aria-labelledby="horas-cita" className="flex flex-wrap gap-2">
                {([0, 1, 2, 3, 4] as RemindHours[]).map((h) => (
                  <ChipToggle key={h} role="radio" selected={hours === h} onClick={() => setHours(h)}>
                    {h === 0 ? 'Sin aviso' : `${h} h`}
                  </ChipToggle>
                ))}
              </div>
            </div>
          </fieldset>

          <Btn type="submit" size="lg" full>
            {editing ? 'Guardar cambios' : 'Agregar cita'}
          </Btn>
          {editing && editing.status === 'pendiente' && (
            <Btn variant="danger" size="lg" full onClick={() => setCancelOpen(true)}>
              Cancelar esta cita
            </Btn>
          )}
        </form>
      </Sheet>
      {editing && (
        <ConfirmSheet
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          title="¿Cancelar esta cita?"
          text="Queda marcada como cancelada y los avisos programados se apagan. Puedes reactivarla cuando quieras."
          confirmLabel="Sí, cancelar la cita"
          cancelLabel="Mejor no"
          onConfirm={() => {
            actions.setApptStatus(editing.id, 'cancelada');
            onOpenChange(false);
            notify('Cita cancelada.', { label: 'Reactivar', onClick: () => actions.setApptStatus(editing.id, 'pendiente') });
          }}
        />
      )}
    </>
  );
}

export function AttendSheet({
  open,
  onOpenChange,
  appt,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appt: Appt | null;
}) {
  const { notify } = useFeedback();
  const [result, setResult] = useState(appt?.result ?? '');
  const [error, setError] = useState('');
  if (!appt) return null;
  const yaAtendida = appt.status === 'atendida';

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={yaAtendida ? 'Resultado de la cita' : 'Marcar como atendida'}
      description={`${appt.title}. Lo que anotes aparece en el resumen para el médico.`}
    >
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (result.trim().length > 600) {
            setError('El resultado es muy largo. Resúmelo en menos de 600 caracteres.');
            return;
          }
          actions.setApptStatus(appt.id, 'atendida', result.trim());
          onOpenChange(false);
          notify('Guardamos el resultado. Ya está en el resumen para el médico.');
        }}
      >
        <TextArea
          label="Qué dijo el médico"
          value={result}
          onChange={(v) => {
            setResult(v);
            setError('');
          }}
          error={error}
          rows={5}
          maxLength={700}
          placeholder="Ej: Control en 3 meses. Traer los análisis."
          hint="Puedes dejarlo vacío y anotarlo después."
          autoFocus
        />
        <Btn type="submit" size="lg" full>
          {yaAtendida ? 'Guardar resultado' : 'Guardar como atendida'}
        </Btn>
      </form>
    </Sheet>
  );
}
