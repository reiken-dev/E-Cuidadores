'use client';

// ONBOARDING — E-Cuidadores
// Wizard de un solo flujo (sin recarga de página): promesa, preguntas, muestra del valor, dudas y paywall.
// Las respuestas se usan de verdad: nombres, parentesco, hermanos, preocupación y la primera medicina.
// Antes de guardar la medicina, la persona autoriza expresamente el tratamiento de sus datos de salud.
//
// El paywall vive DENTRO de este mismo wizard (no en una ruta /paywall aparte) para no perder el
// estado de las respuestas al cambiar de ruta. Al completar el paywall, se navega a /entrar (login).
// Las respuestas y el paso actual viven en components/onboarding/wizardStore.ts
// (sessionStorage): recargar a mitad del recorrido restaura el paso y lo escrito.

import { useEffect, useId, useRef, useState, type Ref } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Pill, CalendarClock, MessagesSquare, Sparkles, HeartHandshake } from 'lucide-react';
import {
  ChipList,
  ChipOption,
  FixedCta,
  PrivacyNote,
  SkipLink,
  QuestionHeading,
  QuickChips,
  StepFrame,
  TextField,
  useAutoAdvance,
  useReducedMotionSafe,
} from '@/components/onboarding/OnboardingUI';
import { track } from '@/lib/analytics';
import { Circulo } from '@/components/brand/Circulo';
import { PaywallScreen } from '@/components/onboarding/PaywallScreen';
import { wizard, useHydrated, useWizard, type PreocupacionId } from '@/components/onboarding/wizardStore';
import { actions, MODO_REMOTO } from '@/lib/store';
import { guardarBorrador } from '@/lib/datos/borrador';
import { fmtTime, parseTimeInput } from '@/lib/dates';
import { GARANTIA_DIAS, TRIAL_DIAS, sincroTexto, tieneTrial } from '@/lib/oferta';

// Progreso por pantalla (arranca en piso 8%, endowed progress, nunca retrocede al avanzar).
// Índices: 0 Q1 · 1 nombres · 2 hermanos · 3 preocupación · 4 reconocimiento · 5 medicina · 6 muestra · 7 dudas · 8 paywall.
const PROGRESO = [8, 22, 38, 54, 70, 84, 92, 98];

// Horarios rápidos del primer medicamento: rellenan el campo (no avanzan solos); el campo libre sigue.
const HORARIOS_RAPIDOS = [
  { label: 'Mañana', value: '8:00 AM' },
  { label: 'Tarde', value: '2:00 PM' },
  { label: 'Noche', value: '9:00 PM' },
];
const HORARIO_POR_DEFECTO = '8:00 a. m.';

/** Una hora escrita como "8" o "8:30" (sin AM/PM y de 1 a 12) es ambigua: puede ser mañana o noche. */
function horaAmbigua(texto: string): boolean {
  const t = texto.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
  const m = /^(\d{1,2})(?::?(\d{2}))?$/.exec(t);
  if (!m) return false;
  const h = Number(m[1]);
  return h >= 1 && h <= 12 && !t.startsWith('0');
}

const OPCIONES_QUIEN = ['Mi mamá', 'Mi papá', 'Otro familiar mayor'];
const OPCIONES_HERMANOS = ['Solo yo por ahora', '1 hermano', '2 hermanos', '3 o más'];

// Lo que el usuario contó en el recorrido se guarda en el almacén local de la app (sin red) para
// que al entrar a /app vea SU información: el nombre de su familiar, sus hermanos y su medicina.
const PARENTESCO: Record<string, string> = { 'Mi mamá': 'Mamá', 'Mi papá': 'Papá', 'Otro familiar mayor': 'Familiar mayor' };
const PERSONAS: Record<string, number> = { 'Solo yo por ahora': 1, '1 hermano': 2, '2 hermanos': 3, '3 o más': 4 };
const OPCIONES_PREOCUPACION: { id: PreocupacionId; label: string; icon: typeof Pill }[] = [
  { id: 'medicamentos', label: 'Se le olvidan los medicamentos', icon: Pill },
  { id: 'citas', label: 'No sabemos quién va a las citas', icon: CalendarClock },
  { id: 'chat', label: 'Perdemos información en el chat familiar', icon: MessagesSquare },
  { id: 'variado', label: 'Un poco de todo', icon: Sparkles },
];

