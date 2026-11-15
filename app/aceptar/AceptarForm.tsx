'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert } from 'lucide-react';
import { Casilla, Marco } from '@/app/entrar/EntrarForm';
import { aceptarConsentimientos } from './actions';

export default function AceptarForm({ siguiente = '/app' }: { siguiente?: string }) {
  const router = useRouter();
  const [terminos, setTerminos] = useState(false);
  const [salud, setSalud] = useState(false);
  const [error, setError] = useState('');
  const [ocupado, enCurso] = useTransition();

  function enviar() {
    if (ocupado) return;
    if (!terminos || !salud) {
      setError(
        !terminos
          ? 'Confirma que tienes 18 años o más y que aceptas los términos y la privacidad.'
          : 'Marca la autorización sobre los datos de salud de tu familiar.'
      );
      return;
    }
    setError('');
    enCurso(async () => {
      const r = await aceptarConsentimientos({ terminos, salud });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(siguiente);
      router.refresh();
    });
  }

  return (
    <Marco>
      <div className="mt-6 flex flex-col">
        <h1 className="text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)]">
          Antes de entrar
        </h1>
        <p className="mt-2 text-[16px] leading-snug text-[var(--text-secondary)]">
          Para usar tu panel necesitamos que confirmes estas dos cosas.
        </p>
        <form
          className="mt-5 flex flex-col gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          <fieldset className="flex flex-col gap-1">
            <legend className="sr-only">Aceptaciones para entrar</legend>
            <Casilla checked={terminos} onChange={setTerminos}>
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
            <Casilla checked={salud} onChange={setSalud}>
              Autorizo tratar los datos de salud de mi familiar que yo escriba, y tengo su permiso o el derecho de cuidarlo.{' '}
              <a href="/privacidad#salud" target="_blank" rel="noopener" className="font-medium text-[var(--text-primary)] underline underline-offset-2">
                Ver detalles
              </a>
            </Casilla>
          </fieldset>
          {error && (
            <p role="alert" className="flex items-start gap-1.5 text-[16px] font-medium leading-snug text-[var(--error-text)]">
              <CircleAlert size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={ocupado}
            className="flex h-14 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] bg-[image:var(--grad-cta)] text-[18px] font-semibold text-[var(--bg)] shadow-[0_8px_30px_color-mix(in_oklab,var(--accent)_25%,transparent)] transition-[opacity,transform] active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-60 [touch-action:manipulation]"
          >
            {ocupado ? 'Guardando…' : 'Continuar'}
          </button>
        </form>
      </div>
    </Marco>
  );
}
