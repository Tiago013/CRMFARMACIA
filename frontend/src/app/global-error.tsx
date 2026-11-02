'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// Pantalla de último recurso cuando falla el layout raíz; el error llega a Sentry
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 20 }}>Algo salió mal</h1>
          <p style={{ color: '#666' }}>El error quedó registrado. Intenta de nuevo.</p>
          <button onClick={reset} style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
