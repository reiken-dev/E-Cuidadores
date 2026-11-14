'use client';

// Formulario de medicina (agregar y editar) en hoja inferior, con validación inline.

import { sincroTexto } from '@/lib/oferta';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Sheet } from './Sheet';
import { Btn, ChipToggle, TextInput } from './ui';
import { MemberPicker, TimePicker } from './pickers';
import { useFeedback } from './Feedback';
import { DIAS_CORTOS, cap, keyFromMs, parseTimeInput } from '@/lib/dates';
import { actions, newId } from '@/lib/store';
import type { AppData, Freq, Med } from '@/lib/types';

const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];
type Kind = Freq['kind'];

export function MedForm({
  open,
  onOpenChange,
  data,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: AppData;
  editing: Med | null;
}) {
  const { notify } = useFeedback();
  const [name, setName] = useState(editing?.name ?? '');
  const [dose, setDose] = useState(editing?.dose ?? '');
  const [times, setTimes] = useState<string[]>(editing?.times ?? ['08:00']);
  const [kind, setKind] = useState<Kind>(editing?.freq.kind ?? 'daily');
  const [days, setDays] = useState<number[]>(editing?.freq.kind === 'weekdays' ? editing.freq.days : [1, 3, 5]);
  const [every, setEvery] = useState(editing?.freq.kind === 'interval' ? String(editing.freq.every) : '2');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [giverId, setGiverId] = useState<string | null>(editing ? editing.giverId : data.currentUserId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function guardar() {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Escribe el nombre de la medicina.';
    if (dose.trim().length < 1) e.dose = 'Escribe la dosis, por ejemplo 50 mg o 1 pastilla.';
    const limpias = times.map((t) => parseTimeInput(t));
    if (limpias.some((t) => t === null)) e.times = 'Revisa los horarios: elige una hora en cada uno.';
    else if (new Set(limpias).size !== limpias.length) e.times = 'Hay dos horarios iguales. Quita uno.';
    if (kind === 'weekdays' && days.length === 0) e.days = 'Elige al menos un día de la semana.';
    if (kind === 'interval' && !(/^\d{1,2}$/.test(every) && Number(every) >= 2 && Number(every) <= 30))
      e.every = 'Escribe cada cuántos días, entre 2 y 30.';
    setErrors(e);
    if (Object.keys(e).length) return;

    const freq: Freq =
      kind === 'daily'
        ? { kind: 'daily' }
        : kind === 'weekdays'
          ? { kind: 'weekdays', days: [...days].sort() }
          : {
              kind: 'interval',
              every: Number(every),
              anchor: editing?.freq.kind === 'interval' ? editing.freq.anchor : keyFromMs(Date.now()),
            };
    const med: Med = {
      id: editing?.id ?? newId(),
      name: name.trim(),
      dose: dose.trim(),
      times: (limpias as string[]).sort(),
      freq,
      notes: notes.trim(),
      giverId,
      paused: editing?.paused ?? false,
      startAt: editing?.startAt ?? Date.now(),
    };
    actions.saveMed(med);
    onOpenChange(false);
    notify(editing ? `Guardamos los cambios de ${med.name}.` : `Agregamos ${med.name}. Ya aparece en Hoy.`);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `Editar ${editing.name}` : 'Agregar una medicina'}
      description={`Para ${data.profile.name}.${sincroTexto(' Todos los hermanos la verán.', '')}`}
    >
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar();
        }}
      >
        <TextInput label="Nombre" value={name} onChange={setName} error={errors.name} placeholder="Ej: Losartán" autoFocus={!editing} />
        <TextInput label="Dosis" value={dose} onChange={setDose} error={errors.dose} placeholder="Ej: 50 mg" />

        <fieldset className="flex flex-col gap-2">
          <legend className="t-body mb-2 font-medium text-[var(--text-primary)]">Horarios</legend>
          {times.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <TimePicker
                  label={`Horario ${i + 1}`}
                  value={parseTimeInput(t) ?? '08:00'}
                  onChange={(v) => setTimes(times.map((x, j) => (j === i ? v : x)))}
                />
              </div>
              {times.length > 1 && (
                <button
                  type="button"
                  aria-label={`Quitar el horario ${i + 1}`}
                  onClick={() => setTimes(times.filter((_, j) => j !== i))}
                  className="mt-9 flex size-12 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] [touch-action:manipulation]"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
          {errors.times && (
            <p role="alert" className="t-body text-[var(--danger-text)]">
              {errors.times}
            </p>
          )}
          {times.length < 6 && (
            <Btn variant="soft" size="sm" className="self-start" onClick={() => setTimes([...times, '20:00'])}>
              <Plus size={16} aria-hidden="true" />
              Agregar otro horario
            </Btn>
          )}
        </fieldset>

        <div role="radiogroup" aria-label="Frecuencia">
          <p className="t-body mb-2 font-medium text-[var(--text-primary)]">Con qué frecuencia</p>
          <div className="flex flex-wrap gap-2">
            <ChipToggle role="radio" selected={kind === 'daily'} onClick={() => setKind('daily')}>
              Todos los días
            </ChipToggle>
            <ChipToggle role="radio" selected={kind === 'weekdays'} onClick={() => setKind('weekdays')}>
              Días de la semana
            </ChipToggle>
            <ChipToggle role="radio" selected={kind === 'interval'} onClick={() => setKind('interval')}>
              Cada cierto número de días
            </ChipToggle>
          </div>
        </div>

        {kind === 'weekdays' && (
          <div>
            <p className="t-body mb-2 font-medium text-[var(--text-primary)]">Qué días</p>
            <div className="flex flex-wrap gap-2">
              {ORDEN_SEMANA.map((d) => (
                <ChipToggle
                  key={d}
                  selected={days.includes(d)}
                  onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}
                >
                  {cap(DIAS_CORTOS[d])}
                </ChipToggle>
              ))}
            </div>
            {errors.days && (
              <p role="alert" className="t-body mt-2 text-[var(--danger-text)]">
                {errors.days}
              </p>
            )}
          </div>
        )}
        {kind === 'interval' && (
          <TextInput
            label="Cada cuántos días"
            value={every}
            onChange={setEvery}
            inputMode="numeric"
            error={errors.every}
            hint="Por ejemplo 2 para un día por medio."
          />
        )}

        <TextInput label="Notas (opcional)" value={notes} onChange={setNotes} placeholder="Ej: lo que indicó el médico" />

        <MemberPicker
          label="Quién suele dársela"
          members={data.members}
          value={giverId}
          onChange={setGiverId}
          noneLabel="Por turnos"
        />

        <Btn type="submit" size="lg" full>
          {editing ? 'Guardar cambios' : 'Agregar medicina'}
        </Btn>
      </form>
    </Sheet>
  );
}
