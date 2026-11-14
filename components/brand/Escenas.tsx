// ESCENAS DEL CÍRCULO — ilustraciones propias para los vacíos de Hoy, Citas y Bitácora.
// Una sola grilla para las tres: viewBox 240×160, centro en x=120, disco de luz de radio 70 y un objeto
// principal en color de acento. Solo colores de la paleta, como variables CSS (se adaptan al tema).
// Son decorativas: el título y el texto del vacío dicen todo, así que se ocultan a lectores de pantalla.

import type { CSSProperties } from 'react';

const DISCO: CSSProperties = { fill: 'var(--surface-2)' };
const BLANCO: CSSProperties = { fill: 'var(--surface)' };
const LINEA_LUZ: CSSProperties = { fill: 'none', stroke: 'var(--accent-glow)', strokeWidth: 1.2, strokeLinecap: 'round' };
const SOMBRA: CSSProperties = { fill: 'var(--accent-strong)', opacity: 0.1 };
const CHISPA: CSSProperties = { fill: 'var(--sun)' };
const LETRA: CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 700, textAnchor: 'middle' };

/* ── Hoy sin medicinas: una pastilla dentro del círculo de los cuatro hermanos (la paciente no entra en el círculo) ── */
const NODOS_CIRCULO = [
  { x: 120, y: 26, letra: 'C', color: 'var(--accent)' },
  { x: 178, y: 82, letra: 'M', color: 'var(--accent-2)' },
  { x: 120, y: 138, letra: 'A', color: 'var(--ok)' },
  { x: 62, y: 82, letra: 'L', color: 'var(--warn)' },
];

export function EscenaPastilla() {
  return (
    <svg viewBox="0 0 240 160" aria-hidden="true" focusable="false" className="mx-auto block h-auto w-full max-w-64">
      <defs>
        <linearGradient id="esc-pastilla-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--accent-strong)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
        </linearGradient>
      </defs>
      <circle cx="120" cy="82" r="70" style={DISCO} />
      <circle cx="120" cy="82" r="56" style={LINEA_LUZ} strokeDasharray="2 6" />
      <ellipse cx="124" cy="106" rx="26" ry="4" style={SOMBRA} />
      <g transform="translate(120 82) scale(1.14) translate(-120 -82)">
        <g transform="rotate(-35 120 82)">
          <path d="M120 71 H107 A11 11 0 0 0 107 93 H120 Z" style={{ fill: 'url(#esc-pastilla-g)' }} />
          <path d="M120 71 H133 A11 11 0 0 1 133 93 H120 Z" style={BLANCO} />
          <rect x="96" y="71" width="48" height="22" rx="11" style={{ fill: 'none', stroke: 'var(--accent-strong)', strokeWidth: 1.5 }} />
          <path d="M104 77 H116" style={{ stroke: 'var(--surface)', strokeWidth: 2, strokeLinecap: 'round', opacity: 0.55 }} />
        </g>
      </g>
      {NODOS_CIRCULO.map((n) => (
        <g key={n.letra}>
          <circle cx={n.x} cy={n.y} r="11" style={{ fill: 'var(--surface)', stroke: n.color, strokeWidth: 1.6 }} />
          <text x={n.x} y={n.y + 3.6} fontSize="10" style={{ ...LETRA, fill: 'var(--accent-strong)' }}>
            {n.letra}
          </text>
        </g>
      ))}
      <circle cx="56" cy="118" r="2.5" style={{ fill: 'var(--accent-glow)' }} />
      <path
        d="M200 32 L201.7 37.3 L207 39 L201.7 40.7 L200 46 L198.3 40.7 L193 39 L198.3 37.3 Z"
        style={CHISPA}
      />
    </svg>
  );
}