export default function OnboardingPage() {
  const hydrated = useHydrated();
  // Hasta que el navegador lee lo guardado no se pinta ningún paso: así una recarga a mitad
  // del recorrido no muestra un instante la pregunta 1 antes de saltar al paso correcto.
  if (!hydrated) return <div className="min-h-dvh bg-[var(--bg)]" aria-hidden="true" />;
  return <Recorrido />;
}

function Recorrido() {
  const router = useRouter();
  const { step, quien, nombre, organizerName, hermanos, preocupacion, medicamento, horario, avisar } = useWizard();
  const [direction, setDirection] = useState(1);
  useEffect(() => {
    track('onboarding_paso', { paso: step });
  }, [step]);

  // Errores inline junto al campo: el CTA nunca se apaga; el error dice qué falta.
  const [errorNombre, setErrorNombre] = useState('');
  const [errorOrganizador, setErrorOrganizador] = useState('');
  const [errorMedicamento, setErrorMedicamento] = useState('');
  const [errorHorario, setErrorHorario] = useState('');
  // Autorización de datos de salud para la primera medicina: vive solo en memoria (no en el navegador).
  const [autorizaSalud, setAutorizaSalud] = useState(false);
  const [errorAutoriza, setErrorAutoriza] = useState('');
  const nombreRef = useRef<HTMLInputElement>(null);
  const organizadorRef = useRef<HTMLInputElement>(null);
  const medicamentoRef = useRef<HTMLInputElement>(null);
  const horarioRef = useRef<HTMLInputElement>(null);
  const autorizaRef = useRef<HTMLInputElement>(null);

  const ir = (n: number) => {
    setDirection(n > step ? 1 : -1);
    wizard.set({ step: n });
  };
  const avanzar = () => ir(step + 1);
  // Salida de una pregunta sin responderla: no guarda nada y avanza. Un solo lugar para el evento y el paso.
  const omitirPaso = () => {
    track('onboarding_omitido', { paso: step });
    avanzar();
  };
  const { run: autoAvanzar, cancel: cancelarAvance } = useAutoAdvance(avanzar);
  const retroceder = () => {
    cancelarAvance();
    if (step === 0) {
      router.push('/');
      return;
    }
    ir(step - 1);
  };
  /** "Lo agrego después": no guarda nada de lo escrito (ni un medicamento a medias ni una hora ambigua). */
  const omitirMedicamento = () => {
    wizard.set({ medicamento: '', horario: '' });
    setErrorMedicamento('');
    setErrorHorario('');
    setErrorAutoriza('');
    avanzar();
  };

  const nombreMostrado = nombre.trim() || 'tu familiar';
  const hasProgress = quien !== '' || nombre !== '' || step > 0;

  function confirmarNombre() {
    if (nombre.trim().length < 2) {
      setErrorNombre('Escribe su nombre para continuar');
      nombreRef.current?.focus();
      return;
    }
    if (organizerName.trim().length < 2) {
      setErrorOrganizador('Escribe tu nombre para saber quién organiza el cuidado');
      organizadorRef.current?.focus();
      return;
    }
    setErrorNombre('');
    setErrorOrganizador('');
    avanzar();
  }

  function confirmarMedicamento() {
    if (medicamento.trim().length === 0) {
      setErrorMedicamento('Escribe el medicamento, o toca "Lo agrego después"');
      medicamentoRef.current?.focus();
      return;
    }
    if (horario.trim() && parseTimeInput(horario) === null) {
      setErrorHorario('No entendí la hora. Prueba con 8:00 a. m. o 20:30');
      horarioRef.current?.focus();
      return;
    }
    if (horario.trim() && horaAmbigua(horario)) {
      setErrorHorario('¿De la mañana o de la noche? Escríbelo con a. m. o p. m., como 8:00 p. m.');
      horarioRef.current?.focus();
      return;
    }
    // Dato de salud: no se guarda ni se muestra nada sin la autorización explícita de la persona.
    if (!autorizaSalud) {
      setErrorAutoriza(`Marca la autorización para guardar el medicamento de ${nombreMostrado}. Sin ella no lo guardamos.`);
      autorizaRef.current?.focus();
      return;
    }
    setErrorMedicamento('');
    setErrorHorario('');
    setErrorAutoriza('');
    avanzar();
  }

  // PAYWALL (sin TopProgress: usa X de cierre)
  if (step === 8) {
    return (
      <PaywallScreen
        nombre={nombreMostrado}
        preocupacion={preocupacion || 'variado'}
        respuestasContadas={5}
        avisar={avisar}
        onAvisarChange={(v) => wizard.set({ avisar: v })}
        onBack={() => ir(7)}
        onEmpezarTrial={(planElegido) => {
          track('prueba_iniciada', { plan: planElegido });
          const med = medicamento.trim();
          const hora = parseTimeInput(horario) ?? parseTimeInput(HORARIO_POR_DEFECTO) ?? '08:00';
          if (MODO_REMOTO) {
            // Con cuenta real el círculo se crea después, con sesión y compra activa (/bienvenida). Se guardan las
            // respuestas en este navegador, solo hasta entonces.
            guardarBorrador({ nombreFamiliar: nombre.trim(), parentesco: PARENTESCO[quien] ?? 'Familiar mayor', tuNombre: organizerName.trim(), medicina: med, hora });
            wizard.discard();
            router.push('/entrar?modo=crear');
            return;
          }
          actions.applyOnboarding({
            name: nombre.trim() || undefined,
            organizerName: organizerName.trim() || undefined,
            relation: PARENTESCO[quien],
            members: PERSONAS[hermanos],
            firstMed: med ? { name: med, time: parseTimeInput(horario) ?? parseTimeInput(HORARIO_POR_DEFECTO) ?? '08:00' } : null,
          });
          wizard.discard();
          router.push('/entrar?modo=crear');
        }}
      />
    );
  }

  return (
    <StepFrame direction={direction} stepKey={step} percent={PROGRESO[step] ?? 98} onBack={retroceder} showBack={step > 0} hasProgress={hasProgress}>
      {/* PREGUNTA 1 — ¿A quién vas a cuidar? (selección única, auto-avance).
          Promesa en el micro: lo que la familia deja de hacer. Todas las preguntas anclan arriba con el mismo
          dato-héroe (misma altura), así el título no salta entre pasos. */}
      {step === 0 && (
        <>
          <QuestionHeading
            paso={1}
            title="¿A quién vas a cuidar?"
              micro="Prepararemos su registro de medicinas y citas. Puedes completar más datos después."

          />
          {/* Ilustración que llena el bloque: el Círculo de Cuidado, el dispositivo de la marca, en la primera pregunta. */}
          <div aria-hidden="true" className="mt-4 flex h-[200px] items-center justify-center overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <Circulo size={200} />
          </div>
          <ChipList>
            {OPCIONES_QUIEN.map((op) => (
              <ChipOption key={op} label={op} selected={quien === op} onSelect={() => autoAvanzar(op, (v) => wizard.set({ quien: v }))} />
            ))}
          </ChipList>
          <QueRecibiras />
          <PrivacyNote />
        </>
      )}

      {/* PREGUNTA 2 — ¿Cómo se llama? (input libre + CTA, siempre vivo). Los nombres abren el plan: "Plan de Rosa". */}
      {step === 1 && (
        <>
          <QuestionHeading paso={2} title="Pongamos los nombres"  />
          <TextField
            label="Nombre de tu familiar"
            value={nombre}
            onChange={(v) => {
              wizard.set({ nombre: v });
              if (errorNombre) setErrorNombre('');
            }}
            placeholder="Ej: Rosa, Don Manuel…"
            autoFocus
            onEnter={confirmarNombre}
            error={errorNombre}
            inputRef={nombreRef}
          />
          <TextField
            label="Tu nombre"
            value={organizerName}
            onChange={(v) => {
              wizard.set({ organizerName: v });
              if (errorOrganizador) setErrorOrganizador('');
            }}
            placeholder="Ej: Marta"
            onEnter={confirmarNombre}
            error={errorOrganizador}
            inputRef={organizadorRef}
          />
          <NombrePreview nombre={nombre} />
          <FixedCta label={nombre.trim().length >= 2 ? `Seguir con ${nombre.trim().split(/\s+/)[0]}` : 'Continuar'} onClick={confirmarNombre} />
        </>
      )}

      {/* PREGUNTA 3 — ¿Cuántos hermanos van a usar la app contigo? (selección única, auto-avance).
          Se usa: define las personas del círculo (contigo incluido) y la invitación. */}
      {step === 2 && (
        <>
          <QuestionHeading
            paso={3}
            title="¿Cuántos hermanos te ayudan?"
            micro="Entran gratis: no pagan aparte."
          />
          <ChipList>
            {OPCIONES_HERMANOS.map((op) => (
              <ChipOption key={op} label={op} selected={hermanos === op} onSelect={() => autoAvanzar(op, (v) => wizard.set({ hermanos: v }))} />
            ))}
          </ChipList>
          <SkipLink onClick={omitirPaso} />
          <PrivacyNote />
        </>
      )}

      {/* PREGUNTA 4 — ¿Qué te preocupa más hoy? (selección única con ícono, auto-avance).
          Se usa: decide qué aparece primero en la muestra del paso 7 y en el paywall. */}
      {step === 3 && (
        <>
          <QuestionHeading paso={4} title="¿Qué te preocupa más hoy?" micro="Lo ponemos primero en tu plan." />
          <ChipList>
            {OPCIONES_PREOCUPACION.map((op) => (
              <ChipOption
                key={op.id}
                label={op.label}
                icon={op.icon}
                selected={preocupacion === op.id}
                onSelect={() => autoAvanzar(op.id, (v) => wizard.set({ preocupacion: v as PreocupacionId }))}
              />
            ))}
          </ChipList>
          <SkipLink onClick={omitirPaso} />
          <PrivacyNote />
        </>
      )}

      {/* RECONOCIMIENTO tras la pregunta sensible: la causa es el sistema, no la persona. */}
      {step === 4 && (
        <Reconocimiento
          nombre={nombreMostrado}
          inicial={nombre.trim() ? nombre.trim().charAt(0).toUpperCase() : ''}
          preocupacion={preocupacion || 'variado'}
          onContinuar={avanzar}
        />
      )}

      {/* PREGUNTA 5 — Compromiso: la primera medicina real (dato de salud → autorización explícita antes de guardarla). */}
      {step === 5 && (
        <>
          <QuestionHeading
            paso={5}
            title={`¿Qué medicamento toma ${nombreMostrado} ahora mismo?`}
            micro="Puedes agregar las demás medicinas después."
          />
          <div className="flex flex-col gap-3">
            <TextField
              label="Nombre del medicamento"
              value={medicamento}
              onChange={(v) => {
                wizard.set({ medicamento: v });
                if (errorMedicamento) setErrorMedicamento('');
              }}
              placeholder="Ej: Losartán"
              autoFocus
              onEnter={confirmarMedicamento}
              error={errorMedicamento}
              inputRef={medicamentoRef}
            />
            <QuickChips
              legend="¿A qué hora lo toma?"
              options={HORARIOS_RAPIDOS}
              value={horario}
              onPick={(v) => {
                wizard.set({ horario: v });
                if (errorHorario) setErrorHorario('');
              }}
            />
            <TextField
              label="Otra hora"
              value={horario}
              onChange={(v) => {
                wizard.set({ horario: v });
                if (errorHorario) setErrorHorario('');
              }}
              placeholder="Ej: 6:30 PM"
              inputMode="text"
              onEnter={confirmarMedicamento}
              error={errorHorario}
              hint={`Opcional. Si no eliges una hora, dejamos ${HORARIO_POR_DEFECTO} y la cambias en la app.`}
              inputRef={horarioRef}
            />
          </div>
          <AutorizacionSalud
            nombre={nombreMostrado}
            checked={autorizaSalud}
            onChange={(v) => {
              setAutorizaSalud(v);
              if (v) setErrorAutoriza('');
            }}
            error={errorAutoriza}
            inputRef={autorizaRef}
          />
          <button
            type="button"
            onClick={omitirMedicamento}
            className="mt-2 flex min-h-11 items-center self-start rounded-lg px-2 text-[16px] font-medium text-[var(--text-secondary)] underline underline-offset-2 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Lo agrego después
          </button>
          <FixedCta label="Armar mi plan" onClick={confirmarMedicamento} />
        </>
      )}

      {/* MUESTRA DEL VALOR: lo que toca hoy, con los datos que la persona acaba de dar. */}
      {step === 6 && (
        <>
          <div className="mt-2 mb-6">
            <h1
              tabIndex={-1}
              className="text-balance text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-[var(--text-primary)] outline-none [font-family:var(--font-display)]"
            >
              Así se verá hoy para {nombreMostrado}
            </h1>
            <p className="mt-2 text-[16px] leading-snug text-[var(--text-secondary)]">
              Este es el registro de hoy con la medicina y la hora que elegiste.
            </p>
          </div>
          <MuestraDeValor
            nombre={nombreMostrado}
            medicamento={medicamento}
            horario={horario}
            preocupacion={preocupacion}
          />
          <FixedCta label="Seguir" onClick={avanzar} />
        </>
      )}

      {/* DUDAS: respuestas breves con los datos reales de la oferta (prueba y garantía). */}
      {step === 7 && (
        <>
          <div className="mt-2 mb-6">
            <h1
              tabIndex={-1}
              className="text-balance text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-[var(--text-primary)] outline-none [font-family:var(--font-display)]"
            >
              Antes de empezar
            </h1>
            <p className="mt-2 text-[16px] leading-snug text-[var(--text-secondary)]">Las dudas más comunes, en corto.</p>
          </div>
          <dl className="flex flex-col gap-3">
            {DUDAS.map((d) => (
              <div key={d.pregunta} className="rounded-[var(--radius-card)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
                <dt className="text-[16px] font-semibold text-[var(--text-primary)]">{d.pregunta}</dt>
                <dd className="mt-1 text-[16px] leading-snug text-[var(--text-secondary)]">{d.respuesta}</dd>
              </div>
            ))}
          </dl>
          <FixedCta label="Ver mi plan" onClick={avanzar} />
        </>
      )}
    </StepFrame>
  );
}

