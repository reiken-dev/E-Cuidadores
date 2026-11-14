// Página de ventas — E-Cuidadores
// Diez secciones de la landing, en orden fijo. El copy sale del texto marcado de la landing.
// Los tokens visuales salen de components/landing/tokens.css. Modelo onboarding-first: todo CTA va a /onboarding.

import { MARCA, SOPORTE_EMAIL_DE_EJEMPLO } from '@/lib/marca';
import { Circulo } from '@/components/brand/Circulo';
import { HeroCaptura } from '@/components/landing/HeroCaptura';
import { CalendarX, Check, CircleCheckBig, ClipboardList, HeartHandshake, Pill, Repeat, ShieldCheck, UserRoundCheck } from '@/components/landing/icons';
import { Hero } from '@/components/landing/Hero';
import { Problema } from '@/components/landing/Problema';
import { Agitacion } from '@/components/landing/Agitacion';
import { Solucion } from '@/components/landing/Solucion';
import { AppPorDentro } from '@/components/landing/AppPorDentro';
import { Pacto } from '@/components/landing/Pacto';
import { Oferta } from '@/components/landing/Oferta';
import { Garantia } from '@/components/landing/Garantia';
import { Faq } from '@/components/landing/Faq';
import { CtaFinal } from '@/components/landing/CtaFinal';
import { FooterLegal } from '@/components/landing/FooterLegal';
import { correoTexto, OFERTA_ES_EJEMPLO, sincroTexto, GARANTIA_DIAS, PRECIO_ANIO, PRECIO_ANIO_POR_MES, PRECIO_MES, TRIAL_DIAS, tieneTrial, textoMesesGratis, usd } from '@/lib/oferta';
import { StickyCtaMobile, StickyMiniHeader } from '@/components/landing/sticky';
import { RevealObserver } from '@/components/landing/reveal';
import { PruebaSocial } from '@/components/landing/PruebaSocial';

// Modelo onboarding-first: el CTA lleva a /onboarding,
// nunca al checkout directo desde la landing.
const CTA_HREF = '/onboarding';
// El plan que tocó el visitante viaja a la pantalla de planes, que lo deja preseleccionado.
const CTA_HREF_ANUAL = '/onboarding?plan=anual';
const CTA_HREF_MENSUAL = '/onboarding?plan=mensual';
const CTA_LABEL = 'Armar mi Círculo de Cuidado';
// Cuándo se cobra + la garantía, siempre junto al botón de decisión. Toda mención de garantía dice
// «Garantía de 7 días» (GARANTIA_DIAS en lib/oferta.ts; el plazo sale de la configuración, no de aquí).
const NOTA_GARANTIA = [
  ...(tieneTrial ? [`${TRIAL_DIAS} días de prueba. Primer cobro el día ${TRIAL_DIAS}.`] : []),
  `Garantía de ${GARANTIA_DIAS} días`,
];

