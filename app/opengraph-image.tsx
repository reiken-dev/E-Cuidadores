import { ImageResponse } from 'next/og';
import { MARCA } from '@/lib/marca';

// Imagen al compartir el enlace (WhatsApp, redes): la gran idea con la identidad azul.
export const alt = `${MARCA.nombre}: que nadie más pregunte «¿ya le diste la pastilla?»`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(135deg, #0e1b33 0%, #12306b 55%, #1f5bd6 100%)',
          color: '#f3f7fd',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 34, fontWeight: 700 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: '#f3f7fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1f5bd6',
              fontSize: 40,
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1f5bd6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          {MARCA.nombre}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Que nadie más pregunte «¿ya le diste la pastilla?»
          </div>
          <div style={{ fontSize: 34, color: '#b9cff5' }}>Cada dosis con nombre y hora. Cada cita, con responsable.</div>
        </div>
      </div>
    ),
    size
  );
}
