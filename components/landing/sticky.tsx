/* La landing usa <a> simples (navegación completa): evita hidratar un <Link> por enlace y mantiene el JavaScript mínimo. */
/* eslint-disable @next/next/no-html-link-for-pages */
'use client';

// Barras fijas de la landing (mini-header y CTA móvil). Sin librería de animación: el estado
// visible/oculto lo decide un IntersectionObserver y la transición es CSS.

import { useEffect, useState } from 'react';
import { BrandMark } from './primitives';

function useVisto(id: string | null, selector?: string, inicial = false): { visto: boolean; algunaVez: boolean } {
  const [estado, setEstado] = useState({ visto: inicial, algunaVez: false });
  useEffect(() => {
    const el = (selector && document.querySelector(selector)) || (id ? document.getElementById(id) : null);
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setEstado((p) => ({ visto: e.isIntersecting, algunaVez: p.algunaVez || e.isIntersecting })),
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id, selector]);
  return estado;
}

/* Barra fija inferior SOLO móvil: aparece cuando el hero sale; se oculta frente a la oferta y al CTA
   final. Antes de ver la oferta el botón lleva a #oferta; después, al CTA comercial. */
export function StickyCtaMobile({
  labelComercial,
  href,
  labelPre = 'Ver plan y precios',
  heroId = 'hero',
  ofertaId = 'oferta',
  ctaFinalId = 'cta-final',
}: {
  labelComercial: string;
  href: string;
  labelPre?: string;
  heroId?: string;
  ofertaId?: string;
  ctaFinalId?: string;
}) {
  const { visto: heroVisible } = useVisto(heroId, undefined, true);
  const { visto: ofertaVisible, algunaVez: ofertaVista } = useVisto(ofertaId);
  const { visto: finalVisible } = useVisto(ctaFinalId);
  const visible = !heroVisible && !ofertaVisible && !finalVisible;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[color-mix(in_oklab,var(--text-tertiary)_25%,transparent)] bg-[var(--surface)] px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
      }`}
    >
      <a href={ofertaVista ? href : `#${ofertaId}`}
        id="cta-barra-fija"
        data-evento={ofertaVista ? 'inicio-compra' : 'ver-planes'}
        data-cta="barra-fija"
        tabIndex={visible ? 0 : -1}
        className="flex h-16 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] bg-[image:var(--grad-cta)] text-[18px] font-semibold text-[var(--bg)] transition-transform active:scale-[0.97] [touch-action:manipulation]"
      >
        {ofertaVista ? labelComercial : labelPre}
      </a>
    </div>
  );
}

/* Cabecera ÚNICA de la landing: fija arriba y siempre visible. Es el único <header> del DOM
   (antes había otro dentro del hero, con el mismo contenido, fuera de pantalla). */
export function StickyMiniHeader({
  appName,
  loginHref,
  loginLabel = 'Entrar',
}: {
  appName: string;
  loginHref?: string;
  loginLabel?: string;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[color-mix(in_oklab,var(--text-tertiary)_18%,transparent)] bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1140px] items-center justify-between px-5">
        <a href="/" className="flex min-h-11 items-center gap-2 text-[16px] font-semibold text-[var(--text-primary)]">
          <BrandMark size={20} />
          {appName}
        </a>
        {loginHref && (
          <a href={loginHref} className="flex min-h-11 items-center px-2 text-[16px] font-medium text-[var(--text-tertiary)]">
            {loginLabel}
          </a>
        )}
      </div>
    </header>
  );
}