/* Dudas que suelen frenar. Cada respuesta dice lo que la plantilla hace de verdad:
   el texto de "¿Es seguro?" cambia cuando la sincronización está conectada (lib/oferta.ts). */
const DUDAS: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: '¿Es seguro?',
    respuesta: sincroTexto(
      'Solo lo ven las personas de tu círculo a las que invites. Puedes borrarlo cuando quieras desde Familia, en Tus datos.',
      'Lo que escribes se guarda en este dispositivo y no se envía a ningún servidor. Puedes borrarlo cuando quieras desde Familia, en Tus datos.'
    ),
  },
  {
    pregunta: '¿Tengo tiempo?',
    respuesta: 'Confirma cada dosis desde Hoy.',
  },
  {
    pregunta: '¿Y si no me sirve?',
    respuesta: `${tieneTrial ? `Tienes ${TRIAL_DIAS} días de prueba. ` : ''}Si no te convence, puedes pedir el reembolso dentro de la Garantía de ${GARANTIA_DIAS} días desde el primer cobro. Lo gestiona Hotmart.`,
  },
];

/* ── Autorización explícita de datos de salud (antes de guardar la primera medicina). Casilla sin marcar
   por defecto, con su texto completo; el error va debajo y se enlaza con aria-describedby. ── */
