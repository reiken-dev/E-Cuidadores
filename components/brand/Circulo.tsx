// EL CÍRCULO — dispositivo de identidad de E-Cuidadores.
// Cinco personas alrededor de un centro compartido: la idea de "Círculo de Cuidado" hecha forma.
// Componente de SERVIDOR (SVG puro, sin hooks): se usa en la landing, el recorrido, los vacíos y las
// pantallas de estado. La órbita punteada es estática: ningún elemento decorativo gira en bucle.

import type { ReactNode } from 'react';

// La letra va en blanco sobre los tonos oscuros y en azul marino sobre el verde y el ámbar (4,5:1 o más).
const NODOS = [
  { a: -90, letra: 'C', color: 'var(--accent)', letraColor: '#fff' },
  { a: -18, letra: 'M', color: 'var(--accent-2)', letraColor: '#fff' },
  { a: 54, letra: 'A', color: 'var(--ok)', letraColor: 'var(--text-primary)' },
  { a: 126, letra: 'L', color: 'var(--warn)', letraColor: 'var(--text-primary)' },
  { a: 198, letra: 'R', color: 'var(--accent-strong)', letraColor: '#fff' },
];

function punto(grados: number, radio: number): [number, number] {
  const r = (grados * Math.PI) / 180;
  return [100 + radio * Math.cos(r), 100 + radio * Math.sin(r)];
}

export function Circulo({
  size = 200,
  className = '',
  /** Contenido del centro (HTML): un ícono, una inicial… Si no hay, se dibuja el sello de confirmación. */
  centro,
  /** Sin personas alrededor: solo órbita y halo (fondos y cargas). */
  simple = false,
  etiqueta,
}: {
  size?: number;
  className?: string;
  centro?: ReactNode;
  simple?: boolean;
  etiqueta?: string;
}) {
  const nodos = NODOS.map((n) => ({ ...n, p: punto(n.a, 70) }));
  const id = `c${size}${simple ? 's' : 'f'}`;
  // Letras: al menos 12 px en pantalla y en el atributo. El viewBox es 200 y el svg se escala a `size`.
  const letraTam = Math.max(12, (12 * 200) / size);
  return (
    <div
      className={`${className.includes('absolute') ? '' : 'relative'} shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role={etiqueta ? 'img' : undefined}
      aria-label={etiqueta}
      aria-hidden={etiqueta ? undefined : true}
    >
      <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true" className="absolute inset-0 overflow-visible">
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--navy-2)' }} />
            <stop offset="0.6" style={{ stopColor: 'var(--accent)' }} />
            <stop offset="1" style={{ stopColor: 'var(--grad-fin)' }} />
          </linearGradient>
          <radialGradient id={`${id}-h`}>
            <stop offset="0" style={{ stopColor: 'var(--accent-warm)' }} stopOpacity="0.55" />
            <stop offset="1" style={{ stopColor: 'var(--accent-warm)' }} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="98" fill={`url(#${id}-h)`} />
        <circle cx="100" cy="100" r="48" fill="none" style={{ stroke: 'var(--accent)' }} strokeOpacity="0.22" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="70" fill="none" stroke={`url(#${id}-g)`} strokeWidth="2" strokeDasharray="1.5 7" strokeLinecap="round" />
        {!simple && (
          <>
            <polygon
              points={nodos.map((n) => n.p.join(',')).join(' ')}
              fill="none"
              style={{ stroke: 'var(--accent)' }}
              strokeOpacity="0.2"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {nodos.map((n) => (
              <g key={n.letra}>
                <circle cx={n.p[0]} cy={n.p[1]} r="14.5" fill="#fff" />
                <circle cx={n.p[0]} cy={n.p[1]} r="12" fill={n.color} />
                <text x={n.p[0]} y={n.p[1] + letraTam * 0.36} textAnchor="middle" fontSize={letraTam} fontWeight="700" style={{ fill: n.letraColor }} fontFamily="var(--font-display), sans-serif">
                  {n.letra}
                </text>
              </g>
            ))}
          </>
        )}
        {!centro && !simple && (
          <g>
            <circle cx="100" cy="100" r="27" fill={`url(#${id}-g)`} />
            <circle cx="100" cy="100" r="31" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="2" />
            <path d="M88 101l8 8 16-17" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </svg>
      {centro && <div className="absolute inset-0 flex items-center justify-center">{centro}</div>}
    </div>
  );
}
