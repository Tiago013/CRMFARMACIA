import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/sentry';

export function register() {
  // Mismo init para el runtime de Node y el de Edge (proxy.ts)
  Sentry.init(sentryOptions);
}

// Reporta los errores de Server Components, Route Handlers y el proxy
export const onRequestError = Sentry.captureRequestError;