/* ── Citas vacías: un calendario con un hermano que acompaña ── */
export function EscenaCalendario() {
  const columnas = [83, 103, 123, 143];
  const filas = [74, 90, 106];
  return (
    <svg viewBox="0 0 240 160" aria-hidden="true" focusable="false" className="mx-auto block h-auto w-full max-w-64">
      <defs>
        <linearGradient id="esc-cal-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--accent-strong)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
        </linearGradient>
      </defs>
      <circle cx="120" cy="82" r="70" style={DISCO} />
      <ellipse cx="120" cy="146" rx="76" ry="4" style={SOMBRA} />
      <rect x="64" y="42" width="112" height="88" rx="14" style={SOMBRA} />
      <rect x="62" y="38" width="112" height="88" rx="14" style={{ ...BLANCO, stroke: 'var(--accent)', strokeWidth: 1.5 }} />
      <path d="M62 52 Q62 38 76 38 H160 Q174 38 174 52 V60 H62 Z" style={{ fill: 'url(#esc-cal-g)' }} />
      <rect x="91" y="30" width="6" height="16" rx="3" style={{ fill: 'var(--accent-strong)', stroke: 'var(--surface)', strokeWidth: 1.5 }} />
      <rect x="143" y="30" width="6" height="16" rx="3" style={{ fill: 'var(--accent-strong)', stroke: 'var(--surface)', strokeWidth: 1.5 }} />
      {filas.map((y) =>
        columnas.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="14" height="10" rx="3" style={{ fill: 'var(--surface-2)' }} />)
      )}
      <rect x="121" y="88" width="18" height="14" rx="4" style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 1.2, strokeDasharray: '3 2.5' }} />
      <path d="M130 92.5 V97.5 M127.5 95 H132.5" style={{ stroke: 'var(--accent)', strokeWidth: 1.6, strokeLinecap: 'round' }} />
      <ellipse cx="188" cy="147" rx="26" ry="3.5" style={SOMBRA} />
      <path d="M168 146 C168 124 208 124 208 146 Z" style={{ fill: 'var(--accent-2)', stroke: 'var(--surface)', strokeWidth: 2.5, strokeLinejoin: 'round' }} />
      <circle cx="188" cy="116.5" r="10.5" style={{ fill: 'var(--accent-2)', stroke: 'var(--surface)', strokeWidth: 2.5 }} />
      <path
        d="M50 56 L51.3 59.7 L55 61 L51.3 62.3 L50 66 L48.7 62.3 L45 61 L48.7 59.7 Z"
        style={CHISPA}
      />
    </svg>
  );
}

/* ── Bitácora vacía: una hoja con una firma y la inicial de quien escribe ── */
export function EscenaNota() {
  return (
    <svg viewBox="0 0 240 160" aria-hidden="true" focusable="false" className="mx-auto block h-auto w-full max-w-64">
      <defs>
        <linearGradient id="esc-nota-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--accent-strong)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
        </linearGradient>
      </defs>
      <circle cx="120" cy="82" r="70" style={DISCO} />
      <ellipse cx="118" cy="146" rx="58" ry="4" style={SOMBRA} />
      <path
        d="M84 30 H146 L170 54 V128 Q170 140 158 140 H84 Q72 140 72 128 V42 Q72 30 84 30 Z"
        style={{ ...BLANCO, stroke: 'var(--accent)', strokeWidth: 1.5, strokeLinejoin: 'round' }}
      />
      <path d="M146 30 L170 54 H154 Q146 54 146 46 Z" style={{ fill: 'var(--surface-2)', stroke: 'var(--accent)', strokeWidth: 1.5, strokeLinejoin: 'round' }} />
      <path
        d="M88 66 H138 M88 80 H158 M88 94 H124"
        style={{ stroke: 'var(--surface-2)', strokeWidth: 6, strokeLinecap: 'round' }}
      />
      <path
        d="M88 120 C96 106 104 106 108 120 S120 134 126 120 S138 106 144 120 S152 128 158 118"
        style={{ fill: 'none', stroke: 'var(--accent-strong)', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}
      />
      <circle cx="168" cy="36" r="14" style={{ fill: 'var(--accent-2)', stroke: 'var(--surface)', strokeWidth: 2.5 }} />
      <text x="168" y="41" fontSize="14" style={{ ...LETRA, fill: 'var(--surface)' }}>
        C
      </text>
      <g transform="translate(161 119) rotate(40)">
        <rect x="-5.5" y="-58" width="11" height="50" rx="5.5" style={{ fill: 'var(--sun)' }} />
        <rect x="-5.5" y="-50" width="11" height="6" style={{ fill: 'var(--accent-strong)' }} />
        <path d="M-5.5 -8 L0 0 L5.5 -8 Z" style={{ fill: 'var(--accent-strong)' }} />
      </g>
    </svg>
  );
}
