'use client';

// Selectores compartidos: elegir a un hermano (grupo de opciones con avatar) y metadatos de tipos de nota.

import { useId, useState, type ReactNode } from 'react';
import { Activity, Clock3, Smile, StickyNote, Utensils, type LucideIcon } from 'lucide-react';
import { Avatar, ChipToggle, Field, inputClass, type PillTone } from './ui';
import { fmtTime } from '@/lib/dates';
import type { Member, NoteKind } from '@/lib/types';

export function MemberPicker({
  label,
  members,
  value,
  onChange,
  noneLabel,
}: {
  label: string;
  members: Member[];
  value: string | null;
  onChange: (id: string | null) => void;
  noneLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      <p className="t-body mb-2 font-medium text-[var(--text-primary)]">{label}</p>
      <div className={members.length <= 3 && !noneLabel ? 'grid grid-cols-3 gap-2' : 'flex flex-wrap gap-2'}>
        {members.map((m) => (
          <ChipToggle key={m.id} role="radio" className="justify-center px-2" selected={value === m.id} onClick={() => onChange(m.id)}>
            <Avatar name={m.name} tone={m.tone} size="sm" />
            {m.name}
          </ChipToggle>
        ))}
        {noneLabel && (
          <ChipToggle role="radio" selected={value === null} onClick={() => onChange(null)}>
            {noneLabel}
          </ChipToggle>
        )}
      </div>
    </div>
  );
}

/* ── Selector de hora propio: siempre en 12 h (hora, minutos de 5 en 5 y AM/PM) ──
   El valor es 'HH:MM' en 24 h (como lo guarda la app); se muestra como "8:05 AM".
   Se abre y se cierra en el mismo lugar para no alargar los formularios. */
const HORAS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTOS_5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const p2 = (n: number) => String(n).padStart(2, '0');

function TimeChip({ selected, onClick, children, label }: { selected: boolean; onClick: () => void; children: ReactNode; label: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onClick}
      className={`t-body flex h-11 items-center justify-center rounded-[var(--radius-button)] font-semibold tabular-nums transition-colors duration-150 [touch-action:manipulation] ${
        selected
          ? 'bg-[var(--chip-bg)] text-[var(--accent-strong)] ring-[1.5px] ring-[var(--accent)]'
          : 'bg-[var(--surface)] text-[var(--text-primary)] ring-1 ring-[color-mix(in_oklab,var(--text-tertiary)_30%,transparent)]'
      }`}
    >
      {children}
    </button>
  );
}

export function TimePicker({
  label,
  value,
  onChange,
  error,
  defaultOpen = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const [h, m] = value.split(':').map(Number);
  const pm = h >= 12;
  const h12 = h % 12 || 12;
  const set = (nh12: number, nm: number, npm: boolean) => onChange(`${p2((nh12 % 12) + (npm ? 12 : 0))}:${p2(nm)}`);

  return (
    <Field label={label} error={error}>
      {(a11y) => (
        <div>
          <button
            {...a11y}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className={`${inputClass(error)} flex h-14 items-center justify-between gap-3 text-left [touch-action:manipulation]`}
          >
            <span className="flex items-center gap-3">
              <Clock3 size={20} aria-hidden="true" className="text-[var(--text-secondary)]" />
              <span className="t-title tabular-nums">{fmtTime(value)}</span>
            </span>
            <span className="t-label text-[var(--accent-strong)]">{open ? 'Listo' : 'Cambiar'}</span>
          </button>
          {open && (
            <div id={panelId} className="mt-3 flex flex-col gap-4 rounded-2xl bg-[var(--surface-2)] p-4">
              <div role="radiogroup" aria-label="Hora">
                <p className="t-body mb-2 text-[var(--text-secondary)]">Hora</p>
                <div className="grid grid-cols-6 gap-2">
                  {HORAS_12.map((x) => (
                    <TimeChip key={x} selected={x === h12} label={`${x} en punto`} onClick={() => set(x, m, pm)}>
                      {x}
                    </TimeChip>
                  ))}
                </div>
              </div>
              <div role="radiogroup" aria-label="Minutos">
                <p className="t-body mb-2 text-[var(--text-secondary)]">Minutos</p>
                <div className="grid grid-cols-6 gap-2">
                  {MINUTOS_5.map((x) => (
                    <TimeChip key={x} selected={x === m} label={`${x} minutos`} onClick={() => set(h12, x, pm)}>
                      {p2(x)}
                    </TimeChip>
                  ))}
                </div>
              </div>
              <div role="radiogroup" aria-label="Mañana o tarde" className="grid grid-cols-2 gap-2">
                <TimeChip selected={!pm} label="De la mañana (a. m.)" onClick={() => set(h12, m, false)}>
                  a. m.
                </TimeChip>
                <TimeChip selected={pm} label="De la tarde o noche (p. m.)" onClick={() => set(h12, m, true)}>
                  p. m.
                </TimeChip>
              </div>
            </div>
          )}
        </div>
      )}
    </Field>
  );
}

export const NOTE_META: Record<NoteKind, { label: string; icon: LucideIcon; tone: PillTone }> = {
  sintoma: { label: 'Síntoma', icon: Activity, tone: 'warn' },
  animo: { label: 'Ánimo', icon: Smile, tone: 'indigo' },
  comida: { label: 'Comida y sueño', icon: Utensils, tone: 'ok' },
  otra: { label: 'Otra', icon: StickyNote, tone: 'neutral' },
};
