'use client';

// Utilidades de cliente compartidas por la app y el recorrido de bienvenida.
// Los primitivos sin estado (marca, chips, botón…) viven en ./primitives (se renderizan en el servidor).

import { useSyncExternalStore } from 'react';
import NextLink from 'next/link';
import { motion } from 'motion/react';

export * from './primitives';

/* MotionLink — next/link con gestos de motion (whileTap), usado por la app interna. */
export const MotionLink = motion.create(NextLink);

/* ── useReducedMotionSafe — SSR-safe: arranca en `false` en servidor y en el primer paint del
   cliente (igual que el server) y solo se actualiza a la preferencia real DESPUÉS de montar:
   cero hydration mismatch. ── */
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';
function subscribeReduce(onChange: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
export function useReducedMotionSafe(): boolean {
  return useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE_QUERY).matches, () => false);
}
