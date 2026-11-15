'use client';

// TU SUSCRIPCIÓN — la pantalla que protege el ingreso sin trucos:
//  · muestra el VALOR que el círculo ya recibió (el motivo real para seguir),
//  · deja actualizar el medio de pago o cancelar en un toque, SIN esconder nada,
//  · antes de cancelar hace UNA pregunta y responde con una ayuda honesta (nunca culpa),
//  · sugiere el plan anual solo a quien ya vio valor.
// La facturación la controla Hotmart: aquí no hay "pausas" que no pausen el cobro. Los enlaces salen de
// lib/marca.ts (ALUMNO: ahí pones panelComprasUrl y checkoutAnualUrl). Mientras no estén puestos, los botones
// abren un aviso claro de "falta conectar" en vez de llevar a una página que no cancela nada.

import { useEffect, useState } from 'react';
import { CalendarCheck, CreditCard, HeartHandshake, ShieldCheck, Users } from 'lucide-react';
import { Btn, Card, CountUp, LinkBtn, PageHeader, Pill } from '@/components/app/ui';
import { PrimerosPasos, TEXTO_SUSCRIPCION_INACTIVA } from '@/components/app/retencion';
import { Sheet } from '@/components/app/Sheet';
import { track } from '@/lib/analytics';
import { MARCA } from '@/lib/marca';
import { datosTexto, sincroTexto, textoConservacion, PRECIO_ANIO, PRECIO_ANIO_POR_MES, PRECIO_MES, textoMesesGratis, usd } from '@/lib/oferta';
import { diasDeSuscripcion, esPrimerMes, ofrecerAnual, valorRecibido } from '@/lib/retencion';
import { actions, useAppData, useNow } from '@/lib/store';
import type { PlanEstado, PlanTipo } from '@/lib/types';

type Motivo = 'caro' | 'no_uso' | 'falta' | 'otra_app' | 'ya_no_cuido' | 'otro';

const MOTIVOS: { id: Motivo; label: string }[] = [
  { id: 'caro', label: 'Me resulta caro' },
  { id: 'no_uso', label: 'No la estoy usando' },
  { id: 'falta', label: 'Le falta algo que necesito' },
  { id: 'otra_app', label: 'Encontré otra opción' },
  { id: 'ya_no_cuido', label: 'Ya no estoy cuidando a mi familiar' },
  { id: 'otro', label: 'Otro motivo' },
];

