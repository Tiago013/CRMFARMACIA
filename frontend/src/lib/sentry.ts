// Opciones comunes de Sentry para navegador, servidor y edge.
// Sin NEXT_PUBLIC_SENTRY_DSN (por ejemplo en local) Sentry queda apagado.
import type { ErrorEvent } from '@sentry/nextjs';

export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Nunca enviar IP, cookies ni datos de pacientes
  sendDefaultPii: false,
  beforeSend(event: ErrorEvent) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
      delete event.request.headers;
    }
    delete event.user;
    return event;
  },
};
