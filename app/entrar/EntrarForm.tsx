'use client';

// ACCESO — E-Cuidadores
// Dos caminos pedidos por el dueño: (1) correo + contraseña propia (crear cuenta / entrar) y
// (2) enlace de un solo uso por correo. "Continuar con Google" es SOLO visual.
//
// DEMOSTRACIÓN: mientras Supabase esté desconectado (lib/marca.ts → conexiones), todo es simulado con estado local
// y se avisa en pantalla. Con Supabase conectado NO se simula: el alta y el acceso van por el servidor (ver
// docs/conexion/alta-consentimientos.ts.txt); hasta implementarlo, el formulario muestra que no está conectado.
// PLANTILLA SIN BACKEND: todo es simulado con estado local. La contraseña NUNCA se guarda
// (ni en localStorage ni en ninguna parte) y se borra del estado apenas "entra". Quien compre
// la plantilla debe conectar su propio servicio de autenticación (que guarde la contraseña
// con hash en el servidor, limite intentos y valide el correo) antes de publicar.

import { crearClienteNavegador } from '@/lib/supabase/navegador';
import { MARCA } from '@/lib/marca';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Circle, CircleAlert, Eye, EyeOff, Mail } from 'lucide-react';
import { FUNNEL_BG, FunnelBrand } from '@/components/onboarding/OnboardingUI';
import { Circulo } from '@/components/brand/Circulo';

type Modo = 'entrar' | 'crear';
type Vista = 'form' | 'enlace-enviado' | 'reset-enviado' | 'exito';

const REENVIO_SEGUNDOS = 60;
const MAX_INTENTOS_FALLIDOS = 5;
const BLOQUEO_SEGUNDOS = 60;
const ACCESO_NO_CONECTADO = 'El acceso real todavía no está conectado. Revisa LISTA-DE-CONEXION.md antes de publicar.';
// Mensajes genéricos: nunca revelan si un correo ya tiene cuenta.
const ERROR_ACCESO = 'Correo o contraseña incorrectos. Revisa los datos e intenta de nuevo.';
const ERROR_ALTA = 'No pudimos crear tu cuenta. Revisa los datos e intenta de nuevo en un momento.';
const ERROR_ENLACE = 'No pudimos enviar el enlace. Intenta de nuevo en un momento.';
// Errores que devuelve /auth/callback en la URL (?error=…).
const ERRORES_DE_URL: Record<string, string> = {
  acceso: 'El enlace no es válido o ya venció. Pide uno nuevo.',
  consentimientos: 'No pudimos guardar tus aceptaciones. Vuelve a intentarlo.',
};