// Hechos verificables del propio producto (no hay testimonios ni cifras reales todavía: no se inventan).
// La garantía va bajo el CTA principal, como en el resto de la landing (Garantía de N días, siempre).
const HECHOS_HERO = [
  ...(tieneTrial ? [`pruébala ${TRIAL_DIAS} días gratis`] : []),
  `Garantía de ${GARANTIA_DIAS} días`,
  'Modo simple para tu familiar mayor',
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text-primary)] [font-family:var(--font-body)] pb-[calc(101px+env(safe-area-inset-bottom))] md:pb-0">
      {/* Cabecera ÚNICA de la página: fija arriba, con la marca y "Entrar". Es el único <header> del DOM
          (antes había otro dentro del Hero y el duplicado quedaba fuera de pantalla). */}
      <RevealObserver />
      <StickyMiniHeader appName={MARCA.nombre} loginHref="/entrar" />

      {/* La barra fija inferior (móvil) ocupa 85 px + la zona segura; el padding de arriba deja que el
          pie llegue por encima de ella (alto de la barra + safe-area + 16 px). */}

      {/* HTML semántico: las secciones de contenido
          viven dentro de <main> — antes pasaban de <header> (dentro de Hero) directo a
          <section> sueltas sin landmark principal para lectores de pantalla. */}
      <main>
      {/* 1. HERO */}
      <Hero
        appName={MARCA.nombre}
        loginHref="/entrar"
        h1Marked="Que nadie más pregunte «¿ya le diste la [acento]pastilla[/acento]?»"
        subtitleMarked="Organiza medicinas, citas y quién se encarga de cada cuidado."
        ctaLabel={CTA_LABEL}
        ctaHref={CTA_HREF}
        socialProof={
          <ul className="mx-auto flex w-fit flex-col items-center gap-1 md:mx-0 md:items-start">
            {HECHOS_HERO.map((h) => (
              <li key={h} className="flex items-start gap-1.5">
                <Check size={14} strokeWidth={2.5} aria-hidden="true" className="mt-[5px] shrink-0 text-[var(--accent)]" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        }
        halo={false}
        visual={<HeroCaptura nombreApp={MARCA.nombre} />}
      />

      {/* 2. PROBLEMA — la escena exacta: el chat familiar a las 9:40 pm (escena ilustrativa) */}
      <Problema
        titulo="Son las 9:40 de la noche y el chat dice…"
        etiqueta="Escena ilustrativa"
        mensajes={[
          { autor: 'Ana', hora: '9:40 pm', tono: 'violet', texto: '¿Alguien le dio la pastilla a mamá?' },
          { autor: 'Luis', hora: '9:41 pm', tono: 'sun', texto: 'Yo pensé que Carlos.' },
          { autor: 'Tú', hora: '9:43 pm', tono: 'accent', propio: true, texto: 'Déjame buscar entre las fotos…' },
        ]}
        cierreMarked="No falta cariño. Falta [acento]un lugar[/acento] donde lo importante no se pierda."
      />

      {/* 3. AGITACIÓN — tres costos cotidianos, sin miedo ni diagnósticos */}
      <Agitacion
        escenaMarked="Cuando nadie lo anota, [acento]cada quien recuerda distinto[/acento]."
        costos={[
          { icon: Repeat, titulo: 'Una dosis dada dos veces, o ninguna', detalle: 'Cada uno cree que otro ya se encargó.' },
          { icon: CalendarX, titulo: 'Una cita sin acompañante', detalle: 'Nadie sabe a quién le tocaba ir.' },
          { icon: ClipboardList, titulo: 'Una novedad que no llega al médico', detalle: 'Se quedó en un audio del chat.' },
        ]}
      />

      {/* 4. SOLUCIÓN — mecanismo bautizado: Dosis con nombre dentro del Círculo de Cuidado */}
      <Solucion
        kicker="EL MÉTODO"
        tituloMarked="El cuidado de tu familiar, [acento]organizado[/acento]"
        mecanismo="Dosis con nombre: quién la dio y cuándo"
        definicion={`cada dosis se confirma con quién la dio y a qué hora.${sincroTexto(' Todo el círculo lo ve.', ' Queda en un solo lugar.')}`}
        bigIdeaMarked="Tu Círculo de Cuidado reúne los registros de tu familiar: medicinas, citas y novedades."
        ilustracion={<Circulo size={220} />}
        pasos={[
          { icon: Pill, titulo: 'Registra', detalle: 'Medicinas, horarios y a quién le toca.' },
          { icon: CircleCheckBig, titulo: 'Confirma', detalle: 'Con tu nombre y la hora exacta.' },
          { icon: ClipboardList, titulo: 'Lleva el resumen', detalle: 'Una página lista para el médico.' },
        ]}
        antesDespues={{
          labelAntes: 'Antes',
          antes: '«¿Ya le diste la pastilla?»',
          labelDespues: `Con ${MARCA.nombre}`,
          despues: 'Dada por Marta, 8:18 a. m.',
        }}
      />

      {/* 5. LA APP POR DENTRO — capturas reales de las 5 pestañas con datos de demostración (carpeta public/mockups) */}
      <AppPorDentro
        tituloMarked="Así se ve [acento]un día de cuidado[/acento]"
        frames={[
          { label: 'Quién da cada medicina', nombrePantalla: 'Medicinas', src: '/mockups/app-medicinas.avif', alt: 'Pestaña Medicinas: lista de medicinas con horario y responsable' },
          { label: 'Citas con responsable', nombrePantalla: 'Citas', src: '/mockups/app-citas.avif', alt: 'Pestaña Citas: calendario de consultas y quién acompaña' },
          { label: sincroTexto('Lo que pasó, para todos', 'Lo que pasó, en un lugar'), nombrePantalla: 'Bitácora', src: '/mockups/app-bitacora.avif', alt: 'Pestaña Bitácora: novedades del cuidado' },
          { label: 'El círculo y su familiar', nombrePantalla: 'Familia', src: '/mockups/app-familia.avif', alt: 'Pestaña Familia: hermanos del círculo y ficha de tu familiar' },
          { label: 'Tu día, de un vistazo', nombrePantalla: 'Hoy', src: '/mockups/app-hoy.avif', alt: 'Pestaña Hoy: próxima dosis, quién se la da y la próxima cita' },
        ]}
        ctaHref={CTA_HREF}
        nota="Capturas reales de la app."
      />

      {/* 5B. PACTO — lo que la app nunca hará */}
      <Pacto
        titulo="Tres promesas que sí cumplimos"
        promesas={[
          { icon: UserRoundCheck, titulo: 'Cada dosis, con nombre y hora', detalle: 'Sin nombre y hora queda pendiente: nada se da por hecho.' },
          { icon: ShieldCheck, titulo: 'Nada sale sin tu aprobación', detalle: 'El resumen para el médico sale cuando tú lo apruebas.' },
          { icon: HeartHandshake, titulo: 'Cero culpa', detalle: 'Ni para cobrarte ni para retenerte.' },
        ]}
      />

      {/* Prueba social: solo aparece con testimonios reales (lib/prueba-social.ts). Sin datos, no ocupa espacio. */}
      <PruebaSocial />

      {/* 6. OFERTA — anual primero, trial en ambas, total anual visible */}
      <Oferta
        tituloMarked={
          OFERTA_ES_EJEMPLO
            ? 'Un plan para [acento]todo el círculo[/acento]'
            : tieneTrial
              ? `Gratis ${TRIAL_DIAS} días, luego [acento]${usd(PRECIO_ANIO / 365)} al día[/acento]`
              : `Un precio claro, [acento]${usd(PRECIO_ANIO / 365)} al día[/acento]`
        }
        enlace={{ label: 'Antes de decidir, explora la app', href: '/app' }}
        trialDias={tieneTrial ? TRIAL_DIAS : undefined}
        anual={{
          nombre: 'Anual',
          badge: 'MEJOR PRECIO',
          precioMes: PRECIO_ANIO_POR_MES,
          totalAnual: `Se cobra ${usd(PRECIO_ANIO)}/año`,
          ahorro: textoMesesGratis,
          ctaLabel: CTA_LABEL,
          ctaHref: CTA_HREF_ANUAL,
          notaCta: NOTA_GARANTIA,
          features: [
            'Todos los hermanos, en un mismo círculo',
            'Dosis con nombre y hora, siempre a la vista',
            correoTexto('Citas con responsable y avisos programados', 'Citas con responsable y fecha a la vista'),
            'Resumen de una página para cada consulta',
            'Modo simple para tu familiar mayor',
          ],
        }}
        mensual={{
          nombre: 'Mensual',
          precioMes: usd(PRECIO_MES),
          ctaLabel: 'Elegir el plan mensual',
          ctaHref: CTA_HREF_MENSUAL,
          notaCta: NOTA_GARANTIA,
          features: [
            'Todos los hermanos, en un mismo círculo',
            'Dosis con nombre y hora, siempre a la vista',
            correoTexto('Citas con responsable y avisos programados', 'Citas con responsable y fecha a la vista'),
            'Resumen de una página para cada consulta',
            'Modo simple para tu familiar mayor',
          ],
        }}
      />

      {/* 7. GARANTÍA */}
      <Garantia
        nombre={`Garantía de ${GARANTIA_DIAS} días`}
        condicionMarked={`Si en los primeros ${GARANTIA_DIAS} días desde tu primer cobro sientes que no te sirve, [b]te devolvemos tu dinero[/b].`}
      />

      {/* 8. FAQ — objeciones más comunes */}
      <Faq
        items={[
          {
            pregunta: '¿Y si no tengo tiempo para aprender otra app?',
            respuestaMarked: 'Abres la app y ves la próxima dosis y la próxima cita. Armarla es un proceso [b]guiado, paso a paso[/b].',
          },
          {
            pregunta: '¿Mis hermanos también pagan?',
            respuestaMarked: 'Tú organizas el círculo y decides a quién invitar. Lo que cuesta y lo que incluye está en [b]Tus planes[/b].',
          },
          {
            pregunta: '¿Es seguro poner los datos de salud?',
            // Hoy no hay sincronización ni invitaciones que funcionen: el texto solo afirma lo que hace el código.
            respuestaMarked: sincroTexto(
              'Los datos solo los ven quienes tú invitas al Círculo de Cuidado. Nada se envía sin tu aprobación.',
              'Hoy lo que escribes se guarda solo en este dispositivo y no se envía a ningún servidor. Compartir el círculo entre hermanos todavía no está conectado.'
            ),
          },
          {
            pregunta: '¿Y si mi familiar siente que lo vigilan?',
            respuestaMarked: 'La app es para que los hermanos se coordinen. El modo simple de tu familiar es opcional.',
          },
          {
            pregunta: '¿Cómo se paga y cómo se cancela?',
            // Solo promete lo que pasa de verdad: la cancelación se hace en el panel de compras de tu plataforma de pago.
            respuestaMarked: `${MARCA.mediosPago ?? 'Tarjeta de crédito o débito y, según tu país, otros medios.'} ${tieneTrial ? `Prueba de ${TRIAL_DIAS} días sin cobro hoy. Garantía de ${GARANTIA_DIAS} días desde tu primer cobro. ` : ''}Para cancelar, usa el panel de compras de tu plataforma de pago.`,
          },
        ]}
      />

      {/* 9. CTA FINAL */}
      <CtaFinal
        h2Marked="Llega a la próxima cita [acento]con todo listo[/acento]"
        futurePacingMarked="Imagina abrir la app y ver qué sigue y a quién le toca."
        ctaLabel={CTA_LABEL}
        ctaHref={CTA_HREF}

      />
      </main>

      {/* 10. FOOTER LEGAL — enlaces a las páginas legales */}
      <FooterLegal
        appName={MARCA.nombre}
        soporteEmail={SOPORTE_EMAIL_DE_EJEMPLO ? undefined : MARCA.soporteEmail}
        notaPago={MARCA.notaPago ?? undefined}
        enlaces={[
          { label: 'Privacidad', href: '/privacidad' },
          { label: 'Términos', href: '/terminos' },
          { label: 'Reembolsos', href: '/reembolsos' },
          { label: 'Cookies', href: '/cookies' },
          { label: 'Aviso médico', href: '/aviso-medico' },
        ]}
      />

      {/* Sticky CTA mobile: observa #hero, #oferta y #cta-final */}
      <StickyCtaMobile labelComercial={CTA_LABEL} labelPre={CTA_LABEL} href={CTA_HREF} />
    </div>
  );
}
