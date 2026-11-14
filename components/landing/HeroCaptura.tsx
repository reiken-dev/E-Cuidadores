// LANDING — HERO CON CAPTURA REAL (firma de E-Cuidadores)
// Un anillo de cuidado rodea el dispositivo: tres avatares en órbita y la píldora «Te toca a ti».
// La captura es la pantalla Hoy del build de producción con datos de demostración (sin personas reales).
// Se corta a la mitad (58 % del alto) y la base se funde con el fondo de la sección.
// Solo el dispositivo flota (7 s, 8 px); con «reducir movimiento» no se mueve nada (ver globals.css).
// Componente de SERVIDOR: sin hooks, sin JavaScript en el cliente.

const CAPTURA = {
  src: '/hero/entre-hermanos-hoy.webp',
  ancho: 780, // 390 px CSS a 2×
  alto: 980, // 58 % de una pantalla de 844 px, a 2×
};

// Tres avatares en el anillo (grados: 0 = derecha, sentido horario). Iniciales de la familia de los datos de demostración.
const AVATARES = [
  { letra: 'M', angulo: -150, fondo: 'var(--accent-2)', texto: 'var(--surface)' },
  { letra: 'A', angulo: -30, fondo: 'var(--ok)', texto: 'var(--text-primary)' },
  { letra: 'L', angulo: 30, fondo: 'var(--sun)', texto: 'var(--text-primary)' },
];

const MASCARA = 'linear-gradient(to bottom, #000 62%, transparent)';

export function HeroCaptura({ nombreApp }: { nombreApp: string }) {
  return (
    // Caja del anillo: el padding de 18 px es la órbita alrededor del dispositivo. Ancho fijo = sin saltos (CLS 0).
    <figure className="relative mx-auto mb-6 w-[280px] p-[18px] sm:w-[300px]">
      {/* Anillo de cuidado: órbita punteada de forma ovalada (adorno) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[50%] border-2 border-dotted border-[color-mix(in_oklab,var(--accent)_40%,transparent)]"
      />

      {/* Dispositivo: la captura cortada a la mitad, con máscara de degradado y velo del fondo en la base */}
      <div
        className="captura-flota relative mx-auto w-[244px] overflow-hidden rounded-[34px] border-[6px] border-[color-mix(in_oklab,var(--text-primary)_90%,var(--accent))] bg-[var(--surface)] shadow-[var(--shadow-2)] sm:w-[264px]"
        style={{ WebkitMaskImage: MASCARA, maskImage: MASCARA }}
      >
        {/* Imagen estática ya optimizada (WebP de 780 px, ~43 KB): va directa, sin el optimizador de imágenes
            (no suma transformaciones de pago). fetchPriority alto: es el LCP del héroe. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- ver el comentario de arriba: asset estático optimizado */}
        <img
          src={CAPTURA.src}
          alt={`Pantalla principal de la app ${nombreApp}`}
          width={CAPTURA.ancho}
          height={CAPTURA.alto}
          fetchPriority="high"
          decoding="async"
          className="block h-auto w-full"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%]"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--bg))' }}
        />
      </div>

      {/* Avatares en órbita: encima del dispositivo para que el borde no los tape */}
      {AVATARES.map((a) => {
        const rad = (a.angulo * Math.PI) / 180;
        return (
          <span
            key={a.letra}
            aria-hidden="true"
            className="absolute flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[16px] leading-none font-bold shadow-[var(--shadow-1)] ring-[3px] ring-[var(--bg)] [font-family:var(--font-display)]"
            style={{
              left: `${(50 + 50 * Math.cos(rad)).toFixed(2)}%`,
              top: `${(50 + 50 * Math.sin(rad)).toFixed(2)}%`,
              background: a.fondo,
              color: a.texto,
            }}
          >
            {a.letra}
          </span>
        );
      })}

      {/* Píldora «Te toca a ti»: centrada sobre el borde inferior del anillo */}
      <p
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 inline-flex -translate-x-1/2 translate-y-1/2 items-center rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-[16px] leading-tight font-semibold whitespace-nowrap text-[var(--bg)] shadow-[var(--shadow-2)]"
      >
        Te toca a ti
      </p>
    </figure>
  );
}
