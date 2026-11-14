'use client';

// Entrada escalonada de la landing SIN librería de animación: un solo observador marca con
// data-in los elementos [data-reveal] cuando asoman; el movimiento lo hace CSS (globals.css).
// Con "reducir movimiento" el CSS solo hace un fundido corto.

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

export function RevealObserver() {
  useEffect(() => {
    document.documentElement.setAttribute('data-reveal-ready', '');
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-in])'));
    if (typeof IntersectionObserver === 'undefined') {
      els.forEach((e) => e.setAttribute('data-in', ''));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute('data-in', '');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -4% 0px' }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  // Medición del embudo: los botones principales llevan data-cta (sin datos personales).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cta]');
      if (a) track('landing_cta', { destino: a.getAttribute('href') ?? '', donde: a.getAttribute('data-cta') ?? '' });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
