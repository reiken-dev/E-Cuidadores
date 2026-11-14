// PACTO — "Lo que E-Cuidadores nunca hará". Funciona
// como prueba de confianza antes del precio (sin testimonios inventados). Una sola tarjeta oscura
// con tres filas separadas por líneas finas: compacta, sin tres bloques idénticos.

import type { Icono as LucideIcon } from './icons';
import { Circulo } from '@/components/brand/Circulo';
import { Kicker, SectionShell } from './primitives';

export interface PromesaPacto {
  icon: LucideIcon;
  titulo: string;
  detalle: string;
}

export function Pacto({
  kicker = 'NUESTRO PACTO',
  titulo,
  promesas,
  id,
}: {
  kicker?: string;
  titulo: string;
  promesas: PromesaPacto[];
  id?: string;
}) {
  return (
    <SectionShell id={id} elevacion="base" compacta ariaLabel="Nuestro pacto">
      <div
        className="mx-auto max-w-[620px]"
      >
        <div data-reveal>
          <Kicker>{kicker}</Kicker>
          <h2 className="text-balance text-[28px] font-bold leading-[1.15] text-[var(--text-primary)] [font-family:var(--font-display)] md:text-[36px]">
            {titulo}
          </h2>
        </div>
        <ul
          data-reveal
          className="grano grano-oscuro relative mt-6 overflow-hidden rounded-[var(--radius-card)] text-[var(--bg)] shadow-[var(--shadow-2)]"
          style={{
            background:
              'radial-gradient(320px 200px at 100% 0%, color-mix(in oklab, var(--accent-warm) 28%, transparent), transparent 70%), linear-gradient(170deg, var(--navy), var(--navy-2))',
          }}
        >
          <Circulo simple size={260} className="pointer-events-none absolute -right-20 -bottom-24 opacity-40" />
          {promesas.map((p, i) => (
            <li
              key={i}
              className="flex items-start gap-4 border-t border-[color-mix(in_oklab,var(--bg)_14%,transparent)] px-5 py-4 first:border-t-0"
            >
              <p.icon size={22} strokeWidth={2} color="var(--accent-warm)" aria-hidden="true" className="mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[16px] font-semibold">{p.titulo}</h3>
                <p className="mt-0.5 text-[16px] leading-snug opacity-80">{p.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}
