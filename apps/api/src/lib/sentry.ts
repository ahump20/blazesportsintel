import * as Sentry from '@sentry/node';

/**
 * Initialize Sentry for API error tracking
 */
export function initSentry(): void {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],

    beforeSend(event) {
      // Remove sensitive data
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },

    enabled: process.env.NODE_ENV === 'production',
  });
}

/**
 * Capture exception with Sentry
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message with Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser(user);
}

/**
 * Clear user context
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

export default Sentry;
