'use client';

// RESUMEN PARA EL MÉDICO — una página sobria, apta para imprimir: nombre de quien se cuida, alergias (dato de
// seguridad con su fecha de registro), medicinas, horarios y dosis registradas con su fecha.
// Sin notas, síntomas, condiciones ni datos de contacto. NUNCA se envía nada solo: el usuario ve la vista previa y decide.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Eye, Printer, Share2 } from 'lucide-react';
import { Btn, ChipToggle } from '@/components/app/ui';
import { useFeedback } from '@/components/app/Feedback';
import { cap, fmtLongDate, fmtShortDate, fmtTime, keyFromMs } from '@/lib/dates';
import { freqLabel } from '@/lib/schedule';
import { buildSummary, buildSummaryText, ESTADO_SIN_CONFIRMAR, notaAlergias } from '@/lib/summary';
import { useAppData, useNow } from '@/lib/store';
import { track } from '@/lib/analytics';
import { MARCA } from '@/lib/marca';

export default function ResumenScreen() {
  useEffect(() => {
    track('resumen_abierto');
  }, []);
  const data = useAppData();
  const now = useNow();
  const router = useRouter();
  const { notify } = useFeedback();
  const [weeks, setWeeks] = useState(4);
  const s = buildSummary(data, now, weeks);
  const hoyK = keyFromMs(now);

  function volver() {
    if (window.history.length > 1) router.back();
    else router.push('/app');
  }

  async function compartir() {
    const texto = buildSummaryText(s);
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Resumen de medicinas para el médico', text: texto });
        return;
      }
      await navigator.clipboard.writeText(texto);
      notify('Copiamos el resumen. Pégalo en el mensaje o correo que quieras.');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      notify('No pudimos compartirlo solo. Usa Imprimir o guardar como PDF.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-col gap-4">
        <button
          type="button"
          onClick={volver}
          className="t-body inline-flex min-h-11 w-fit items-center gap-2 pr-4 font-medium text-[var(--text-secondary)] [touch-action:manipulation]"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Volver
        </button>
        <p className="t-body flex items-start gap-2 rounded-2xl bg-[var(--chip-bg)] p-4 text-[var(--text-primary)]">
          <Eye size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--accent)]" />
          Revisa el resumen antes de imprimirlo o compartirlo. No se envía automáticamente.
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Período del resumen">
          {[2, 4].map((w) => (
            <ChipToggle key={w} selected={weeks === w} onClick={() => setWeeks(w)}>
              Últimas {w} semanas
            </ChipToggle>
          ))}
        </div>
      </div>

      <article className="rounded-[var(--radius-card)] bg-[var(--surface)] p-6 shadow-[var(--shadow-2)] ring-1 ring-[color-mix(in_oklab,var(--text-tertiary)_14%,transparent)] print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <header className="border-b border-[color-mix(in_oklab,var(--text-tertiary)_25%,transparent)] pb-4">
          <p className="t-body text-[var(--text-secondary)]">{MARCA.nombre} · Resumen para el médico</p>
          <h1 className="t-h1 mt-2 text-[var(--text-primary)]">Medicinas y dosis registradas</h1>
          <p className="t-body mt-2 text-[var(--text-primary)]">
            Paciente: <span className="font-semibold">{s.paciente}</span>
          </p>
          <p className="t-body mt-2 text-[var(--text-secondary)]">
            Preparado el {fmtLongDate(hoyK)} · Últimas {weeks} semanas
          </p>
        </header>

        <section
          aria-labelledby="alergias-titulo"
          className="mt-6 break-inside-avoid rounded-2xl border border-[var(--danger)] bg-[color-mix(in_oklab,var(--danger)_6%,transparent)] p-4"
        >
          <h2 id="alergias-titulo" className="t-sub flex items-center gap-2 text-[var(--danger-text)]">
            <AlertTriangle size={18} aria-hidden="true" className="shrink-0" />
            Alergias · dato de seguridad
          </h2>
          {s.alergias.length === 0 ? (
            <p className="t-body mt-2 text-[var(--text-primary)]">{notaAlergias(s)}</p>
          ) : (
            <>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                {s.alergias.map((a) => (
                  <li key={a} className="t-body font-semibold text-[var(--text-primary)]">
                    {a}
                  </li>
                ))}
              </ul>
              <p className="t-body mt-3 text-[var(--text-secondary)]">{notaAlergias(s)}</p>
            </>
          )}
        </section>

        <Section title="Medicinas actuales">
          {s.activeMeds.length === 0 ? (
            <p className="t-body text-[var(--text-secondary)]">No hay medicinas activas registradas.</p>
          ) : (
            <ul className="flex flex-col">
              {s.activeMeds.map((m) => (
                <li key={m.id} className="border-t border-[color-mix(in_oklab,var(--text-tertiary)_16%,transparent)] py-3 first:border-t-0 first:pt-0">
                  <p className="t-body font-semibold text-[var(--text-primary)]">
                    {m.name} <span className="font-normal text-[var(--text-secondary)]">{m.dose}</span>
                  </p>
                  <p className="t-body text-[var(--text-secondary)]">
                    {m.times.map(fmtTime).join(', ')} · {freqLabel(m.freq)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {s.pausedMeds.length > 0 && (
            <p className="t-body mt-3 text-[var(--text-secondary)]">En pausa: {s.pausedMeds.map((m) => m.name).join(', ')}</p>
          )}
        </Section>

        <Section title="Dosis registradas">
          {s.esperadas === 0 ? (
            <p className="t-body text-[var(--text-secondary)]">Aún no hay dosis registradas en este período.</p>
          ) : (
            <>
              <p className="t-body text-[var(--text-primary)]">
                <span className="font-semibold tabular-nums">
                  {s.dadas} de {s.esperadas}
                </span>{' '}
                dosis dadas, confirmadas por la familia en la app.
              </p>
              <ul className="mt-3 flex flex-col">
                {s.porMedicina
                  .filter((r) => r.esperadas > 0)
                  .map((r) => (
                    <li key={r.med.id} className="border-t border-[color-mix(in_oklab,var(--text-tertiary)_16%,transparent)] py-3 first:border-t-0 first:pt-0">
                      <p className="t-body font-semibold text-[var(--text-primary)]">
                        {r.med.name}{' '}
                        <span className="font-normal text-[var(--text-secondary)]">
                          {r.dadas} de {r.esperadas} dadas
                        </span>
                      </p>
                      {r.sinConfirmar.length > 0 && (
                        <ul className="mt-2 flex flex-col gap-1">
                          {r.sinConfirmar.map((x) => (
                            <li key={`${x.fecha}-${x.hora}`} className="t-body text-[var(--text-secondary)]">
                              {cap(fmtShortDate(x.fecha))}, {fmtTime(x.hora)}: {ESTADO_SIN_CONFIRMAR[x.estado]}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
              </ul>
            </>
          )}
        </Section>

        <p className="t-body mt-6 border-t border-[color-mix(in_oklab,var(--text-tertiary)_25%,transparent)] pt-4 text-[var(--text-secondary)]">
          Generado con {MARCA.nombre} el {fmtLongDate(hoyK)}. Es un apoyo para la consulta y no reemplaza el criterio del médico.
        </p>
      </article>

      {/* Espacio para que el resumen llegue por encima de la barra fija (145 px + zona segura + 16 px). */}
      <div className="h-[calc(161px+env(safe-area-inset-bottom))] no-print" aria-hidden="true" />
      <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-[color-mix(in_oklab,var(--text-tertiary)_16%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 pt-3 sm:flex-row">
          <Btn size="lg" full onClick={() => window.print()}>
            <Printer size={20} aria-hidden="true" />
            Imprimir o guardar como PDF
          </Btn>
          <Btn size="lg" full variant="secondary" onClick={compartir}>
            <Share2 size={20} aria-hidden="true" />
            Compartir
          </Btn>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="t-sub mb-3 text-[var(--text-primary)]">{title}</h2>
      {children}
    </section>
  );
}
