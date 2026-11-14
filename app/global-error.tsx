'use client';

// Último recurso: si falla el propio layout, Next muestra este archivo. Debe traer <html> y <body>.
// Estilos en línea a propósito: si el CSS de la app no carga, la pantalla sigue siendo legible.
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#f3f7fd',
          color: '#0e1b33',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '24px', margin: '0 0 12px' }}>Algo no salió como esperábamos</h1>
        <p style={{ maxWidth: '360px', margin: '0 0 24px', lineHeight: 1.5 }}>
          Prueba de nuevo y, si sigue igual, recarga la página.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            minHeight: '44px',
            padding: '0 24px',
            borderRadius: '999px',
            border: 'none',
            background: '#1f5bd6',
            color: '#f3f7fd',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Intentar de nuevo
        </button>
      </body>
    </html>
  );
}
