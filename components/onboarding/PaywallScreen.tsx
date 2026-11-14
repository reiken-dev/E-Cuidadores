'use client';

// ONBOARDING — PaywallScreen.tsx
// Responde las 7 preguntas de 02B. Visual default CON trial: timeline Hoy → Día 5 → Día 7
// Costo hundido visible ("Hecho con tus 5 respuestas").
// CTA: con el cobro conectado (lib/marca.ts) va a Hotmart; sin conectar, simula el flujo con estado local
// (demo sin cobro, nunca un checkout falso).
//
// Escala tipográfica (5 tamaños, no más): 28 titular · 22 precios · 16 cuerpo/CTA · 14 apoyo · 13 detalle.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ChevronLeft, CreditCard, Pill, CalendarClock, MessagesSquare, Check, Users, CircleAlert } from 'lucide-react';
import { FunnelBrand, useReducedMotionSafe } from './OnboardingUI';
import { track } from '@/lib/analytics';
import { MARCA } from '@/lib/marca';
import { destinoDelCobro, planConEnlace } from '@/lib/cobro';
import {
  GARANTIA_DIAS,
  MONEDA_DECIMALES,
  MONEDA_SIMBOLO,
  PRECIO_ANIO,
  PRECIO_MES,
  textoMesesGratis,
  TRIAL_DIAS,
  tieneTrial,
  usd,
} from '@/lib/oferta';
import type { PreocupacionId } from './wizardStore';

export type { PreocupacionId };

const BENEFICIOS: Record<'medicamentos' | 'citas' | 'chat', { icon: typeof Pill; texto: string }> = {
  medicamentos: { icon: Pill, texto: 'Dosis con nombre, sin preguntar' },
  citas: { icon: CalendarClock, texto: 'Citas con responsable' },
  chat: { icon: MessagesSquare, texto: 'Notas de salud para la próxima consulta' },
};

/** El beneficio central que completa el headline.
   Separado en prefijo (peso normal) + frase clave (acento) — pintar TODA la frase en
   acento violaría 60-30-10 (el acento resalta la palabra que vende, no la oración
   entera. */
const BENEFICIO_HEADLINE: Record<PreocupacionId, { prefijo: string; clave: string }> = {
  medicamentos: { prefijo: 'para que nadie más pregunte', clave: '«¿ya le diste la pastilla?»' },
  citas: { prefijo: 'para que siempre sepan quién va a', clave: 'cada cita' },
  chat: { prefijo: 'para que nada se pierda en', clave: 'el chat familiar' },
  variado: { prefijo: 'para que nadie más pregunte', clave: '«¿ya le diste la pastilla?»' },
};

/** El dolor elegido en el paso 4 decide qué beneficio se resalta primero. */
function ordenarBeneficios(preocupacion: PreocupacionId) {
  const orden: ('medicamentos' | 'citas' | 'chat')[] =
    preocupacion === 'variado' || preocupacion === 'chat'
      ? ['chat', 'medicamentos', 'citas']
      : preocupacion === 'medicamentos'
        ? ['medicamentos', 'citas', 'chat']
        : ['citas', 'medicamentos', 'chat'];
  return orden.map((id) => BENEFICIOS[id]);
}

type PlanId = 'anual' | 'mensual';

const PRECIO: Record<PlanId, { valor: number; sufijo: string }> = {
  anual: { valor: PRECIO_ANIO, sufijo: '/año' },
  mensual: { valor: PRECIO_MES, sufijo: '/mes' },
};

/** Conteo suave hacia un número (300 ms, ease-out). Con "reducir movimiento" salta directo.
   Con `desdeCero` cuenta al montar (entrada del precio héroe); sin él, solo al cambiar de valor. */
