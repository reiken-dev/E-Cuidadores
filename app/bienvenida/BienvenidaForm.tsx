'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Marco } from '@/app/entrar/EntrarForm';
import { crearClienteNavegador } from '@/lib/supabase/navegador';
import { crearCirculo } from '@/lib/datos/remoto';
import { borrarBorrador, leerBorrador } from '@/lib/datos/borrador';

const CAMPO =
  'h-14 w-full rounded-[var(--radius-button)] border border-[color-mix(in_oklab,var(--text-tertiary)_30%,transparent)] bg-[var(--surface)] px-5 text-[16px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus:border-[var(--accent)]';

const SIN_SUSCRIPCION = 'Tu compra aún no está activa. Cuando se confirme el pago podrás crear tu círculo: vuelve a intentarlo en unos minutos.';
const ERROR_GENERAL = 'No pudimos crear tu círculo. Revisa tu conexión e inténtalo de nuevo.';

export default function BienvenidaForm() {
  const router = useRouter();
  const [nombreFamiliar, setNombreFamiliar] = useState('');
  const [parentesco, setParentesco] = useState('Mamá');
  const [tuNombre, setTuNombre] = useState('');
  const [medicina, setMedicina] = useState('');
  const [hora, setHora] = useState('08:00');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  // Lo que se contestó en el recorrido de bienvenida (guardado en este navegador solo hasta crear el círculo).
  useEffect(() => {
    const b = leerBorrador();
    if (!b) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- precarga única tras montar: leer localStorage durante el render rompería la hidratación
    setNombreFamiliar(b.nombreFamiliar);
    if (b.parentesco) setParentesco(b.parentesco);
    setTuNombre(b.tuNombre);
    setMedicina(b.medicina);
    setHora(b.hora);
  }, []);

  async function enviar() {
    if (ocupado) return;
    if (!nombreFamiliar.trim()) return setError('Escribe el nombre de quien cuidas.');
    if (!tuNombre.trim()) return setError('Escribe tu nombre: así te verán tus hermanos.');
    setError('');
    setOcupado(true);
    try {
      const db = crearClienteNavegador();
      const { data } = (await db?.auth.getUser()) ?? { data: { user: null } };
      if (!db || !data.user) return setError(ERROR_GENERAL);
      const r = await crearCirculo(db, data.user.id, {
        nombreFamiliar,
        parentesco,
        tuNombre,
        primeraMed: medicina.trim() ? { name: medicina, time: hora } : null,
      });
      if (!r.ok) return setError(r.codigo === 'sin-suscripcion' ? SIN_SUSCRIPCION : ERROR_GENERAL);
      borrarBorrador();
      router.push('/app');
    } catch {
      setError(ERROR_GENERAL);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Marco>
      <div className="mt-6 flex flex-col">
        <h1 className="text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)]">Crea tu círculo</h1>
        <p className="mt-2 text-[16px] leading-snug text-[var(--text-secondary)]">
          Cuéntanos a quién cuidas. Después podrás completar el resto desde la app.
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
            <label htmlFor="familiar" className="mb-1.5 block text-[16px] font-medium text-[var(--text-primary)]">¿A quién cuidas?</label>
            <input id="familiar" value={nombreFamiliar} onChange={(e) => setNombreFamiliar(e.target.value)} maxLength={80} autoComplete="off" placeholder="Su nombre" className={CAMPO} />
          </div>
          <div>
            <label htmlFor="parentesco" className="mb-1.5 block text-[16px] font-medium text-[var(--text-primary)]">¿Quién es para ti?</label>
            <select id="parentesco" value={parentesco} onChange={(e) => setParentesco(e.target.value)} className={CAMPO}>
              <option value="Mamá">Mi mamá</option>
              <option value="Papá">Mi papá</option>
              <option value="Familiar mayor">Otro familiar mayor</option>
            </select>
          </div>
          <div>
            <label htmlFor="tu-nombre" className="mb-1.5 block text-[16px] font-medium text-[var(--text-primary)]">¿Cómo te llamas?</label>
            <input id="tu-nombre" value={tuNombre} onChange={(e) => setTuNombre(e.target.value)} maxLength={80} autoComplete="given-name" placeholder="Tu nombre" className={CAMPO} />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label htmlFor="medicina" className="mb-1.5 block text-[16px] font-medium text-[var(--text-primary)]">Primera medicina (opcional)</label>
              <input id="medicina" value={medicina} onChange={(e) => setMedicina(e.target.value)} maxLength={80} autoComplete="off" placeholder="Ej: Losartán" className={CAMPO} />
            </div>
            <div>
              <label htmlFor="hora" className="mb-1.5 block text-[16px] font-medium text-[var(--text-primary)]">Hora</label>
              <input id="hora" type="time" value={hora} onChange={(e) => setHora(e.target.value || '08:00')} className={`${CAMPO} px-3`} />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-[16px] font-medium leading-snug text-[var(--error-text)]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={ocupado}
            className="flex h-14 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] bg-[image:var(--grad-cta)] text-[18px] font-semibold text-[var(--bg)] shadow-[0_8px_30px_color-mix(in_oklab,var(--accent)_25%,transparent)] transition-[opacity,transform] active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-60 [touch-action:manipulation]"
          >
            {ocupado ? 'Creando tu círculo…' : 'Crear mi círculo'}
          </button>
        </form>
      </div>
    </Marco>
  );
}