/** Botón que va al enlace real si está configurado; si no, avisa que falta conectarlo (nunca finge gestionar nada). */
function EnlaceCuenta({
  href,
  que,
  onFalta,
  ...rest
}: {
  href: string | null;
  que: string;
  onFalta: (que: string) => void;
  variant?: 'primary' | 'secondary' | 'soft' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (href) return <LinkBtn href={href} {...rest} />;
  const { children, ...btn } = rest;
  return (
    <Btn {...btn} onClick={() => onFalta(que)}>
      {children}
    </Btn>
  );
}

export default function PlanScreen() {
  const data = useAppData();
  const now = useNow();
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState<Motivo | null>(null);
  const [faltaConectar, setFaltaConectar] = useState<string | null>(null);

  const plan = data.plan;
  const valor = valorRecibido(data, now, 30);
  const dias = diasDeSuscripcion(plan, now);
  const anual = ofrecerAnual(plan, now) && (MARCA.checkoutAnualUrl || data.demo);
  const gestionar = MARCA.panelComprasUrl;

  useEffect(() => {
    track('plan_visto');
  }, []);
  const verAnual = !!anual;
  useEffect(() => {
    if (verAnual) track('plan_anual_visto');
  }, [verAnual]);

  function elegir(m: Motivo) {
    setMotivo(m);
    track('cancelacion_motivo', { motivo: m });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Tu suscripción" subtitle={`Con ustedes desde hace ${dias === 0 ? 'unas horas' : dias === 1 ? '1 día' : `${dias} días`}`} />

      <section
        aria-labelledby="valor-mes"
        className="borde-grad relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] p-5 shadow-[var(--shadow-2)]"
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: 'var(--grad-brand)' }} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-40 blur-2xl"
          style={{ background: 'color-mix(in oklab, var(--accent) 45%, transparent)' }}
        />
        <h2 id="valor-mes" className="t-label relative text-[var(--text-secondary)]">
          Lo que logró tu círculo este mes
        </h2>
        <p className="t-hero texto-grad relative mt-1">
          <CountUp to={valor.dosis} />
        </p>
        <p className="t-body relative text-[var(--text-primary)]">dosis con nombre y hora</p>
        <ul className="relative mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: CalendarCheck, n: valor.diasCompletos, t: 'días completos' },
            { icon: HeartHandshake, n: valor.citasAtendidas, t: 'citas atendidas' },
            { icon: Users, n: valor.hermanos, t: valor.hermanos === 1 ? 'hermano' : 'hermanos' },
          ].map((x) => (
            <li key={x.t} className="rounded-2xl bg-[var(--grad-soft)] p-3 ring-1 ring-[color-mix(in_oklab,var(--accent)_12%,transparent)]">
              <x.icon size={16} aria-hidden="true" className="text-[var(--accent)]" />
              <p className="t-title mt-1 tabular-nums text-[var(--text-primary)]">{x.n}</p>
              <p className="t-body text-[var(--text-secondary)]">{x.t}</p>
            </li>
          ))}
        </ul>
      </section>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="t-body text-[var(--text-secondary)]">Tu plan</p>
            <p className="t-title text-[var(--text-primary)]">
              {plan.tipo === 'anual' ? `Anual · ${usd(PRECIO_ANIO)}/año` : `Mensual · ${usd(PRECIO_MES)}/mes`}
            </p>
          </div>
          <Pill tone={plan.estado === 'activo' ? 'ok' : 'warn'}>{plan.estado === 'activo' ? 'Activo' : 'Pago pendiente'}</Pill>
        </div>
        {plan.estado === 'pago_pendiente' && (
          <p className="t-body mt-3 rounded-2xl bg-[color-mix(in_oklab,var(--warn)_20%,transparent)] p-3 text-[var(--text-primary)]">
            {plan.motivo === 'inactiva' ? `Tu suscripción no está activa. ${TEXTO_SUSCRIPCION_INACTIVA}` : 'No pudimos cobrar tu último pago. Actualiza tu medio de pago en Hotmart para mantener el acceso. '}
            {plan.motivo !== 'inactiva' && datosTexto(
              'Lo que anotaron sigue guardado en tu cuenta, y este cobro no borra nada. Si el acceso se suspende, podrán seguir consultándolo y descargarlo.',
              sincroTexto('Lo que anotaron sigue guardado, y este cobro no borra nada.', 'Lo que anotaron se guarda en este dispositivo, y este cobro no borra nada.')
            )}
          </p>
        )}
        <EnlaceCuenta
          href={gestionar}
          que="el panel de compras de Hotmart (para actualizar el medio de pago y administrar la suscripción)"
          onFalta={setFaltaConectar}
          variant={plan.estado === 'pago_pendiente' ? 'primary' : 'secondary'}
          size="lg"
          full
          className="mt-4"
        >
          <CreditCard size={18} aria-hidden="true" />
          {plan.estado === 'pago_pendiente' ? 'Actualizar el medio de pago' : 'Administrar mi suscripción'}
        </EnlaceCuenta>
      </Card>

      {esPrimerMes(plan, now) && <PrimerosPasos data={data} titulo="Tus primeros 30 días" />}

      {anual && (
        <Card as="section" className="p-5 ring-1 ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]">
          <p className="t-body font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Plan anual</p>
          <h2 className="t-sub mt-1 text-[var(--text-primary)]">
            {`${PRECIO_ANIO_POR_MES} al mes, con ${textoMesesGratis}`}
          </h2>
          <p className="t-body mt-1 text-[var(--text-secondary)]">
            Ya vieron cómo ayuda al círculo. {`Con el plan anual pagan ${usd(PRECIO_ANIO)} una vez al año.`}
          </p>
          <EnlaceCuenta
            href={MARCA.checkoutAnualUrl}
            que="el enlace de pago del plan anual de Hotmart"
            onFalta={setFaltaConectar}
            variant="ghost"
            size="md"
            full
            className="mt-2 !justify-start !px-0 text-[var(--accent-strong)]"
          >
            Ver el plan anual
          </EnlaceCuenta>
        </Card>
      )}

      <Btn
        variant="ghost"
        size="lg"
        full
        className="!font-semibold text-[var(--text-primary)] underline underline-offset-4"
        onClick={() => {
          setMotivo(null);
          setCancelando(true);
        }}
      >
        Quiero cancelar
      </Btn>

      {data.demo && <DemoPlan />}

      <Sheet
        open={cancelando}
        onOpenChange={setCancelando}
        title={motivo ? 'Antes de irte' : 'Cuéntanos qué pasó'}
        description={motivo ? undefined : 'Puedes cancelar ahora mismo. Lo que ya guardaste se conserva.'}
      >
        {!motivo ? (
          <div className="flex flex-col gap-3">
            <span onClickCapture={() => track('cancelacion_gestionar')} className="contents">
              <EnlaceCuenta href={gestionar} que="el panel de compras de Hotmart (para cancelar)" onFalta={setFaltaConectar} variant="secondary" size="lg" full>
                Cancelar en el panel de compras
              </EnlaceCuenta>
            </span>
            <p className="t-body text-center text-[var(--text-secondary)]">o cuéntanos por qué (es opcional y nos ayuda)</p>
            <div role="radiogroup" aria-label="Motivo" className="flex flex-col gap-2">
              {MOTIVOS.map((m) => (
                <Btn key={m.id} variant="soft" size="md" full onClick={() => elegir(m.id)}>
                  {m.label}
                </Btn>
              ))}
            </div>
          </div>
        ) : (
          <RespuestaMotivo motivo={motivo} tipo={plan.tipo} onSeguir={() => setCancelando(false)} gestionar={gestionar} onFalta={setFaltaConectar} />
        )}
      </Sheet>

      <Sheet
        open={faltaConectar !== null}
        onOpenChange={(o) => !o && setFaltaConectar(null)}
        title="Falta conectar este enlace"
        description="Esta es la plantilla: todavía no tiene cuenta de cobro propia."
      >
        <div className="flex flex-col gap-3">
          <p className="t-body text-[var(--text-primary)]">
            Aquí irá {faltaConectar}. Quien publique su versión debe poner ese enlace en <code>lib/marca.ts</code> (variables del archivo <code>.env.local</code>).
          </p>
          <Btn variant="soft" size="lg" full onClick={() => setFaltaConectar(null)}>
            Entendido
          </Btn>
        </div>
      </Sheet>
    </div>
  );
}