function useCountTo(objetivo: number, desdeCero = false): number {
  const reduce = useReducedMotionSafe();
  const [mostrado, setMostrado] = useState(desdeCero ? 0 : objetivo);
  const actual = useRef(desdeCero ? 0 : objetivo);
  useEffect(() => {
    if (reduce) {
      actual.current = objetivo;
      return;
    }
    const inicio = actual.current;
    const delta = objetivo - inicio;
    if (delta === 0) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (ahora: number) => {
      const t = Math.min(1, (ahora - t0) / 300);
      const v = inicio + delta * (1 - Math.pow(1 - t, 3));
      actual.current = v;
      setMostrado(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [objetivo, reduce]);
  return reduce ? objetivo : mostrado;
}

/** Importe (con la moneda de lib/oferta.ts) que cuenta al cambiar. Los lectores de pantalla oyen solo el valor final. */
function Monto({ valor, desdeCero = false }: { valor: number; desdeCero?: boolean }) {
  const mostrado = useCountTo(valor, desdeCero);
  return (
    <>
      <span aria-hidden="true" className="tabular-nums">
        {MONEDA_SIMBOLO}
        {mostrado.toFixed(MONEDA_DECIMALES)}
      </span>
      <span className="sr-only">
        {MONEDA_SIMBOLO}
        {valor.toFixed(MONEDA_DECIMALES)}
      </span>
    </>
  );
}

function planDeLaUrl(): PlanId {
  try {
    return new URLSearchParams(window.location.search).get('plan') === 'mensual' ? 'mensual' : 'anual';
  } catch {
    return 'anual';
  }
}

/** Prueba del camino de error (por defecto no ocurre): `?simularError=1` hace fallar el primer
   intento de activar la prueba y `?simularError=2` los dos primeros. Se lee al pulsar, no al pintar. */
function fallosSimulados(): number {
  // Solo en desarrollo: en producción la URL no puede forzar un fallo.
  if (process.env.NODE_ENV !== 'development') return 0;
  try {
    const n = Number(new URLSearchParams(window.location.search).get('simularError'));
    return Number.isInteger(n) && n > 0 ? Math.min(n, 3) : 0;
  } catch {
    return 0;
  }
}

export function PaywallScreen({
  nombre,
  preocupacion,
  respuestasContadas,
  onBack,
  onEmpezarTrial,
}: {
  nombre: string;
  preocupacion: PreocupacionId;
  respuestasContadas: number;
  /** Opt-in del correo de aviso antes del primer cobro (estado real, se conserva al recargar). */
  avisar?: boolean;
  onAvisarChange?: (v: boolean) => void;
  /** Volver a las respuestas para corregirlas (el recorrido conserva lo escrito). */
  onBack: () => void;
  onEmpezarTrial: (plan: PlanId) => void;
}) {
  const reduce = useReducedMotionSafe();
  // La landing manda ?plan=mensual|anual: ese plan llega preseleccionado (esta pantalla solo se pinta en el
  // navegador, después de leer lo guardado, así que leer la URL aquí no causa diferencias de hidratación).
  const [plan, setPlan] = useState<PlanId>(() => planConEnlace(planDeLaUrl()));
  useEffect(() => {
    track('paywall_visto');
  }, []);
  const [activando, setActivando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intentos = useRef(0);
  const [fallos, setFallos] = useState(0);
  const timer = useRef<number | null>(null);
  const beneficios = useMemo(() => ordenarBeneficios(preocupacion), [preocupacion]);
  const enDemo = destinoDelCobro(plan).tipo === 'demo';

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );

  function handleCta() {
    if (activando) return;
    track('paywall_cta', { plan });
    setError(null);
    // Con enlaces de Hotmart conectados (lib/marca.ts), el cobro lo hace Hotmart. Sin ellos, es la demo (lib/cobro.ts).
    const destino = destinoDelCobro(plan);
    if (destino.tipo === 'sin-enlace') {
      // Si falta el enlace del plan elegido, no simulamos un alta: avisamos y dejamos elegir otro plan.
      setError('Este plan todavía no tiene enlace de pago. Elige el otro plan o escribe a soporte.');
      return;
    }
    if (destino.tipo === 'externo') {
      setActivando(true);
      window.location.assign(destino.url);
      return;
    }
    setActivando(true);
    // Demo sin cobro conectado: simulación local del flujo (sin backend y sin checkout falso).
    // Camino de error real: sin conexión, o un fallo de prueba pedido con ?simularError=N.
    timer.current = window.setTimeout(() => {
      intentos.current += 1;
      const sinRed = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (sinRed || intentos.current <= fallosSimulados()) {
        setActivando(false);
        setFallos(intentos.current);
        track('paywall_error', { intento: intentos.current });
        setError(
          sinRed
            ? 'Parece que no tienes conexión. No se cobró nada. Conéctate e inténtalo de nuevo.'
            : `No pudimos activar ${tieneTrial ? 'tu prueba' : 'tu plan'}. No se cobró nada. Inténtalo de nuevo en un momento.`
        );
        return;
      }
      onEmpezarTrial(plan);
    }, 1100);
  }


  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-x-clip px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] md:my-8 md:min-h-[calc(100dvh-64px)] md:rounded-[var(--radius-card)] md:shadow-[var(--shadow-2)] md:ring-1 md:ring-[color-mix(in_oklab,var(--text-tertiary)_14%,transparent)]">
      {/* Fondo con profundidad: mismo mesh radial coral+índigo de la marca (dispositivo
          ownable) — antes era un fill plano. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(560px 360px at 15% -5%, color-mix(in oklab, var(--accent-warm) 24%, transparent) 0%, transparent 60%), ' +
            'radial-gradient(480px 320px at 100% 15%, color-mix(in oklab, var(--accent-2) 18%, transparent) 0%, transparent 55%)',
        }}
      />

      {/* (1) Cierre + marca — visible desde el frame 1, sin delay */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver a mis respuestas"
          className="flex size-11 items-center justify-center rounded-full text-[var(--text-secondary)] focus-visible:outline-[3px] focus-visible:outline-[var(--accent)]"
        >
          <ChevronLeft size={22} strokeWidth={2.25} aria-hidden="true" />
        </button>
        <FunnelBrand hasProgress />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: reduce ? 0 : 0.07 } } }}
        className="mt-1 flex flex-1 flex-col"
      >
        {/* (2) Headline con el NOMBRE en acento + el beneficio central (nunca "está listo"
            a secas) + costo hundido cuantificado */}
        <motion.div variants={{ hidden: { opacity: 0, y: reduce ? 0 : 14 }, visible: { opacity: 1, y: 0 } }}>
          <h1 className="text-balance text-[28px] font-bold leading-[1.12] text-[var(--text-primary)] [font-family:var(--font-display)]">
            El registro de <span className="text-[var(--accent)]">{nombre}</span> está listo
          </h1>
          <p className="mt-2 text-[18px] font-medium leading-snug text-[var(--text-secondary)]">
            {BENEFICIO_HEADLINE[preocupacion].prefijo}{' '}
            <span className="text-[var(--accent)]">{BENEFICIO_HEADLINE[preocupacion].clave}</span>
          </p>
        </motion.div>


        {/* (3) Value stack: máx 3, el dolor elegido va primero. Icon chips SVG premium
            (40-48px, gate de detalles) en vez de un simple check genérico. */}
        <motion.ul
          aria-label={`Plan armado con tus ${respuestasContadas} respuestas`}
          variants={{ hidden: { opacity: 0, y: reduce ? 0 : 14 }, visible: { opacity: 1, y: 0 } }}
          className="mt-4 flex flex-col gap-3 rounded-[var(--radius-card)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]"
        >
          {[...beneficios.slice(0, 2), { icon: Users, texto: 'Una suscripción para todo el círculo' }].map((b, i) => (
            <li key={i} className="flex items-center gap-3 text-[16px] leading-snug text-[var(--text-primary)]">
              <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--grad-soft)] ring-1 ring-[color-mix(in_oklab,var(--accent)_18%,transparent)]">
                <b.icon size={18} strokeWidth={2} className="text-[var(--accent)]" />
              </span>
              <span className="text-balance">{b.texto}</span>
            </li>
          ))}
        </motion.ul>

        {/* (4)(5) Plan cards — anual pre-seleccionada, badge compite en peso con el CTA */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: reduce ? 0 : 14 }, visible: { opacity: 1, y: 0 } }}
          className="mt-5 flex flex-col gap-3"
        >
          <PlanCard
            activo={plan === 'anual'}
            onSelect={() => { setPlan('anual'); track('paywall_plan', { plan: 'anual' }); }}
            nombre="Anual"
            detalle={<>Equivale a {usd(PRECIO_ANIO / 12)} al mes<br />Un cobro por todo el año</>}
            precio={PRECIO_ANIO}
            periodo="/año"
            badge={textoMesesGratis}
            tachado={usd(PRECIO_MES * 12)}
            heroPrice
          />
          <PlanCard
            activo={plan === 'mensual'}
            onSelect={() => { setPlan('mensual'); track('paywall_plan', { plan: 'mensual' }); }}
            nombre="Mensual"
            detalle={<>Un cobro cada mes<br />Total en 12 meses: {usd(PRECIO_MES * 12)}</>}
            precio={PRECIO_MES}
          />
        </motion.div>

        {/* TIMELINE del trial — visual DEFAULT con trial (Blinkist: +23% inicios). Solo existe si hay prueba (TRIAL_DIAS > 0). */}
        {tieneTrial && (
          <motion.div
            variants={{ hidden: { opacity: 0, y: reduce ? 0 : 14 }, visible: { opacity: 1, y: 0 } }}
            className="mt-5 rounded-[var(--radius-card)] bg-[var(--surface-2)] p-4"
          >
            <TimelineTrial plan={plan} />
          </motion.div>
        )}

        {/* (6) CTA héroe + (7) reversibilidad: siempre visible al pie (sticky), con el importe del
            primer cobro y la garantía pegados al botón. */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: reduce ? 0 : 14 }, visible: { opacity: 1, y: 0 } }}
          className="sticky bottom-0 z-20 -mx-4 mt-5 bg-[color-mix(in_oklab,var(--bg)_94%,transparent)] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-10px_24px_-12px_rgb(14_27_51/0.16)] backdrop-blur"
        >
          {/* El aviso de error va pegado al botón: el alumno lo lee donde acaba de pulsar, no arriba de la página. */}
          {error && (
            <p
              role="alert"
              className="mb-3 flex items-start gap-2 rounded-[var(--radius-card)] bg-[color-mix(in_oklab,var(--error-text)_8%,var(--surface))] px-4 py-3 text-[16px] leading-snug text-[var(--error-text)]"
            >
              <CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>
                {error}
                {fallos >= 2 && ` Si sigue igual, escríbenos a ${MARCA.soporteEmail}.`}
              </span>
            </p>
          )}
          <motion.button
            type="button"
            whileTap={reduce ? undefined : { scale: 0.97 }}
            onClick={handleCta}
            disabled={activando}
            aria-live="polite"
            aria-busy={activando}
            className="flex h-14 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] bg-[image:var(--grad-cta)] text-[16px] font-semibold text-[var(--bg)] shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_10px_28px_-8px_color-mix(in_oklab,var(--accent)_55%,transparent)] transition-opacity [touch-action:manipulation] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-80"
          >
            {activando ? (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-[var(--bg)] border-t-transparent motion-reduce:animate-none"
                />
                Armando tu círculo…
              </span>
            ) : error ? (
              'Intentar de nuevo'
            ) : (
              tieneTrial ? `Empezar mis ${TRIAL_DIAS} días de prueba` : 'Activar mi Círculo de Cuidado'
            )}
          </motion.button>
          <p className="mt-2 text-balance text-center text-[16px] leading-snug text-[var(--text-secondary)]">
            {tieneTrial && !enDemo && <span className="block font-semibold text-[var(--text-primary)]">{`${TRIAL_DIAS} días de prueba, sin cobro hoy`}</span>}
            {enDemo && <span className="block font-semibold text-[var(--text-primary)]">Demostración: no se cobra nada ni se crea una cuenta real.</span>}
            {`Garantía de ${GARANTIA_DIAS} días desde el primer cobro`}
          </p>
        </motion.div>

        {/* (8) Salida limpia: dos acciones agrupadas en una sola fila */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: reduce ? 0 : 14 }, visible: { opacity: 1, y: 0 } }}
          className="mt-2 flex items-center justify-center gap-1 text-[16px] text-[var(--text-secondary)]"
        >
          <Link prefetch={false} href="/" className="flex min-h-11 items-center px-2 font-medium underline underline-offset-4">Ahora no</Link>
          <span aria-hidden="true">·</span>
          <Link prefetch={false} href="/entrar" className="flex min-h-11 items-center px-2 font-medium underline underline-offset-4">Ya tengo cuenta</Link>
        </motion.div>
        {/* Pie legal: aquí (y solo aquí) va el nombre del procesador de pagos */}
        <div className="mt-auto pt-4 pb-1 text-center text-[16px] leading-snug text-[var(--text-secondary)]">
          {MARCA.notaPago && <p>{MARCA.notaPago}</p>}
          <p className="flex items-center justify-center gap-4">
            <Link prefetch={false} href="/terminos" className="inline-flex min-h-11 items-center underline underline-offset-2">
              Términos
            </Link>
            <Link prefetch={false} href="/privacidad" className="inline-flex min-h-11 items-center underline underline-offset-2">
              Privacidad
            </Link>
            <Link prefetch={false} href="/reembolsos" className="inline-flex min-h-11 items-center underline underline-offset-2">
              Reembolsos
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}

