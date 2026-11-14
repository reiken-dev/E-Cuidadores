'use client';

// Hoja rápida para "Confirmar dosis". REGLA DE LA CONSTITUCIÓN: una dosis nunca se confirma
// sin decir QUIÉN la dio y a qué hora (por defecto: tú y ahora). La hora se elige entre 3 opciones
// (ahora, la hora de la dosis u otra); el selector fino de hora solo aparece con "Otra hora".

import { useState } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Sheet } from './Sheet';
import { Btn, ChipToggle } from './ui';
import { MemberPicker, TimePicker } from './pickers';
import { useFeedback } from './Feedback';
import { atTime, floorTo5, fmtTime, timeFromMs } from '@/lib/dates';
import { giverFor, nameOf, type DoseInstance } from '@/lib/schedule';
import { actions } from '@/lib/store';
import { sincroTexto } from '@/lib/oferta';
import { SKIP_REASONS, type AppData, type SkipReason } from '@/lib/types';

type Cuando = 'ahora' | 'programada' | 'otra';

export function ConfirmDoseSheet({
  open,
  onOpenChange,
  dose,
  data,
  now,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dose: DoseInstance | null;
  data: AppData;
  now: number;
}) {
  // El padre remonta este componente con `key` distinto por dosis, así el formulario arranca limpio.
  const [byId, setById] = useState<string | null>(data.currentUserId);
  const [cuando, setCuando] = useState<Cuando>('ahora');
  const [horaAhora] = useState(() => timeFromMs(now));
  const [hora, setHora] = useState(floorTo5(timeFromMs(now)));
  const [error, setError] = useState('');
  const [modo, setModo] = useState<'dada' | 'omitida'>('dada');
  const [motivo, setMotivo] = useState<SkipReason | null>(null);
  const { celebrate, notify } = useFeedback();

  if (!dose) return null;
  const temprano = dose.at - now > 2 * 3600000;
  const nombreMed = `${dose.med.name} ${dose.med.dose}`.trim();
  const toca = giverFor(dose.med, dose.date, data.members);
  const otroTurno = toca && toca.id !== data.currentUserId ? toca.name : null;

  // Decir la verdad también suma: "no se dio" queda registrado con su motivo y el médico lo ve.
  function omitir() {
    if (!dose) return;
    if (!byId) {
      setError('Elige quién lo anota.');
      return;
    }
    if (!motivo) {
      setError('Elige por qué no se dio.');
      return;
    }
    if (!actions.skipDose({ medId: dose.med.id, date: dose.date, time: dose.time, byId, reason: motivo })) {
      setError('No pudimos guardarlo. Vuelve a intentarlo.');
      return;
    }
    onOpenChange(false);
    notify('Anotado. Gracias por contarlo: el médico lo verá en el resumen y nadie se queda con la duda.');
  }

  function confirmar() {
    if (!dose) return;
    if (!byId) {
      setError('Elige quién dio la dosis.');
      return;
    }
    let at: number;
    if (cuando === 'ahora') at = Date.now();
    else if (cuando === 'programada') at = dose.at;
    else {
      at = atTime(dose.date, hora);
      if (at > Date.now() + 2 * 60000) {
        setError('Esa hora todavía no llega. Elige una hora que ya pasó.');
        return;
      }
    }
    if (!actions.confirmDose({ medId: dose.med.id, date: dose.date, time: dose.time, byId, at })) {
      setError('No pudimos guardar la dosis. Vuelve a elegir quién la dio.');
      return;
    }
    onOpenChange(false);
    const yo = nameOf(data, data.currentUserId);
    celebrate(
      'Dosis confirmada',
      byId === data.currentUserId
        ? `Gracias, ${yo}.${sincroTexto(' Todos ya lo ven.', ' Quedó con tu nombre y la hora.')}`
        : `Gracias, ${yo}. Quedó anotado que la dio ${nameOf(data, byId)}.${sincroTexto(' Todos ya lo ven.', '')}`
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Confirmar dosis"
      description={`${nombreMed} de las ${fmtTime(dose.time)} para ${data.profile.name}${otroTurno ? `. Le tocaba a ${otroTurno}.` : ''}`}
      footer={
        <div className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="t-body flex items-start gap-2 text-[var(--danger-text)]">
              <AlertCircle size={16} className="mt-px shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          <Btn type="submit" form="confirmar-dosis" size="lg" full>
            {modo === 'dada' ? 'Confirmar dosis' : 'Anotar que no se dio'}
          </Btn>
        </div>
      }
    >
      <form
        id="confirmar-dosis"
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (modo === 'dada') confirmar();
          else omitir();
        }}
      >
        <div role="radiogroup" aria-label="Qué pasó con la dosis" className="grid grid-cols-2 gap-2">
          <ChipToggle role="radio" selected={modo === 'dada'} onClick={() => { setModo('dada'); setError(''); }}>
            Se la dieron
          </ChipToggle>
          <ChipToggle role="radio" selected={modo === 'omitida'} onClick={() => { setModo('omitida'); setError(''); }}>
            No se dio
          </ChipToggle>
        </div>
        {temprano && modo === 'dada' && (
          <p role="note" className="t-body flex items-start gap-3 rounded-2xl bg-[color-mix(in_oklab,var(--warn)_22%,transparent)] p-4 text-[var(--warn-text)]">
            <AlertTriangle size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
            Todavía no es la hora ({fmtTime(dose.time)}). Confirma solo si ya la dieron, para no repetirla.
          </p>
        )}
        <MemberPicker
          label={modo === 'dada' ? 'Quién la dio' : 'Quién lo anota'}
          members={data.members}
          value={byId}
          onChange={(id) => {
            setById(id);
            setError('');
          }}
        />
        {modo === 'omitida' && (
          <div role="radiogroup" aria-label="Por qué no se dio">
            <p className="t-body mb-2 font-medium text-[var(--text-primary)]">Por qué no se dio</p>
            <div className="flex flex-col gap-2">
              {SKIP_REASONS.map((r) => (
                <ChipToggle key={r.id} role="radio" selected={motivo === r.id} onClick={() => { setMotivo(r.id); setError(''); }}>
                  {r.label}
                </ChipToggle>
              ))}
            </div>
            <p className="t-body mt-3 text-[var(--text-secondary)]">Un día así no rompe nada: contarlo mantiene el registro completo.</p>
          </div>
        )}
        {modo === 'dada' && (
        <div role="radiogroup" aria-label="A qué hora la dio">
          <p className="t-body mb-2 font-medium text-[var(--text-primary)]">A qué hora la dio</p>
          <div className="flex flex-col gap-2">
            <ChipToggle role="radio" selected={cuando === 'ahora'} onClick={() => { setCuando('ahora'); setError(''); }}>
              Ahora, {fmtTime(horaAhora)}
            </ChipToggle>
            {!temprano && (
              <ChipToggle role="radio" selected={cuando === 'programada'} onClick={() => { setCuando('programada'); setError(''); }}>
                A la hora de la dosis, {fmtTime(dose.time)}
              </ChipToggle>
            )}
            <ChipToggle role="radio" selected={cuando === 'otra'} onClick={() => { setCuando('otra'); setError(''); }}>
              Otra hora
            </ChipToggle>
          </div>
        </div>
        )}
        {modo === 'dada' && cuando === 'otra' && (
          <TimePicker
            label="Elige la hora"
            value={hora}
            defaultOpen
            onChange={(v) => {
              setHora(v);
              setError('');
            }}
          />
        )}
      </form>
    </Sheet>
  );
}
