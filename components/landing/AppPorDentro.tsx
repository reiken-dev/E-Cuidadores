'use client';

// LANDING — LA APP POR DENTRO
// Carrusel de frames de teléfono 9:19.5 con scroll-snap + dots sincronizados
// (IntersectionObserver) + mask-fade lateral (el corte nunca es seco) + CTA
// mid-page con el MISMO verbo del hero (19). Sin screenshot → frame PLACEHOLDER
// gris con el nombre de la pantalla futura. Los
// screenshots reales los toma la IA al cerrar la app (paso obligatorio).

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CtaButton, Kicker, SectionShell } from './primitives';
import { MarkedCopy, warnCopy, warnRango } from './MarkedCopy';

export interface FrameCarrusel {
  /** Screenshot REAL a 375px (ratio 9:19.5). Sin src → placeholder honesto. */
  src?: string;
  alt?: string;
  /** Label bajo el frame: nombre-RESULTADO de la pantalla ("Tu semana, ya planificada"). */
  label: string;
  /** Nombre de la pantalla futura para el placeholder ("Plan del día"). */
  nombrePantalla?: string;
}

export interface AppPorDentroProps {
  kicker?: string;
  /** Copy MARCADO del título (máx 8 palabras). */
  tituloMarked: string;
  /** 3-5 frames. */
  frames: FrameCarrusel[];
  /** CTA mid-page: mismas medidas y MISMO verbo del CTA héroe (19). */
  /** Sin etiqueta no hay CTA intermedio: la barra fija y la oferta ya cubren la acción. */
  ctaLabel?: string;
  ctaHref: string;
  /** Nota opcional bajo el carrusel (p. ej. "Capturas reales de la app."). */
  nota?: string;
  id?: string;
}

export function AppPorDentro({
  kicker,
  tituloMarked,
  frames,
  ctaLabel,
  ctaHref,
  nota,
  id,
}: AppPorDentroProps) {
  warnCopy('AppPorDentro → título', tituloMarked, 8);
  warnRango('AppPorDentro → frames', frames.length, 3, 5);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activo, setActivo] = useState(0);
  // Las capturas se piden solo cuando la sección está cerca: no compiten con la imagen del hero (LCP).
  const [cerca, setCerca] = useState(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setCerca(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Dots sincronizados con el frame más visible — obligatorios SIEMPRE
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = frameRefs.current.indexOf(e.target as HTMLDivElement);
            if (idx >= 0) setActivo(idx);
          }
        }
      },
      { root: scroller, threshold: 0.6 }
    );
    for (const f of frameRefs.current) {
      if (f) io.observe(f);
    }
    return () => io.disconnect();
  }, [frames.length]);

  const irA = (i: number): void => {
    frameRefs.current[i]?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  };

  return (
    <SectionShell id={id} elevacion="elevada" compacta ariaLabel="La app por dentro">
      <div>
        <div data-reveal className="mx-auto max-w-[620px] text-left md:text-center md:[&>p]:justify-center">
          {kicker && <Kicker>{kicker}</Kicker>}
          <h2 className="text-balance text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)] md:text-[36px]">
            <MarkedCopy text={tituloMarked} />
          </h2>
        </div>

        {/* Pista con scroll-snap + fade en ambos bordes (mask-image) */}
        <div data-reveal className="mt-10">
          <div
            ref={scrollerRef}
            // Scroll horizontal: debe poder recibir foco para que el teclado (flechas) lo desplace.
            tabIndex={0}
            role="region"
            aria-label="Capturas de la app. Desliza o usa las flechas para verlas"
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-[max(20px,calc(50%-125px))] pb-2 [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] [&::-webkit-scrollbar]:hidden"
          >
            {frames.map((f, i) => (
              <div key={i} className="shrink-0 snap-center">
                <div
                  ref={(el) => {
                    frameRefs.current[i] = el;
                  }}
                  className="relative aspect-[9/19.5] w-[250px] overflow-hidden rounded-[30px] border-[5px] bg-[var(--surface-2)] shadow-[var(--shadow-2)]"
                  style={{ borderColor: 'color-mix(in oklab, var(--text-primary) 90%, var(--accent))' }}
                >
                  {f.src ? (
                    cerca && (
                    <Image
                      src={f.src}
                      alt={f.alt ?? f.label}
                      width={250}
                      height={542}
                      className="h-full w-full object-cover"
                    />
                    )
                  ) : (
                    /* Placeholder honesto: gris elevado + nombre + dashed —
                       nunca un frame que finja producto terminado */
                    <div className="flex h-full w-full items-center justify-center border-2 border-dashed border-[color-mix(in_oklab,var(--text-tertiary)_40%,transparent)] bg-[var(--surface-2)] px-4">
                      <span className="text-center text-[16px] font-medium text-[var(--text-secondary)]">
                        {f.nombrePantalla ?? f.label}
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-center text-[16px] font-medium text-[var(--text-secondary)]">
                  {f.label}
                </p>
              </div>
            ))}
          </div>

          {/* Dots: activo en acento, resto neutro 30% — tocables (ir al frame) */}
          <div className="mt-2 flex justify-center">
            {frames.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => irA(i)}
                aria-label={`Ir a: ${f.label}`}
                aria-current={activo === i ? 'true' : undefined}
                className="flex size-11 items-center justify-center [touch-action:manipulation]"
              >
                <span
                  className={`size-2 rounded-full transition-colors duration-200 ${
                    activo === i
                      ? 'bg-[var(--accent)]'
                      : 'bg-[color-mix(in_oklab,var(--text-tertiary)_30%,transparent)]'
                  }`}
                />
              </button>
            ))}
          </div>
          {nota && <p className="mt-2 text-center text-[16px] text-[var(--text-secondary)]">{nota}</p>}
        </div>

        {/* CTA mid-page (reglas de CTA de 19): tras la prueba visual, cuando la confianza es alta */}
        {ctaLabel && (
          <div data-reveal className="mt-10 flex justify-center">
            <CtaButton href={ctaHref} id="cta-galeria">{ctaLabel}</CtaButton>
          </div>
        )}
      </div>
    </SectionShell>
  );
}
