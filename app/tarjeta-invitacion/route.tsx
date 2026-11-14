import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { MARCA } from '@/lib/marca';

// Tarjeta 4:5 (1080 × 1350) para compartir la invitación al círculo.
// No recibe parámetros ni lee datos: solo lleva la marca y un mensaje genérico. Así la URL no lleva nada personal.
// Tipografía: Baloo 2, instancias estáticas Bold 700 y ExtraBold 800 (licencia SIL OFL: fuentes/OFL-Baloo2.txt).
export const dynamic = 'force-static';

async function leerFuente(archivo: string): Promise<ArrayBuffer> {
  const bytes = await readFile(join(process.cwd(), 'app', 'tarjeta-invitacion', 'fuentes', archivo));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function GET() {
  const [bold, extraBold] = await Promise.all([leerFuente('Baloo2-Bold.ttf'), leerFuente('Baloo2-ExtraBold.ttf')]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 96,
          background: 'linear-gradient(160deg, #0e1b33 0%, #12306b 52%, #1f5bd6 100%)',
          color: '#f3f7fd',
          fontFamily: 'Baloo 2',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 52, fontWeight: 800 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 28,
              background: '#f3f7fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#1f5bd6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          {MARCA.nombre}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          <div style={{ display: 'flex', fontSize: 42, fontWeight: 700, color: '#b9cff5' }}>Invitación al círculo de cuidado</div>
          <div style={{ display: 'flex', fontSize: 116, fontWeight: 800, lineHeight: 1, letterSpacing: -2 }}>
            Te invito a cuidar entre todos
          </div>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, lineHeight: 1.25, color: '#b9cff5' }}>
            Cada dosis con nombre y hora. Cada cita, con responsable.
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: '#b9cff5' }}>
          Medicinas · Citas · Bitácora · Resumen para el médico
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: 'Baloo 2', data: bold, weight: 700, style: 'normal' },
        { name: 'Baloo 2', data: extraBold, weight: 800, style: 'normal' },
      ],
    }
  );
}