/* ── Respuesta honesta a cada motivo: ayuda, no presión ── */
function RespuestaMotivo({
  motivo,
  tipo,
  onSeguir,
  gestionar,
  onFalta,
}: {
  motivo: Motivo;
  tipo: PlanTipo;
  onSeguir: () => void;
  gestionar: string | null;
  onFalta: (que: string) => void;
}) {
  const cuadro: Record<Motivo, { titulo: string; texto: string; accion?: { label: string; href: string } }> = {
    caro: {
      titulo: 'Entendemos',
      texto: MARCA.cuponRegreso
        ? `Si prefieres quedarte, usa el cupón ${MARCA.cuponRegreso} en tu próxima renovación.`
        : tipo === 'mensual'
          ? `El plan anual sale a ${PRECIO_ANIO_POR_MES} al mes, con ${textoMesesGratis}.`
          : 'Escríbenos y buscamos una solución contigo.',
      accion: tipo === 'mensual' && MARCA.checkoutAnualUrl ? { label: 'Ver el plan anual', href: MARCA.checkoutAnualUrl } : undefined,
    },
    no_uso: {
      titulo: 'Retomar es fácil',
      texto: 'Lo que más ayuda a los círculos: confirmar cada dosis con nombre, invitar a un hermano y llevar el resumen a la cita.',
      accion: { label: 'Ir a Hoy', href: '/app' },
    },
    falta: {
      titulo: 'Cuéntanos qué falta',
      texto: 'Cuéntanos qué necesitas: nos ayuda a decidir qué mejorar.',
      accion: { label: 'Escribirnos', href: `mailto:${MARCA.soporteEmail}?subject=Me%20falta%20algo` },
    },
    otra_app: {
      titulo: 'Gracias por contarlo',
      texto: 'Nos ayuda saber qué te gustó más de la otra opción.',
      accion: { label: 'Escribirnos', href: `mailto:${MARCA.soporteEmail}?subject=Encontr%C3%A9%20otra%20opci%C3%B3n` },
    },
    ya_no_cuido: {
      titulo: 'Lo sentimos mucho',
      texto: `Gracias por habernos dejado acompañarlos. Puedes guardar el resumen para el médico antes de irte, y ${textoConservacion} por si los necesitas.`,
      accion: { label: 'Guardar el resumen', href: '/app/resumen' },
    },
    otro: { titulo: 'Gracias por contarlo', texto: 'Si quieres decirnos más, nos ayuda mucho.', accion: { label: 'Escribirnos', href: `mailto:${MARCA.soporteEmail}` } },
  };
  const c = cuadro[motivo];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="t-sub text-[var(--text-primary)]">{c.titulo}</p>
        <p className="t-body mt-1 text-[var(--text-secondary)]">{c.texto}</p>
      </div>
      {c.accion && (
        <LinkBtn href={c.accion.href} variant="soft" size="lg" full>
          {c.accion.label}
        </LinkBtn>
      )}
      <Btn variant="soft" size="lg" full onClick={onSeguir}>
        Seguir con mi suscripción
      </Btn>
      <span onClickCapture={() => track('cancelacion_gestionar')} className="contents">
        <EnlaceCuenta href={gestionar} que="el panel de compras de Hotmart (para cancelar)" onFalta={onFalta} variant="secondary" size="lg" full>
          Cancelar en el panel de compras
        </EnlaceCuenta>
      </span>
      <p className="t-body flex items-start gap-2 text-[var(--text-secondary)]">
        <ShieldCheck size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
        Si cancelas, {textoConservacion} y puedes volver cuando quieras.
      </p>
    </div>
  );
}

/* ── Solo en la demostración: ver cómo se ven los estados del plan ── */
function DemoPlan() {
  const data = useAppData();
  return (
    <details className="rounded-[var(--radius-card)] bg-[var(--surface-2)] p-4">
      <summary className="t-label flex min-h-11 cursor-pointer items-center font-semibold text-[var(--text-secondary)]">Probar estados (solo demostración)</summary>
      <div className="mt-2 flex flex-wrap gap-2">
        {(['activo', 'pago_pendiente'] as PlanEstado[]).map((e) => (
          <Btn key={e} size="sm" variant={data.plan.estado === e ? 'primary' : 'secondary'} onClick={() => actions.setPlan({ estado: e })}>
            {e === 'activo' ? 'Activo' : 'Pago pendiente'}
          </Btn>
        ))}
        {(['mensual', 'anual'] as PlanTipo[]).map((t) => (
          <Btn key={t} size="sm" variant={data.plan.tipo === t ? 'primary' : 'secondary'} onClick={() => actions.setPlan({ tipo: t })}>
            {t === 'mensual' ? 'Mensual' : 'Anual'}
          </Btn>
        ))}
      </div>
    </details>
  );
}