function AutorizacionSalud({
  nombre,
  checked,
  onChange,
  error,
  inputRef,
}: {
  nombre: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  error: string;
  inputRef: Ref<HTMLInputElement>;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="mt-4">
      <label
        htmlFor={id}
        className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--radius-button)] bg-[var(--surface-2)] p-4 ${
          error ? 'shadow-[0_0_0_2px_var(--error-text)]' : ''
        }`}
      >
        <input
          id={id}
          ref={inputRef}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-[var(--accent)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        />
        <span className="text-[16px] leading-snug text-[var(--text-primary)]">
          Autorizo guardar el medicamento y la hora de {nombre} para armar su plan. Son datos de salud: puedo
          borrarlos cuando quiera desde Familia.
        </span>
      </label>
      {error && (
        <p id={errorId} role="alert" className="mt-2 px-2 text-[16px] leading-snug text-[var(--error-text)]">
          {error}
        </p>
      )}
    </div>
  );
}

/* ── Muestra del valor: el "ajá" con los datos de la persona. Lo que todavía no existe se dice así
   ("Sin citas por ahora"), nunca se inventa. Si la preocupación es "citas", las citas van primero. ── */
function MuestraDeValor({
  nombre,
  medicamento,
  horario,
  preocupacion,
}: {
  nombre: string;
  medicamento: string;
  horario: string;
  preocupacion: PreocupacionId | '';
}) {
  const med = medicamento.trim();
  const hora = fmtTime(parseTimeInput(horario) ?? parseTimeInput(HORARIO_POR_DEFECTO) ?? '08:00');
  // La hora de la medicina es el dato héroe (cifra grande) cuando las medicinas van primero.
  const heroe = med !== '' && preocupacion !== 'citas';
  const filaMedicinas = (
    <li key="medicinas" className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--bg)]"
        style={{ background: 'var(--grad-brand)' }}
      >
        <Pill size={20} strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        {med ? (
          <>
            <p className="truncate text-[16px] font-semibold text-[var(--text-primary)]">
              {heroe ? med : `${med} · ${hora}`}
            </p>
            <p className="text-[16px] text-[var(--text-secondary)]">Próxima dosis de {nombre}</p>
          </>
        ) : (
          <>
            <p className="text-[16px] font-semibold text-[var(--text-primary)]">Medicinas: todavía ninguna</p>
            <p className="text-[16px] text-[var(--text-secondary)]">La agregas en la app cuando quieras.</p>
          </>
        )}
      </div>
    </li>
  );
  const filaCitas = (
    <li key="citas" className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--accent)]"
      >
        <CalendarClock size={20} strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="text-[16px] font-semibold text-[var(--text-primary)]">Citas: sin citas por ahora</p>
        <p className="text-[16px] text-[var(--text-secondary)]">Cuando agregues una, aparece aquí con quién va.</p>
      </div>
    </li>
  );
  const filas = preocupacion === 'citas' ? [filaCitas, filaMedicinas] : [filaMedicinas, filaCitas];
  return (
    <section
      aria-labelledby="muestra-titulo"
      className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]"
    >
      <p id="muestra-titulo" className="text-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
        Lo que toca hoy
      </p>
      {heroe && (
        <p className="texto-grad mt-3 text-[40px] leading-none font-bold tabular-nums [font-family:var(--font-display)]">
          {hora}
        </p>
      )}
      <ul className="mt-4 flex flex-col gap-4">{filas}</ul>
    </section>
  );
}

/* ── Reconocimiento tras la pregunta sensible + etiquetado positivo (última pantalla
   antes de la medicina). Desculpabiliza con la CAUSA real (el sistema, no la persona) y etiqueta la
   identidad de quien está pendiente de su familiar. El dispositivo ownable (dato-héroe con mancha cálida)
   aquí es la inicial del familiar. ── */
function Reconocimiento({
  nombre,
  inicial,
  preocupacion,
  onContinuar,
}: {
  nombre: string;
  inicial: string;
  preocupacion: PreocupacionId;
  onContinuar: () => void;
}) {
  const reduce = useReducedMotionSafe();
  const causaCorta =
    preocupacion === 'medicamentos'
      ? 'No es que se olvide: es que no hay un solo lugar donde verlo'
      : preocupacion === 'citas'
        ? 'No es que nadie quiera ir: es que falta un solo lugar donde ver quién va'
        : preocupacion === 'chat'
          ? 'No se pierde por descuido: el chat no sirve para guardar datos de salud, hace falta un solo lugar'
          : 'No es falta de cariño: es que nadie tiene un solo lugar para ver todo junto';
  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-4 flex flex-1 flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: reduce ? 1 : 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.15, duration: reduce ? 0.2 : 0.25 }}
          className="mb-4"
        >
          <Circulo
            size={168}
            centro={
              <span
                aria-hidden="true"
                className="flex size-[72px] items-center justify-center rounded-full bg-[var(--surface)] text-[36px] font-bold text-[var(--accent)] shadow-[var(--shadow-soft)] ring-4 ring-[color-mix(in_oklab,var(--accent)_16%,transparent)] [font-family:var(--font-display)]"
              >
                {inicial || <HeartHandshake size={32} strokeWidth={2} aria-hidden="true" />}
              </span>
            }
          />
        </motion.div>
        <h1 className="text-balance text-[28px] font-bold leading-[1.1] text-[var(--text-primary)] [font-family:var(--font-display)]">
          Cuidas bien a <span className="text-[var(--accent)]">{nombre}</span>
        </h1>
        <p className="mt-3 max-w-[320px] text-[16px] font-semibold leading-snug text-[var(--text-primary)]">
          {causaCorta}.
        </p>
        <p className="mt-2 max-w-[300px] text-[16px] leading-snug text-[var(--text-secondary)]">
          Ya estás pendiente de <span className="font-semibold">{nombre}</span>: eso es lo más difícil. Tu plan
          se arma sobre eso.
        </p>
      </div>
      <FixedCta label="Cargar su primer medicamento" onClick={onContinuar} />
    </div>
  );
}

/* Lo que el usuario tendrá al terminar: llena el aire de la pregunta 1 con valor real (no con vacío) */
function QueRecibiras() {
  // Vista previa de la firma del producto: cada dosis queda con nombre y hora (escena ilustrativa).
  return (
    <div aria-hidden="true" className="mt-6 overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-2)]">
      <p className="px-4 pt-3 text-[16px] font-semibold text-[var(--accent)]">Así se verá</p>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-[var(--bg)]" style={{ background: 'var(--grad-brand)' }}>
          <Pill size={18} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-[16px] font-semibold text-[var(--text-primary)]">Losartán · 8:00 a. m.</p>
          <p className="text-[16px] text-[var(--text-secondary)]">Dada por Marta, 8:18 a. m.</p>
        </div>
      </div>
      <div className="mx-4 h-px bg-[color-mix(in_oklab,var(--text-tertiary)_22%,transparent)]" />
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-soft)]">
          <CalendarClock size={18} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-[16px] font-semibold text-[var(--text-primary)]">Cardiología · jueves 10:00 a. m.</p>
          <p className="text-[16px] text-[var(--text-secondary)]">Va Marta</p>
        </div>
      </div>
    </div>
  );
}

/* Vista previa viva del nombre: llena el aire de la pregunta 2 con lo que el usuario acaba de
   escribir, tal como lo verá en la app ("Plan de Rosa"). */
function NombrePreview({ nombre }: { nombre: string }) {
  const limpio = nombre.trim();
  return (
    <div aria-hidden="true" className="mt-6 flex items-center gap-3 rounded-[var(--radius-card)] bg-[var(--surface-2)] p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[22px] font-bold text-[var(--accent)] shadow-[var(--shadow-soft)] [font-family:var(--font-display)]">
        {limpio ? limpio.charAt(0).toUpperCase() : '·'}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] text-[var(--text-secondary)]">Así lo verás en la app</span>
        <span className="block truncate text-[16px] font-semibold text-[var(--text-primary)]">
          {limpio ? `Plan de ${limpio}` : 'Plan de tu familiar'}
        </span>
      </span>
    </div>
  );
}
