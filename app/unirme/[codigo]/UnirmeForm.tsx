'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Marco } from '@/app/entrar/EntrarForm';
import { unirme } from '../actions';

const CAMPO =
  'h-14 w-full rounded-[var(--radius-button)] border border-[color-mix(in_oklab,var(--text-tertiary)_30%,transparent)] bg-[var(--surface)] px-5 text-[16px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus:border-[var(--accent)]';
const BOTON =
  'flex h-14 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] bg-[image:var(--grad-cta)] text-[18px] font-semibold text-[var(--bg)] shadow-[0_8px_30px_color-mix(in_oklab,var(--accent)_25%,transparent)] transition-[opacity,transform] active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-60 [touch-action:manipulation]';
const BOTON_SUAVE =
  'flex h-14 w-full items-center justify-center rounded-[var(--radius-button)] border border-[color-mix(in_oklab,var(--text-tertiary)_30%,transparent)] text-[18px] font-semibold text-[var(--text-primary)] [touch-action:manipulation]';

const urlApp = () => `${window.location.origin}/app`;

/**
 * Pantalla del enlace de invitación. No muestra datos de la familia: solo invita a entrar.
 * `codigo` null = el enlace no tiene la forma válida. `sesion` = ya hay una cuenta abierta (y con sus aceptaciones).
 */
export default function UnirmeForm({ codigo, sesion, yaTieneCirculo = false }: { codigo: string | null; sesion: boolean; yaTieneCirculo?: boolean }) {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const cerrojo = useRef(false);

  async function enviar() {
    if (cerrojo.current || !codigo) return;
    if (nombre.trim().length === 0) {
      setError('Escribe tu nombre: así te verán tus hermanos.');
      return;
    }
    cerrojo.current = true;
    setOcupado(true);
    setError('');
    try {
      const r = await unirme(codigo, nombre);
      if (r.ok) {
        // Recarga completa: así la app arranca ya dentro del círculo y no con un estado viejo.
        window.location.assign(urlApp()); // navegación completa a propósito
        return;
      }
      setError(r.error);
    } catch {
      setError('No pudimos completarlo. Revisa tu conexión e inténtalo de nuevo.');
    }
    cerrojo.current = false;
    setOcupado(false);
  }

  return (
    <Marco>
      <div className="mt-6 flex flex-col">
        {!codigo ? (
          <>
            <h1 className="text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)]">Este enlace no sirve</h1>
            <p className="mt-2 text-[16px] leading-snug text-[var(--text-secondary)]">
              Está incompleto o mal copiado. Pide a quien te invitó que te envíe el enlace otra vez.
            </p>
          </>
        ) : !sesion ? (
          <>
            <h1 className="text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)]">Te invitaron a cuidar juntos</h1>
            <p className="mt-2 text-[16px] leading-snug text-[var(--text-secondary)]">
              Crea tu cuenta para entrar al círculo de tu familia. No tienes que pagar nada.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Link href={`/entrar?modo=crear&unirme=${codigo}`} className={BOTON}>
                Crear mi cuenta
              </Link>
              <Link href={`/entrar?unirme=${codigo}`} className={BOTON_SUAVE}>
                Ya tengo cuenta
              </Link>
            </div>
          </>
        ) : yaTieneCirculo ? (
          <>
            <h1 className="text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)]">Tu cuenta ya tiene un círculo</h1>
            <p className="mt-2 text-[16px] leading-snug text-[var(--text-secondary)]">
              Una cuenta solo puede estar en un círculo. Para unirte a este, cierra sesión y abre el enlace con otra cuenta.
            </p>
            <Link href="/app" className={`${BOTON_SUAVE} mt-5`}>
              Ir a mi círculo
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)]">Unirte al círculo</h1>
            <p className="mt-2 text-[16px] leading-snug text-[var(--text-secondary)]">
              Tus hermanos te verán con el nombre que escribas aquí.
            </p>
            <form
              className="mt-5 flex flex-col gap-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void enviar();
              }}
            >
              <div>
                <label htmlFor="tu-nombre" className="mb-1.5 block text-[16px] font-medium text-[var(--text-primary)]">
                  ¿Cómo te llamas?
                </label>
                <input
                  id="tu-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  maxLength={80}
                  autoComplete="given-name"
                  placeholder="Tu nombre"
                  className={CAMPO}
                />
              </div>
              {error && (
                <p role="alert" className="text-[16px] font-medium leading-snug text-[var(--error-text)]">
                  {error}
                </p>
              )}
              <button type="submit" disabled={ocupado} className={BOTON}>
                {ocupado ? 'Entrando…' : 'Unirme'}
              </button>
            </form>
          </>
        )}
      </div>
    </Marco>
  );
}
