'use client';

// BITÁCORA — el cuaderno compartido de los hermanos. Feed por día con autor y hora, filtros por
// tipo y por hermano, y notas propias editables. Todas las notas las ven todos los hermanos.

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Avatar, Btn, Card, ChipToggle, CountUp, EmptyState, PageHeader, Pill, TextArea, memberTone } from '@/components/app/ui';
import { EscenaNota } from '@/components/brand/Escenas';
import { NOTE_META } from '@/components/app/pickers';
import { Sheet } from '@/components/app/Sheet';
import { useFeedback } from '@/components/app/Feedback';
import { fmtClock, keyFromMs, relativeDay } from '@/lib/dates';
import { nameOf } from '@/lib/schedule';
import { actions, newId, useAppData, useNow } from '@/lib/store';
import { datosTexto, sincroTexto } from '@/lib/oferta';
import { NOTE_KINDS, type Note, type NoteKind } from '@/lib/types';

export default function BitacoraScreen() {
  const data = useAppData();
  const now = useNow();
  const { notify } = useFeedback();
  const [kind, setKind] = useState<NoteKind | 'todas'>('todas');
  const [autor, setAutor] = useState<string | 'todos'>('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Note | null>(null);

  const hoyK = keyFromMs(now);
  const ordenadas = [...data.notes].sort((a, b) => b.at - a.at);
  const visibles = ordenadas.filter((n) => (kind === 'todas' || n.kind === kind) && (autor === 'todos' || n.authorId === autor));
  const hayFiltros = kind !== 'todas' || autor !== 'todos';
  const semana = data.notes.filter((n) => n.at > now - 7 * 86400000);
  const sintomas = semana.filter((n) => n.kind === 'sintoma').length;
  const usarFiltros = data.notes.length > 8;

  const grupos: { k: string; notas: Note[] }[] = [];
  for (const n of visibles) {
    const k = keyFromMs(n.at);
    const g = grupos.find((x) => x.k === k);
    if (g) g.notas.push(n);
    else grupos.push({ k, notas: [n] });
  }

  function abrir(n: Note | null) {
    setEditing(n);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function borrar(n: Note) {
    actions.deleteNote(n.id);
    notify('Borramos tu nota.', { label: 'Deshacer', onClick: () => actions.saveNote(n) });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Bitácora"
        subtitle="Lo que cada hermano ve, entre todos"
        action={
          data.notes.length > 0 ? (
            <Btn onClick={() => abrir(null)}>
              <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
              Nueva nota
            </Btn>
          ) : undefined
        }
      />

      {data.notes.length === 0 ? (
        <EmptyState
          escena={<EscenaNota />}
          title="Aquí se junta todo lo que van notando"
          text={`Anota las novedades para el resumen médico.${sincroTexto(' Todo el círculo las ve.', datosTexto(' Quedan guardadas en tu cuenta.', ' Quedan en este dispositivo.'))}`}
        >
          <Btn size="lg" full onClick={() => abrir(null)}>
            Escribir la primera nota
          </Btn>
        </EmptyState>
      ) : (
        <>
          <Card as="section" className="flex items-center justify-between gap-4 p-4">
            <div>
              <h2 className="t-sub text-[var(--text-primary)]">Esta semana</h2>
              <p className="t-body mt-1 text-[var(--text-secondary)]">
                {sintomas > 0
                  ? `${sintomas} ${sintomas === 1 ? 'síntoma anotado' : 'síntomas anotados'}`
                  : 'Sin síntomas anotados'}
              </p>
            </div>
            <p className="t-hero text-[var(--accent)]">
              <CountUp to={semana.length} />
              <span className="t-body text-[var(--text-secondary)]"> {semana.length === 1 ? 'nota' : 'notas'}</span>
            </p>
          </Card>

          <section aria-label="Filtros" className="flex flex-col gap-2">
            <div role="group" aria-label="Filtrar por tipo" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              <ChipToggle selected={kind === 'todas'} onClick={() => setKind('todas')}>
                Todas
              </ChipToggle>
              {NOTE_KINDS.map((k) => (
                <ChipToggle key={k.id} selected={kind === k.id} icon={NOTE_META[k.id].icon} onClick={() => setKind(k.id)}>
                  {k.label}
                </ChipToggle>
              ))}
            </div>
            {(usarFiltros || data.members.length > 1) && (
              <div role="group" aria-label="Filtrar por hermano" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                <ChipToggle selected={autor === 'todos'} onClick={() => setAutor('todos')}>
                  Todos
                </ChipToggle>
                {data.members.map((m) => (
                  <ChipToggle key={m.id} selected={autor === m.id} onClick={() => setAutor(m.id)}>
                    <Avatar name={m.name} tone={m.tone} size="sm" />
                    {m.name}
                  </ChipToggle>
                ))}
              </div>
            )}
            {hayFiltros && (
              <p role="status" className="t-body flex items-center gap-2 text-[var(--text-secondary)]">
                Mostrando {visibles.length} de {data.notes.length}.
                <button
                  type="button"
                  onClick={() => {
                    setKind('todas');
                    setAutor('todos');
                  }}
                  className="min-h-11 font-semibold text-[var(--accent)] underline underline-offset-4 [touch-action:manipulation]"
                >
                  Quitar filtros
                </button>
              </p>
            )}
          </section>

          {visibles.length === 0 ? (
            <Card className="flex flex-col items-center px-6 py-8 text-center">
              <h2 className="t-sub text-[var(--text-primary)]">Ninguna nota con estos filtros</h2>
              <p className="t-body mt-2 text-[var(--text-secondary)]">Prueba con otro tipo u otro hermano.</p>
              <Btn
                variant="soft"
                size="lg"
                full
                className="mt-4 max-w-72"
                onClick={() => {
                  setKind('todas');
                  setAutor('todos');
                }}
              >
                Quitar filtros
              </Btn>
            </Card>
          ) : (
            grupos.map((g) => (
              <section key={g.k} aria-label={relativeDay(g.k, hoyK)} className="flex flex-col gap-3">
                <h2 className="t-body px-2 font-semibold text-[var(--text-secondary)]">{relativeDay(g.k, hoyK)}</h2>
                <ul className="flex flex-col gap-3">
                  {g.notas.map((n) => {
                    const meta = NOTE_META[n.kind];
                    const propia = n.authorId === data.currentUserId;
                    return (
                      <li key={n.id}>
                        <Card as="article" className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar name={nameOf(data, n.authorId)} tone={memberTone(data.members, n.authorId)} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="t-body font-medium text-[var(--text-primary)]">
                                  {nameOf(data, n.authorId)}
                                  <span className="t-label font-normal text-[var(--text-secondary)]"> · {fmtClock(n.at)}</span>
                                </p>
                                <Pill tone={meta.tone} icon={meta.icon}>
                                  {meta.label}
                                </Pill>
                              </div>
                              <p className="t-body mt-2 text-[var(--text-primary)]">{n.text}</p>
                            </div>
                          </div>
                          {propia && (
                            <div className="mt-2 flex justify-end gap-1">
                              <Btn variant="ghost" size="sm" onClick={() => abrir(n)}>
                                <Pencil size={16} aria-hidden="true" />
                                Editar
                              </Btn>
                              <Btn variant="ghost" size="sm" onClick={() => borrar(n)}>
                                <Trash2 size={16} aria-hidden="true" />
                                Borrar
                              </Btn>
                            </div>
                          )}
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      <NoteForm key={formKey} open={formOpen} onOpenChange={setFormOpen} editing={editing} authorId={data.currentUserId} />
    </div>
  );
}

function NoteForm({
  open,
  onOpenChange,
  editing,
  authorId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Note | null;
  authorId: string;
}) {
  const { notify } = useFeedback();
  const [kind, setKind] = useState<NoteKind>(editing?.kind ?? 'sintoma');
  const [text, setText] = useState(editing?.text ?? '');
  const [error, setError] = useState('');

  function guardar() {
    const t = text.trim();
    if (t.length < 3) {
      setError('Escribe al menos una frase corta para que los demás entiendan.');
      return;
    }
    actions.saveNote({
      id: editing?.id ?? newId(),
      kind,
      text: t,
      authorId: editing?.authorId ?? authorId,
      at: editing?.at ?? Date.now(),
    });
    onOpenChange(false);
    notify(editing ? 'Guardamos los cambios de tu nota.' : `Nota guardada.${sincroTexto(' Todos los hermanos la ven.', '')}`);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Editar tu nota' : 'Nueva nota'}
      description={sincroTexto('La verán todos los hermanos del círculo.', 'Queda guardada en la bitácora.')}
    >
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          guardar();
        }}
      >
        <div role="radiogroup" aria-label="Tipo de nota">
          <p className="t-body mb-2 font-medium text-[var(--text-primary)]">De qué trata</p>
          <div className="flex flex-wrap gap-2">
            {NOTE_KINDS.map((k) => (
              <ChipToggle key={k.id} role="radio" selected={kind === k.id} icon={NOTE_META[k.id].icon} onClick={() => setKind(k.id)}>
                {k.label}
              </ChipToggle>
            ))}
          </div>
        </div>
        <TextArea
          label="Qué pasó"
          value={text}
          onChange={(v) => {
            setText(v);
            setError('');
          }}
          error={error}
          rows={5}
          maxLength={600}
          placeholder="Ej: Hoy amaneció con un poco de mareo. Se sentó un rato y se le pasó."
          hint={`${text.length} de 600 caracteres`}
          autoFocus
        />
        <Btn type="submit" size="lg" full>
          {editing ? 'Guardar cambios' : 'Publicar nota'}
        </Btn>
      </form>
    </Sheet>
  );
}
