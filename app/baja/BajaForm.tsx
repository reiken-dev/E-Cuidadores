'use client';

import { useRef, useState } from 'react';
import { Marco } from '@/app/entrar/EntrarForm';
import { confirmarBaja } from './actions';

const BOTON =
  'flex h-14 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] bg-[image:var(--grad-cta)] text-[18px] font-semibold text-[var(--bg)] shadow-[0_8px_30px_color-mix(in_oklab,var(--accent)_25%,transparent)] transition-[opacity,transform] active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-60 [touch-action:manipulation]';

/** Pantalla de baja. `token` null = el enlace no es válido (mensaje neutro, sin pistas). */
export default function BajaForm({ token }: { token: string | null }) {
  const [estado, setEstado] = useState<'inicio' | 'enviando' | 'hecho' | 'fallo'>('inicio');
  const cerrojo = useRef(false);

  async function darseDeBaja() {
    if (cerrojo.current || !token) return;
    cerrojo.current = true;
    setEstado('enviando');
    try {
      const r = await confirmarBaja(token);
      setEstado(r.ok ? 'hecho' : 'fallo');
      if (r.ok) return;
    } catch {
      setEstado('fallo');
    }
    cerrojo.current = false;
  }

  return (
    <Marco>
      <div className="mt-6 flex flex-col">
        {!token ? (
          <>
            <h1 className="text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)]">Este enlace no sirve</h1>
            <p className="mt-2 text-[16px] leading-snug text-[var(--text-secondary)]">
              Está incompleto o mal copiado. Abre de nuevo el enlace del correo, o escríbenos y lo resolvemos.
            </p>
          </>
        ) : estado === 'hecho' ? (
          <>
            <h1 className="text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)]">Listo, ya no te escribiremos</h1>
            <p className="mt-2 text-[16px] leading-snug text-[var(--text-secondary)]">
              Dejaste de recibir los correos de novedades y resúmenes. Los avisos de tu cuenta y de cobro siguen llegando, porque son necesarios para el servicio.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)]">¿Dejar de recibir estos correos?</h1>
            <p className="mt-2 text-[16px] leading-snug text-[var(--text-secondary)]">
              Dejarás de recibir los resúmenes y las novedades. Los avisos de tu cuenta y de cobro seguirán llegando, porque son necesarios para el servicio.
            </p>
            {estado === 'fallo' && (
              <p role="alert" className="mt-4 text-[16px] font-medium leading-snug text-[var(--error-text)]">
                No pudimos completarlo. Inténtalo de nuevo en un momento.
              </p>
            )}
            <button type="button" onClick={() => void darseDeBaja()} disabled={estado === 'enviando'} className={`${BOTON} mt-5`}>
              {estado === 'enviando' ? 'Un momento…' : 'Sí, darme de baja'}
            </button>
          </>
        )}
      </div>
    </Marco>
  );
}