function emailValido(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// Reglas de contraseña nueva: sencillas de cumplir y de entender (mínimo 8, letra y número).
function reglasPassword(p: string) {
  return {
    largo: p.length >= 8,
    letra: /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(p),
    numero: /\d/.test(p),
  };
}

const CAMPO =
  'h-14 w-full rounded-[var(--radius-button)] border bg-[var(--surface)] px-5 text-[16px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus:border-[var(--accent)]';
const BORDE_NORMAL = 'border-[color-mix(in_oklab,var(--text-tertiary)_30%,transparent)]';
const BORDE_ERROR = 'border-[var(--error-text)]';

export default function EntrarForm() {
  // Después de la pantalla de planes el visitante llega con ?modo=crear: lo primero que
  // necesita es crear su cuenta, no entrar a una que aún no tiene.
  const params = useSearchParams();
  const [modo, setModo] = useState<Modo>(params.get('modo') === 'crear' ? 'crear' : 'entrar');
  const [vista, setVista] = useState<Vista>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [ocupado, setOcupado] = useState<null | 'password' | 'enlace' | 'reset'>(null);
  const [errorEmail, setErrorEmail] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [errorGeneral, setErrorGeneral] = useState(ERRORES_DE_URL[params.get('error') ?? ''] ?? '');
  const [fallidos, setFallidos] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [avisoGoogle, setAvisoGoogle] = useState(false);
  // Consentimientos del registro: SIEMPRE desmarcados al abrir y nunca se guardan en el navegador.
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [autorizaSalud, setAutorizaSalud] = useState(false);
  const [errorConsent, setErrorConsent] = useState('');
  // Sin Supabase conectado: demostración (no crea cuentas ni envía correos, y lo dice en pantalla).
  const demo = !MARCA.conexiones.supabase;

  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [countdown]);

  const bloqueado = fallidos >= MAX_INTENTOS_FALLIDOS && countdown > 0;
  const reglas = reglasPassword(password);

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setErrorEmail('');
    setErrorPassword('');
    setErrorGeneral('');
  }

  function validarEmail(): boolean {
    if (!emailValido(email)) {
      setErrorEmail('Escribe un correo válido, como tu@correo.com');
      return false;
    }
    setErrorEmail('');
    return true;
  }

  function enviarConPassword() {
    if (ocupado || bloqueado) return;
    setErrorGeneral('');
    const emailOk = validarEmail();
    let passOk = true;
    if (modo === 'crear') {
      if (!(reglas.largo && reglas.letra && reglas.numero)) {
        setErrorPassword('Tu contraseña necesita 8 o más caracteres, una letra y un número.');
        passOk = false;
      } else setErrorPassword('');
    } else if (password.length === 0) {
      setErrorPassword('Escribe tu contraseña.');
      passOk = false;
    } else setErrorPassword('');
    if (!consentimientosOk()) return;
    if (!emailOk || !passOk) return;
    if (!demo) {
      void accesoReal();
      return;
    }

    setOcupado('password');
    window.setTimeout(() => {
      setOcupado(null);
      // Simulación: sin backend no hay cuentas reales. Al entrar, una contraseña de menos de
      // 8 caracteres se trata como incorrecta para poder mostrar el estado de error, con el
      // mensaje genérico de siempre (26: nunca revelar si el correo existe).
      if (modo === 'entrar' && password.length < 8) {
        const total = fallidos + 1;
        setFallidos(total);
        if (total >= MAX_INTENTOS_FALLIDOS) {
          setCountdown(BLOQUEO_SEGUNDOS);
          setErrorGeneral('Demasiados intentos. Espera un minuto antes de volver a probar.');
        } else {
          setErrorGeneral('Correo o contraseña incorrectos. Revisa los datos e intenta de nuevo.');
        }
        return;
      }
      setFallidos(0);
      setPassword('');
      setVerPassword(false);
      setVista('exito');
    }, 1100);
  }

  // ── Acceso real (Supabase conectado) ──────────────────────────────────────
  // La contraseña va directo a Supabase Auth: no se guarda ni se escribe en ningún log.
  function urlDeVuelta() {
    return `${window.location.origin}/auth/callback?next=/app`;
  }

  async function accesoReal() {
    const db = crearClienteNavegador();
    if (!db) {
      setErrorGeneral(ACCESO_NO_CONECTADO);
      return;
    }
    setOcupado('password');
    try {
      if (modo === 'crear') {
        const { data, error } = await db.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: urlDeVuelta(),
            // Las casillas viajan con el alta; /auth/callback las guarda en public.consents con la sesión ya creada.
            data: { acepta: { terminos: aceptaTerminos, salud: autorizaSalud } },
          },
        });
        if (error) {
          setErrorGeneral(ERROR_ALTA);
          return;
        }
        setPassword('');
        // Con sesión inmediata (sin confirmar el correo) seguimos; si no, falta confirmar por correo.
        if (data.session) {
          window.location.assign(urlDeVuelta());
          return;
        }
        setVista('enlace-enviado');
        setCountdown(REENVIO_SEGUNDOS);
        return;
      }
      const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const total = fallidos + 1;
        setFallidos(total);
        if (total >= MAX_INTENTOS_FALLIDOS) {
          setCountdown(BLOQUEO_SEGUNDOS);
          setErrorGeneral('Demasiados intentos. Espera un minuto antes de volver a probar.');
        } else {
          setErrorGeneral(ERROR_ACCESO);
        }
        return;
      }
      setFallidos(0);
      setPassword('');
      window.location.assign(urlDeVuelta());
    } catch {
      setErrorGeneral(modo === 'crear' ? ERROR_ALTA : ERROR_ACCESO);
    } finally {
      setOcupado(null);
    }
  }

  // El enlace por correo lo envía Supabase Auth. "¿La olvidaste?" usa el mismo enlace: entra sin contraseña.
  async function enlaceReal(tipo: 'enlace' | 'reset') {
    const db = crearClienteNavegador();
    if (!db) {
      setErrorGeneral(ACCESO_NO_CONECTADO);
      return;
    }
    setOcupado(tipo);
    try {
      const crearCuenta = tipo === 'enlace' && modo === 'crear';
      const { error } = await db.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: crearCuenta,
          emailRedirectTo: urlDeVuelta(),
          ...(crearCuenta ? { data: { acepta: { terminos: aceptaTerminos, salud: autorizaSalud } } } : {}),
        },
      });
      // Si el correo no tiene cuenta, Supabase puede devolver error al no crear usuario: se responde igual que
      // en el éxito para no revelar qué correos existen.
      if (error && error.status !== 400 && error.status !== 422) {
        setErrorGeneral(ERROR_ENLACE);
        return;
      }
      setVista('enlace-enviado');
      setCountdown(REENVIO_SEGUNDOS);
    } catch {
      setErrorGeneral(ERROR_ENLACE);
    } finally {
      setOcupado(null);
    }
  }

  function consentimientosOk() {
    if (modo !== 'crear') return true;
    if (aceptaTerminos && autorizaSalud) {
      setErrorConsent('');
      return true;
    }
    setErrorConsent(
      !aceptaTerminos
        ? 'Para crear tu cuenta, confirma que tienes 18 años o más y que aceptas los términos y la privacidad.'
        : 'Para crear tu cuenta, marca la autorización sobre los datos de salud de tu familiar.'
    );
    return false;
  }

  function enviarEnlace(tipo: 'enlace' | 'reset') {
    if (ocupado) return;
    setErrorGeneral('');
    if (!validarEmail()) return;
    if (tipo === 'enlace' && !consentimientosOk()) return;
    if (!demo) {
      void enlaceReal(tipo);
      return;
    }
    setOcupado(tipo);
    window.setTimeout(() => {
      setOcupado(null);
      setVista(tipo === 'enlace' ? 'enlace-enviado' : 'reset-enviado');
      setCountdown(REENVIO_SEGUNDOS);
    }, 1200);
  }

  function volverAlForm() {
    setVista('form');
    setCountdown(0);
  }

  // ── Vistas de confirmación ────────────────────────────────────────────────
  if (vista === 'exito') {
    return (
      <Marco>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span
            aria-hidden="true"
            className="mb-5 flex size-16 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]"
          >
            <Check size={30} color="var(--accent)" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <h1 className="text-[22px] font-bold leading-tight text-[var(--text-primary)] [font-family:var(--font-display)]">
            Demostración lista
          </h1>
          <p role="status" className="mt-2 max-w-[300px] text-[16px] leading-relaxed text-[var(--text-secondary)]">
            {modo === 'crear'
              ? 'No se creó ninguna cuenta: esto muestra el recorrido. Tus datos se quedan en este navegador.'
              : 'No se comprobó ninguna cuenta: esto muestra el recorrido. Tus datos se quedan en este navegador.'}
          </p>
          <a
            href="/app"
            className="mt-7 flex h-14 w-full max-w-[320px] items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] bg-[image:var(--grad-cta)] text-[18px] font-semibold text-[var(--bg)] shadow-[0_8px_30px_color-mix(in_oklab,var(--accent)_25%,transparent)] [touch-action:manipulation]"
          >
            Ir a mi panel
          </a>
        </div>
      </Marco>
    );
  }

  if (vista === 'enlace-enviado' || vista === 'reset-enviado') {
    const esReset = vista === 'reset-enviado';
    return (
      <Marco>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span
            aria-hidden="true"
            className="mb-5 flex size-16 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]"
          >
            <Mail size={28} color="var(--accent)" strokeWidth={2} aria-hidden="true" />
          </span>
          <h1 className="text-[22px] font-bold leading-tight text-[var(--text-primary)] [font-family:var(--font-display)]">
            Revisa tu correo
          </h1>
          <p className="mt-2 max-w-[300px] text-[16px] leading-relaxed text-[var(--text-secondary)]">
            {demo
              ? 'En esta demostración no se envían correos. Con el acceso real, el enlace llegaría a '
              : esReset
                ? 'Te enviamos un enlace para crear una contraseña nueva a '
                : 'Te enviamos el enlace de acceso a '}
            <span className="font-semibold text-[var(--text-primary)]">{email}</span>
          </p>
          <button
            type="button"
            disabled={countdown > 0}
            onClick={() => enviarEnlace(esReset ? 'reset' : 'enlace')}
            className="mt-6 min-h-11 text-[16px] font-medium text-[var(--accent)] disabled:text-[var(--text-tertiary)]"
          >
            {countdown > 0 ? `Reenviar en ${countdown}s` : 'Reenviar enlace'}
          </button>
          <button
            type="button"
            onClick={volverAlForm}
            className="min-h-11 text-[16px] font-medium text-[var(--text-secondary)]"
          >
            Volver
          </button>
        </div>
      </Marco>
    );
  }

  // ── Formulario ────────────────────────────────────────────────────────────
  const crear = modo === 'crear';
  return (
    <Marco>
      <div className="mt-6 flex flex-col">
        {demo && (
          <p role="status" className="mb-4 rounded-[var(--radius-button)] bg-[color-mix(in_oklab,var(--accent)_10%,var(--surface))] px-4 py-2.5 text-[16px] leading-snug text-[var(--text-secondary)]">
            Demostración local: sin cuenta real ni envío de correos.
          </p>
        )}
        <h1 className="hero-in text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)]">
          {crear ? 'Crea tu cuenta' : 'Entra a tu plan'}
        </h1>
        <p className="hero-in mt-2 text-[16px] leading-snug text-[var(--text-secondary)]" style={{ ["--d" as string]: "60ms" }}>
          {crear
            ? 'Dosis con nombre y hora, en un solo lugar, para ti y tus hermanos.'
            : 'Entra con tu correo y tu contraseña.'}
        </p>

        <div
          role="tablist"
          aria-label="Elige cómo continuar"
          className="mt-5 grid grid-cols-2 gap-1 rounded-[var(--radius-button)] bg-[color-mix(in_oklab,var(--text-tertiary)_8%,transparent)] p-1"
        >
          {(
            [
              ['entrar', 'Ya tengo cuenta'],
              ['crear', 'Crear cuenta'],
            ] as const
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={modo === valor}
              onClick={() => cambiarModo(valor)}
              className={`h-11 rounded-[calc(var(--radius-button)-4px)] text-[16px] font-semibold transition-colors [touch-action:manipulation] ${
                modo === valor
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[0_2px_8px_color-mix(in_oklab,var(--text-primary)_10%,transparent)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <form
          className="mt-5 flex flex-col gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            enviarConPassword();
          }}
        >
          <div>
            <label htmlFor="email" className="mb-1.5 block text-[16px] font-medium text-[var(--text-primary)]">
              Correo
            </label>
            <input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              aria-invalid={errorEmail ? true : undefined}
              aria-describedby={errorEmail ? 'email-error' : undefined}
              className={`${CAMPO} ${errorEmail ? BORDE_ERROR : BORDE_NORMAL}`}
            />
            {errorEmail && (
              <p id="email-error" role="alert" className="mt-1.5 text-[16px] font-medium text-[var(--error-text)]">
                {errorEmail}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-[16px] font-medium text-[var(--text-primary)]">
                {crear ? 'Crea una contraseña' : 'Contraseña'}
              </label>
              {!crear && (
                <button
                  type="button"
                  onClick={() => enviarEnlace('reset')}
                  disabled={ocupado !== null}
                  className="min-h-11 text-[16px] font-medium text-[var(--accent)] disabled:text-[var(--text-tertiary)]"
                >
                  {ocupado === 'reset' ? 'Enviando…' : '¿La olvidaste?'}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={verPassword ? 'text' : 'password'}
                autoComplete={crear ? 'new-password' : 'current-password'}
                placeholder={crear ? 'Elige una contraseña' : 'Tu contraseña'}
                aria-invalid={errorPassword ? true : undefined}
                aria-describedby={errorPassword ? 'password-error' : crear ? 'password-reglas' : undefined}
                className={`${CAMPO} pr-14 ${errorPassword ? BORDE_ERROR : BORDE_NORMAL}`}
              />
              <button
                type="button"
                onClick={() => setVerPassword((v) => !v)}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={verPassword}
                className="absolute right-1 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center text-[var(--text-secondary)]"
              >
                {verPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
            {errorPassword && (
              <p id="password-error" role="alert" className="mt-1.5 text-[16px] font-medium text-[var(--error-text)]">
                {errorPassword}
              </p>
            )}
            {crear && (
              <ul id="password-reglas" className="mt-2.5 flex flex-col gap-1.5" aria-label="Requisitos de la contraseña">
                <Regla cumple={reglas.largo}>8 o más caracteres</Regla>
                <Regla cumple={reglas.letra}>Al menos una letra</Regla>
                <Regla cumple={reglas.numero}>Al menos un número</Regla>
              </ul>
            )}
          </div>

          {crear && (
            <fieldset className="hero-in flex flex-col gap-1">
              <legend className="sr-only">Aceptaciones para crear tu cuenta</legend>
              <Casilla checked={aceptaTerminos} onChange={setAceptaTerminos}>
                Tengo 18 años o más y acepto los{' '}
                <a href="/terminos" target="_blank" rel="noopener" className="font-medium text-[var(--text-primary)] underline underline-offset-2">
                  Términos
                </a>{' '}
                y la{' '}
                <a href="/privacidad" target="_blank" rel="noopener" className="font-medium text-[var(--text-primary)] underline underline-offset-2">
                  Política de Privacidad
                </a>
                .
              </Casilla>
              <Casilla checked={autorizaSalud} onChange={setAutorizaSalud}>
                Autorizo tratar los datos de salud de mi familiar que yo escriba, y tengo su permiso o el derecho de cuidarlo.{' '}
                <a href="/privacidad#salud" target="_blank" rel="noopener" className="font-medium text-[var(--text-primary)] underline underline-offset-2">
                  Ver detalles
                </a>
              </Casilla>
              {errorConsent && (
                <p role="alert" className="flex items-start gap-1.5 text-[16px] font-medium leading-snug text-[var(--error-text)]">
                  <CircleAlert size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
                  {errorConsent}
                </p>
              )}
            </fieldset>
          )}

          {errorGeneral && (
            <p role="alert" className="text-[16px] leading-snug font-medium text-[var(--error-text)]">
              {errorGeneral}
            </p>
          )}

          <button
            type="submit"
            disabled={ocupado !== null || bloqueado}
            className="flex h-14 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] bg-[image:var(--grad-cta)] text-[18px] font-semibold text-[var(--bg)] shadow-[0_8px_30px_color-mix(in_oklab,var(--accent)_25%,transparent)] transition-[opacity,transform] active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-60 [touch-action:manipulation]"
          >
            {ocupado === 'password' ? (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin motion-reduce:animate-none rounded-full border-2 border-[var(--bg)] border-t-transparent"
                />
                {crear ? 'Creando tu cuenta…' : 'Entrando…'}
              </span>
            ) : bloqueado ? (
              `Reintentar en ${countdown}s`
            ) : crear ? (
              'Crear mi cuenta'
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[14px] text-[var(--text-tertiary)]" aria-hidden="true">
          <span className="h-px flex-1 bg-[color-mix(in_oklab,var(--text-tertiary)_25%,transparent)]" />
          o
          <span className="h-px flex-1 bg-[color-mix(in_oklab,var(--text-tertiary)_25%,transparent)]" />
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => enviarEnlace('enlace')}
            disabled={ocupado !== null}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[color-mix(in_oklab,var(--text-tertiary)_30%,transparent)] text-[16px] font-medium text-[var(--text-primary)] disabled:opacity-60 [touch-action:manipulation]"
          >
            <Mail size={18} aria-hidden="true" />
            {ocupado === 'enlace' ? 'Enviando…' : crear ? 'Recibir un enlace por correo' : 'Entrar con un enlace por correo'}
          </button>

          {/* ALUMNO: el botón de Google es solo visual; se muestra al conectar tu proveedor (y entonces debe respetar las casillas legales). */}
          {false && (
            <>
          <button
            type="button"
            onClick={() => setAvisoGoogle(true)}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[color-mix(in_oklab,var(--text-tertiary)_30%,transparent)] text-[16px] font-medium text-[var(--text-primary)] [touch-action:manipulation]"
          >
            <GoogleG />
            Continuar con Google
          </button>
          {avisoGoogle && (
            <p role="status" className="text-center text-[16px] text-[var(--text-tertiary)]">
              Google no está conectado. Elige otra forma de acceso.
            </p>
          )}
            </>
          )}
        </div>

        <p className="mt-3 text-[16px] text-[var(--text-tertiary)]">
          ¿Compraste por Hotmart? Usa el correo con el que hiciste tu compra.
        </p>
      </div>
    </Marco>
  );
}

/** Casilla propia de 24 px (radio de la ficha), con el área táctil completa de la fila. */
function Casilla({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5 text-[16px] leading-snug text-[var(--text-secondary)]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)] ${
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--surface)] shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--text-tertiary)_55%,transparent)]'
        }`}
      >
        {checked && <Check size={15} strokeWidth={3} color="var(--bg)" />}
      </span>
      <span>{children}</span>
    </label>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden px-4 pb-8 pt-3">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: FUNNEL_BG }} />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-16 -z-10 opacity-60">
        <Circulo size={260} simple />
      </div>
      <FunnelBrand />
      {children}
    </main>
  );
}

function Regla({ cumple, children }: { cumple: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`flex items-center gap-2 text-[16px] transition-colors ${
        cumple ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-[18px] items-center justify-center rounded-full ${
          cumple ? 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]' : ''
        }`}
      >
        {cumple ? (
          <Check size={12} strokeWidth={3} color="var(--accent)" />
        ) : (
          <Circle size={12} color="var(--text-tertiary)" />
        )}
      </span>
      {children}
      <span className="sr-only">{cumple ? ' (cumplido)' : ' (falta)'}</span>
    </li>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z"
      />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
