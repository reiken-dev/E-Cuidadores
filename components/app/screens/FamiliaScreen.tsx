'use client';

// FAMILIA — el círculo de hermanos, el perfil del familiar, ajustes y el resumen para el médico.

import { useEffect, useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Download, Trash2, ChevronRight, Copy, CreditCard, FileText, MessageCircle, Share2, HeartPulse, LogOut, Phone, RotateCcw, Stethoscope, UserPlus } from 'lucide-react';
import { Avatar, Btn, Card, ChipToggle, PageHeader, Pill, Switch, TextInput, btnClass } from '@/components/app/ui';
import { IconChip } from '@/components/landing/ui';
import { Sheet, ConfirmSheet } from '@/components/app/Sheet';
import { useFeedback } from '@/components/app/Feedback';
import { actions, MODO_REMOTO, useAppData } from '@/lib/store';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import { borrarBorrador } from '@/lib/datos/borrador';
import { DIAS_DE_DOSIS } from '@/lib/datos/remoto';
import { MARCA } from '@/lib/marca';
import { INVITACION_CONECTADA } from '@/lib/oferta';
import { track } from '@/lib/analytics';
import type { AppData, RemindHours } from '@/lib/types';

const urlAcceso = () => `${window.location.origin}/entrar`;

export default function FamiliaScreen() {
  const data = useAppData();
  const router = useRouter();
  const { notify } = useFeedback();

  function descargar() {
    try {
      const blob = new Blob([actions.exportarDatos()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mis-datos.json';
      a.click();
      URL.revokeObjectURL(url);
      notify('Listo: descargamos tus datos.');
    } catch {
      notify('No pudimos descargarlos. Inténtalo de nuevo.');
    }
  }
  // Cerrar sesión de verdad: se cierra en Supabase y se recarga la página entera, para que ningún dato de esta
  // familia quede en memoria si otra persona entra después desde el mismo navegador.
  async function cerrarSesion() {
    if (MODO_REMOTO) {
      // Antes de salir, que termine de guardarse lo último que se anotó (con tope de tiempo).
      const todoGuardado = await actions.vaciarCola();
      if (!todoGuardado) notify('Algún cambio reciente puede no haberse guardado. Revisa tu conexión y vuelve a entrar.');
      borrarBorrador(); // el borrador del recorrido inicial no debe verlo quien entre después desde este navegador
      try {
        await crearClienteNavegador()?.auth.signOut();
      } catch {
        // Aunque falle, se vuelve al acceso: la sesión caduca sola y /app la valida en el servidor.
      }
      window.location.assign(urlAcceso()); // navegación completa a propósito: limpia la memoria del navegador
      return;
    }
    router.push('/entrar');
  }
  const params = useSearchParams();
  const [invitar, setInvitar] = useState(params.get('invitar') === '1');
  const [editar, setEditar] = useState(false);
  const [perfilKey, setPerfilKey] = useState(0);
  const [reset, setReset] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const [salir, setSalir] = useState(false);
  const p = data.profile;
  // El código de invitación es al azar: se crea la primera vez y se conserva. No sale del nombre de nadie.
  // Cuando conectes la invitación, el servidor debe guardar ese código y validarlo.
  useEffect(() => {
    if (!data.codigoCirculo) actions.ensureCodigoCirculo();
  }, [data.codigoCirculo]);
  // Sin la ruta /unirme (requiere servidor) el mensaje no lleva enlace: así nunca se envía un enlace que da 404.
  const enlace = INVITACION_CONECTADA && data.codigoCirculo ? `${MARCA.sitioUrl}/unirme/${data.codigoCirculo}` : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Familia" subtitle={`Cuidando a ${p.name}, entre ${data.members.length === 1 ? 'todos' : data.members.length}`} />

      {/* El círculo */}
      <Card as="section" className="p-4">
        <h2 className="t-sub px-2 pb-2 text-[var(--text-primary)]">El círculo</h2>
        <ul className="flex flex-col">
          {data.members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-4 border-t border-[color-mix(in_oklab,var(--text-tertiary)_14%,transparent)] px-2 py-3 first:border-t-0"
            >
              <Avatar name={m.name} tone={m.tone} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="t-body flex flex-wrap items-center gap-2 font-medium text-[var(--text-primary)]">
                  {m.name}
                  {m.id === data.currentUserId && <Pill tone="accent">Tú</Pill>}
                </p>
                <p className="t-body text-[var(--text-secondary)]">{m.role}</p>
              </div>
            </li>
          ))}
        </ul>
        <Btn variant="soft" size="lg" full className="mt-2" onClick={() => setInvitar(true)}>
          <UserPlus size={20} aria-hidden="true" />
          Invitar a un hermano
        </Btn>
      </Card>

      {/* Perfil del familiar */}
      <Card as="section" className="p-4">
        <div className="flex items-center gap-4 px-2 pb-4">
          <Avatar name={p.name} tone="accent" size="lg" />
          <div className="min-w-0">
            <h2 className="t-title break-words text-[var(--text-primary)]">{p.name}</h2>
            <p className="t-body text-[var(--text-secondary)]">
              {[p.age ? `${p.age} años` : null, p.relation].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <dl className="flex flex-col gap-4 px-2">
          <div>
            <dt className="t-label mb-2 text-[var(--text-secondary)]">Alergias</dt>
            <dd className="flex flex-wrap gap-2">
              {p.allergies.length ? (
                p.allergies.map((a) => (
                  <Pill key={a} tone="danger" icon={AlertTriangle}>
                    {a}
                  </Pill>
                ))
              ) : (
                <span className="t-body text-[var(--text-secondary)]">Ninguna registrada</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="t-label mb-2 text-[var(--text-secondary)]">Condiciones</dt>
            <dd className="flex flex-wrap gap-2">
              {p.conditions.length ? (
                p.conditions.map((c) => (
                  <Pill key={c} tone="neutral" icon={HeartPulse}>
                    {c}
                  </Pill>
                ))
              ) : (
                <span className="t-body text-[var(--text-secondary)]">Ninguna registrada</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="t-label mb-1 text-[var(--text-secondary)]">Médico de cabecera</dt>
            <dd className="t-body flex flex-wrap items-center gap-x-4 text-[var(--text-primary)]">
              <span className="inline-flex items-center gap-2">
                <Stethoscope size={16} aria-hidden="true" className="text-[var(--text-secondary)]" />
                {p.doctorName || 'Sin registrar'}
              </span>
              {p.doctorPhone && <TelLink numero={p.doctorPhone} />}
            </dd>
          </div>
          <div>
            <dt className="t-label mb-1 text-[var(--text-secondary)]">Contacto de emergencia</dt>
            <dd className="t-body flex flex-wrap items-center gap-x-4 text-[var(--text-primary)]">
              <span>{p.emergencyName || 'Sin registrar'}</span>
              {p.emergencyPhone && <TelLink numero={p.emergencyPhone} />}
            </dd>
          </div>
        </dl>
        <Btn
          variant="secondary"
          size="lg"
          full
          className="mt-4"
          onClick={() => {
            setPerfilKey((k) => k + 1);
            setEditar(true);
          }}
        >
          Editar el perfil de {p.name}
        </Btn>
      </Card>

      {/* Resumen para el médico */}
      <Link prefetch={false}
        href="/app/resumen"
        className="flex min-h-16 items-center gap-4 rounded-[var(--radius-card)] bg-[var(--surface)] p-4 shadow-[var(--shadow-2)] ring-1 ring-[color-mix(in_oklab,var(--accent)_22%,transparent)] [touch-action:manipulation]"
      >
        <IconChip icon={FileText} />
        <span className="min-w-0 flex-1">
          <span className="t-sub block text-[var(--text-primary)]">Resumen para el médico</span>
          <span className="t-label block text-[var(--text-secondary)]">Una página lista para llevar a la cita</span>
        </span>
        <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-[var(--text-secondary)]" />
      </Link>

      {/* Tu suscripción */}
      <Link
        prefetch={false}
        href="/app/plan"
        className="flex min-h-16 items-center gap-4 rounded-[var(--radius-card)] bg-[var(--surface)] p-4 shadow-[var(--shadow-1)] ring-1 ring-[color-mix(in_oklab,var(--text-tertiary)_16%,transparent)] [touch-action:manipulation]"
      >
        <IconChip icon={CreditCard} />
        <span className="min-w-0 flex-1">
          <span className="t-sub block text-[var(--text-primary)]">Tu suscripción</span>
          <span className="t-label block text-[var(--text-secondary)]">Plan, medio de pago y lo que ha logrado tu círculo</span>
        </span>
        <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-[var(--text-secondary)]" />
      </Link>

      {/* Ajustes */}
      <Card as="section" className="divide-y divide-[color-mix(in_oklab,var(--text-tertiary)_14%,transparent)] px-4 py-2">
        <h2 className="sr-only">Ajustes</h2>
        <Switch
          label={`Modo simple para ${p.name}`}
          description="Letra muy grande y una sola acción: confirmar su dosis."
          checked={data.settings.simpleMode}
          onChange={(v) => {
            actions.updateSettings({ simpleMode: v });
            if (v) router.push('/app/simple');
          }}
        />
        <div className="py-2">
          <Switch
            label="Avisar un día antes de cada cita"
            description="Se usa como opción por defecto al crear una cita."
            checked={data.settings.defaultRemindDayBefore}
            onChange={(v) => actions.updateSettings({ defaultRemindDayBefore: v })}
          />
        </div>
        <div className="py-4">
          <p id="horas-def" className="t-body mb-2 font-medium text-[var(--text-primary)]">
            Avisar horas antes (por defecto)
          </p>
          <div role="radiogroup" aria-labelledby="horas-def" className="flex flex-wrap gap-2">
            {([0, 1, 2, 3, 4] as RemindHours[]).map((h) => (
              <ChipToggle
                key={h}
                role="radio"
                selected={data.settings.defaultRemindHours === h}
                onClick={() => actions.updateSettings({ defaultRemindHours: h })}
              >
                {h === 0 ? 'Sin aviso' : `${h} h`}
              </ChipToggle>
            ))}
          </div>
        </div>
      </Card>

      {/* Datos y sesión */}
      <section className="flex flex-col gap-2 pb-2" aria-label="Datos y sesión">
        <Btn variant="secondary" size="lg" full onClick={() => setSalir(true)}>
          <LogOut size={20} aria-hidden="true" />
          Cerrar sesión
        </Btn>
        {!MODO_REMOTO && (
          <>
            <Btn variant="ghost" size="md" full onClick={() => setReset(true)}>
              <RotateCcw size={18} aria-hidden="true" />
              {data.demo ? 'Volver a mis datos' : 'Ver datos de ejemplo'}
            </Btn>
            <p className="t-body px-4 text-center text-[var(--text-secondary)]">
              Plantilla de demostración: lo que registres se guarda solo en este dispositivo.
            </p>
          </>
        )}
      </section>

      <Card as="section" className="flex flex-col gap-2 p-4" >
        <h2 className="t-sub text-[var(--text-primary)]">Tus datos</h2>
        <p className="t-body text-[var(--text-secondary)]">
          {MODO_REMOTO
            ? `Descarga una copia de tus datos. Incluye las dosis de los últimos ${DIAS_DE_DOSIS} días; lo anterior sigue guardado en tu cuenta.`
            : 'Descarga una copia o borra tus datos.'}
        </p>
        <Btn variant="secondary" size="md" full onClick={descargar}>
          <Download size={18} aria-hidden="true" />
          Descargar mis datos
        </Btn>
        {!MODO_REMOTO && (
          <Btn variant="ghost" size="md" full onClick={() => setBorrar(true)}>
            <Trash2 size={18} aria-hidden="true" />
            Borrar los datos de este dispositivo
          </Btn>
        )}
        <nav aria-label="Información legal" className="t-label flex flex-wrap gap-x-4 text-[var(--text-secondary)]">
          {[
            ['/privacidad', 'Privacidad'],
            ['/aviso-medico', 'Aviso médico'],
            ['/terminos', 'Términos'],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="inline-flex min-h-11 items-center underline underline-offset-2">
              {label}
            </Link>
          ))}
        </nav>
      </Card>

      <ConfirmSheet
        open={borrar}
        onOpenChange={setBorrar}
        title="¿Borrar los datos de este dispositivo?"
        text="Se borran las medicinas, citas, notas y el historial guardados aquí. No se puede deshacer. Si quieres conservarlos, descárgalos antes."
        confirmLabel="Sí, borrar todo"
        cancelLabel="No, conservarlos"
        onConfirm={() => {
          actions.borrarTodo();
          notify('Borramos los datos de este dispositivo.');
          router.push('/');
        }}
      />

      <InvitarSheet open={invitar} onOpenChange={setInvitar} enlace={enlace} />
      <PerfilSheet key={perfilKey} open={editar} onOpenChange={setEditar} data={data} />
      <ConfirmSheet
        open={reset}
        onOpenChange={setReset}
        title={data.demo ? '¿Volver a mis datos?' : '¿Ver datos de ejemplo?'}
        text={data.demo ? 'Recuperaremos lo que registraste antes de abrir el ejemplo.' : 'Guardaremos una copia local de lo que registraste y abriremos un ejemplo ficticio. No lo uses para una consulta médica.'}
        confirmLabel={data.demo ? 'Sí, volver a mis datos' : 'Sí, ver ejemplo'}
        onConfirm={() => {
          if (data.demo) {
            const result = actions.restorePersonalData();
            notify(result === 'restored' ? 'Listo: recuperamos tus datos.' : 'No encontramos datos propios para recuperar.');
          } else {
            const result = actions.enterDemo();
            notify(result === 'loaded' ? 'Listo: abriste los datos de ejemplo.' : 'No pudimos guardar una copia local. Revisa el almacenamiento del navegador.');
          }
        }}
      />
      <ConfirmSheet
        open={salir}
        onOpenChange={setSalir}
        title="¿Cerrar sesión?"
        text={MODO_REMOTO ? 'Volverás al acceso. Tus datos quedan guardados en tu cuenta.' : 'Volverás al acceso. Tus datos siguen en este dispositivo.'}
        confirmLabel="Cerrar sesión"
        cancelLabel="Seguir aquí"
        onConfirm={() => {
          void cerrarSesion();
        }}
      />
    </div>
  );
}

function TelLink({ numero }: { numero: string }) {
  return (
    <a
      href={`tel:${numero.replace(/[^\d+]/g, '')}`}
      className="t-body inline-flex min-h-11 items-center gap-2 font-medium text-[var(--accent)] [touch-action:manipulation]"
    >
      <Phone size={16} aria-hidden="true" />
      {numero}
    </a>
  );
}

/* ── Invitar al círculo: tarjeta 4:5 y mensaje editable. Opt-in: nada sale hasta que la persona lo elige. ── */
const TARJETA_RUTA = '/tarjeta-invitacion';
const TARJETA_ARCHIVO = 'invitacion-entre-hermanos.png';

type EstadoInvitacion = 'ninguno' | 'copiado' | 'fallo' | 'descargado';

// El mensaje no lleva nombres, cifras ni datos de salud: solo la invitación y la marca.
function mensajeInvitacion(enlace: string | null): string {
  const base = `Hola, te invito a cuidar a nuestro familiar entre todos con ${MARCA.nombre}: cada dosis con nombre y cada cita con responsable. ¿Te sumas?`;
  return enlace ? `${base} ${enlace}` : base;
}

function InvitarSheet({
  open,
  onOpenChange,
  enlace,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  enlace: string | null;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Invitar a un hermano"
      description="Edita y comparte el mensaje. La tarjeta no incluye datos personales ni de salud."
    >
      <ContenidoInvitacion enlace={enlace} />
    </Sheet>
  );
}

function ContenidoInvitacion({ enlace }: { enlace: string | null }) {
  const idTexto = useId();
  const [texto, setTexto] = useState(() => mensajeInvitacion(enlace));
  const [estado, setEstado] = useState<EstadoInvitacion>('ninguno');
  const [archivo, setArchivo] = useState<File | null>(null);
  const puedeCompartir = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const sinTexto = texto.trim().length === 0;

  // La tarjeta se pide al abrir esta hoja, no al cargar la app. Así "Compartir" no espera a la red.
  useEffect(() => {
    let vigente = true;
    fetch(TARJETA_RUTA)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (vigente && b) setArchivo(new File([b], TARJETA_ARCHIVO, { type: 'image/png' }));
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, []);

  async function copiar() {
    track('invitacion_compartida', { canal: 'copiar' });
    try {
      await navigator.clipboard.writeText(texto);
      setEstado('copiado');
      window.setTimeout(() => setEstado('ninguno'), 3000);
    } catch {
      setEstado('fallo');
    }
  }

  function compartir() {
    track('invitacion_compartida', { canal: 'menu' });
    const conImagen = archivo && navigator.canShare?.({ files: [archivo] }) ? { files: [archivo] } : {};
    navigator.share({ title: MARCA.nombre, text: texto, ...conImagen }).catch((e: unknown) => {
      // Cerrar el menú no es un error. Si el navegador no acepta la imagen, se intenta solo con el texto.
      if (e instanceof DOMException && e.name === 'AbortError') return;
      navigator.share({ title: MARCA.nombre, text: texto }).catch(() => {});
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-2xl bg-[var(--surface-2)] p-4">
        <Image
          src={TARJETA_RUTA}
          alt="Tarjeta de invitación: «Te invito a cuidar entre todos», con la marca E-Cuidadores."
          width={1080}
          height={1350}
          unoptimized
          className="h-auto w-[112px] shrink-0 rounded-[var(--radius-card)] shadow-[var(--shadow-2)]"
        />
        <div className="min-w-0">
          <p className="t-body text-[var(--text-secondary)]">Tarjeta para compartir</p>
          <p className="t-body mt-1 text-[var(--text-primary)]">Solo la invitación y la marca. Puedes enviarla junto con el mensaje.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={idTexto} className="t-label text-[var(--text-secondary)]">
          Tu mensaje
        </label>
        <textarea
          id={idTexto}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={500}
          rows={4}
          className="t-body w-full resize-none rounded-[var(--radius-card)] bg-[var(--surface-2)] p-4 text-[var(--text-primary)] outline-none"
        />
      </div>

      {sinTexto ? (
        <p role="status" className="t-body text-[var(--error-text)]">
          Escribe un mensaje para poder compartirlo.
        </p>
      ) : (
        <>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('invitacion_compartida', { canal: 'whatsapp' })}
            className="t-btn flex h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--accent)] px-8 text-[var(--bg)] shadow-[inset_0_1px_0_rgb(255_255_255/0.28)] [touch-action:manipulation]"
          >
            <MessageCircle size={20} aria-hidden="true" />
            Enviar por WhatsApp
          </a>
          {puedeCompartir && (
            <Btn variant="secondary" size="lg" full onClick={compartir}>
              <Share2 size={20} aria-hidden="true" />
              Compartir tarjeta y mensaje
            </Btn>
          )}
        </>
      )}

      <a
        href={TARJETA_RUTA}
        download={TARJETA_ARCHIVO}
        onClick={() => {
          track('invitacion_compartida', { canal: 'imagen' });
          setEstado('descargado');
        }}
        className={btnClass('secondary', 'lg', true)}
      >
        <Download size={20} aria-hidden="true" />
        Descargar la tarjeta
      </a>
      <Btn variant="soft" size="lg" full onClick={copiar} disabled={sinTexto}>
        <Copy size={20} aria-hidden="true" />
        {estado === 'copiado' ? 'Mensaje copiado' : 'Copiar el mensaje'}
      </Btn>

      <p role="status" className="t-body text-center text-[var(--text-secondary)]">
        {estado === 'copiado'
          ? enlace
            ? 'Listo. Pégalo en el chat familiar para que tu hermano entre.'
            : 'Listo. Pégalo en el chat familiar para avisarles.'
          : estado === 'fallo'
            ? 'No pudimos copiarlo solo. Mantén presionado el texto y elige Copiar.'
            : estado === 'descargado'
              ? 'Tarjeta descargada. Envíala junto con el mensaje.'
              : 'La app no envía nada: lo mandas tú desde tu WhatsApp o tu chat familiar.'}
      </p>
    </div>
  );
}

/* ── Editar perfil del familiar ── */
function PerfilSheet({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: AppData;
}) {
  const p = data.profile;
  const { notify } = useFeedback();
  const [name, setName] = useState(p.name);
  const [age, setAge] = useState(p.age ? String(p.age) : '');
  const [allergies, setAllergies] = useState(p.allergies.join(', '));
  const [conditions, setConditions] = useState(p.conditions.join(', '));
  const [doctorName, setDoctorName] = useState(p.doctorName);
  const [doctorPhone, setDoctorPhone] = useState(p.doctorPhone);
  const [emergencyName, setEmergencyName] = useState(p.emergencyName);
  const [emergencyPhone, setEmergencyPhone] = useState(p.emergencyPhone);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const telOk = (v: string) => v.trim() === '' || (/^[\d\s+()-]{6,20}$/.test(v.trim()) && /\d{6,}/.test(v.replace(/\D/g, '')));
  const lista = (v: string) =>
    [...new Map(
      v
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => [x.toLowerCase(), x] as const)
    ).values()].slice(0, 20);

  function guardar() {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Escribe el nombre de tu familiar.';
    if (age.trim() !== '' && !(/^\d{1,3}$/.test(age.trim()) && Number(age) >= 1 && Number(age) <= 120))
      e.age = 'Escribe una edad entre 1 y 120.';
    if (!telOk(doctorPhone)) e.doctorPhone = 'Revisa el número: solo dígitos, espacios, + o guiones.';
    if (!telOk(emergencyPhone)) e.emergencyPhone = 'Revisa el número: solo dígitos, espacios, + o guiones.';
    setErrors(e);
    if (Object.keys(e).length) return;
    actions.updateProfile({
      name: name.trim(),
      age: age.trim() ? Number(age) : null,
      allergies: lista(allergies),
      conditions: lista(conditions),
      doctorName: doctorName.trim(),
      doctorPhone: doctorPhone.trim(),
      emergencyName: emergencyName.trim(),
      emergencyPhone: emergencyPhone.trim(),
    });
    onOpenChange(false);
    notify('Guardamos el perfil.');
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Perfil de ${p.name}`} description="Lo que aparece en el resumen para el médico.">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          guardar();
        }}
      >
        <TextInput label="Nombre" value={name} onChange={setName} error={errors.name} maxLength={80} />
        <TextInput label="Edad (opcional)" value={age} onChange={setAge} inputMode="numeric" error={errors.age} />
        <TextInput label="Alergias" value={allergies} onChange={setAllergies} hint="Separadas por coma. Ej: Penicilina, Ibuprofeno" />
        <TextInput label="Condiciones" value={conditions} onChange={setConditions} hint="Separadas por coma. Ej: Hipertensión, Diabetes tipo 2" />
        <TextInput label="Médico de cabecera" value={doctorName} onChange={setDoctorName} maxLength={80} />
        <TextInput label="Teléfono del médico" value={doctorPhone} onChange={setDoctorPhone} maxLength={30} type="tel" inputMode="tel" error={errors.doctorPhone} />
        <TextInput label="Contacto de emergencia" value={emergencyName} onChange={setEmergencyName} maxLength={80} />
        <TextInput label="Teléfono de emergencia" value={emergencyPhone} onChange={setEmergencyPhone} maxLength={30} type="tel" inputMode="tel" error={errors.emergencyPhone} />
        <Btn type="submit" size="lg" full className="mt-2">
          Guardar cambios
        </Btn>
      </form>
    </Sheet>
  );
}