/* ── Tarjeta de plan seleccionable (anual / mensual). Botón real con aria-pressed, indicador
   de "radio" propio (círculo con check), anillo de foco visible y MISMA altura en ambos
   planes (dos líneas: nombre + cuánto se cobra). El precio cuenta al entrar (300 ms). ── */
function PlanCard({
  activo,
  onSelect,
  nombre,
  detalle,
  precio,
  periodo = '/mes',
  tachado,
  badge,
  heroPrice = false,
}: {
  activo: boolean;
  onSelect: () => void;
  nombre: string;
  detalle: React.ReactNode;
  precio: number;
  periodo?: string;
  /** Precio mensual normal, tachado sobre el precio efectivo del plan anual (ancla real). */
  tachado?: string;
  badge?: string;
  /** El precio que ancla la oferta lleva la mancha cálida detrás (dispositivo ownable). */
  heroPrice?: boolean;
}) {
  const reduce = useReducedMotionSafe();
  return (
    <motion.button
      type="button"
      whileTap={reduce ? undefined : { scale: 0.98 }}
      onClick={onSelect}
      aria-pressed={activo}
      className="relative w-full rounded-[var(--radius-card)] text-left [touch-action:manipulation] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      {badge && (
        <span className="absolute -top-[10px] left-1/2 z-10 -translate-x-1/2 rounded-full bg-[var(--accent)] px-3 py-0.5 text-[14px] font-bold tracking-[0.02em] text-[var(--bg)]">
          {badge}
        </span>
      )}
      <div className={`flex min-h-[116px] items-stretch rounded-[var(--radius-card)] ${activo ? 'bg-[var(--surface)]' : ''} ${activo ? 'borde-grad borde-grad-2 shadow-[0_12px_28px_-10px_color-mix(in_oklab,var(--accent)_40%,transparent)]' : 'bg-[color-mix(in_oklab,var(--surface-2)_60%,var(--surface))] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_14%,transparent)]'}`}>
        <span
          className={`flex w-full items-center gap-3 rounded-[var(--radius-card)] p-4 ${badge ? 'pt-6' : ''} ${
            activo ? 'bg-[color-mix(in_oklab,var(--accent)_6%,transparent)]' : ''
          }`}
        >
          <span
            aria-hidden="true"
            className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
              activo ? 'bg-[var(--accent)]' : 'bg-[var(--surface)] shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--text-tertiary)_45%,transparent)]'
            }`}
          >
            {activo && <Check size={14} strokeWidth={3} color="var(--bg)" aria-hidden="true" />}
          </span>
          <span className="flex-1">
            <span className="block text-[16px] font-semibold text-[var(--text-primary)]">{nombre}</span>
            <span className="block text-[16px] leading-snug text-[var(--text-secondary)] text-balance">{detalle}</span>
          </span>
          <span className="relative isolate block text-right">
            {heroPrice && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -z-10 block"
                style={{
                  inset: '-22px -20px',
                  background:
                    'radial-gradient(closest-side, color-mix(in oklab, var(--accent-warm) 30%, transparent) 0%, transparent 100%)',
                }}
              />
            )}
            {tachado && (
              <span className="block text-[14px] tabular-nums text-[var(--text-secondary)] line-through decoration-[var(--text-secondary)]">
                <span className="sr-only">Precio mensual normal </span>
                {tachado}
              </span>
            )}
            <span className="block text-[22px] font-bold leading-none text-[var(--text-primary)] [font-family:var(--font-display)]">
              <Monto valor={precio} desdeCero={heroPrice} />
              <span className="text-[14px] font-medium text-[var(--text-secondary)]">{periodo}</span>
            </span>
          </span>
        </span>
      </div>
    </motion.button>
  );
}

/* ── Timeline del trial: 2 nodos, línea que se dibuja al entrar, monto y fecha
   exactos. Responde "¿cuándo se cobra?" y "¿qué me protege?" de un vistazo. ── */
function TimelineTrial({ plan }: { plan: PlanId }) {
  const reduce = useReducedMotionSafe();
  const cobro = PRECIO[plan];
  const nodos = [
    { titulo: <>Hoy: acceso completo</>, detalle: 'Todo el plan, sin límites', lleno: true },
    {
      titulo: (
        <>
          Día {TRIAL_DIAS}: tu primer cobro sería <Monto valor={cobro.valor} />
          {cobro.sufijo}
        </>
      ),
      detalle: `Cubierto por la Garantía de ${GARANTIA_DIAS} días`,
      lleno: false,
    },
  ];
  return (
    <div>
      <div className="relative pl-1">
        <motion.div
          aria-hidden="true"
          className="absolute top-[10px] left-[13px] w-[2px] origin-top bg-[var(--accent)]"
          style={{ height: 'calc(100% - 20px)' }}
          initial={{ scaleY: reduce ? 1 : 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: reduce ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
        <ul className="flex flex-col gap-4">
          {nodos.map((n, i) => (
            <li key={i} className="relative flex gap-3 pl-7">
              <span
                aria-hidden="true"
                className={`absolute top-[3px] left-0 size-3 rounded-full ${
                  n.lleno ? 'bg-[var(--accent)]' : 'border-2 border-[var(--accent)] bg-[var(--surface-2)]'
                }`}
              />
              <div>
                <p className="text-[16px] font-semibold text-[var(--text-primary)]">{n.titulo}</p>
                <p className="text-[16px] text-[var(--text-secondary)]">{n.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 flex items-center gap-2 border-t border-[color-mix(in_oklab,var(--text-tertiary)_18%,transparent)] pt-3 text-[16px] text-[var(--text-secondary)]">
        <CreditCard size={16} aria-hidden="true" className="shrink-0 text-[var(--accent)]" />
        Se renueva sola {plan === 'anual' ? 'cada año' : 'cada mes'}. Para cancelar, entra a Tu suscripción en la app.
      </p>
    </div>
  );
}
