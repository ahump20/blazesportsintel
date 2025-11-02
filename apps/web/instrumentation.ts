/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Sentry for server-side
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

      // Performance monitoring
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
      ],

      // Filter out sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        return event;
      },

      // Don't send errors in development
      enabled: process.env.NODE_ENV === 'production',
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Initialize Sentry for Edge runtime
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || 'edge',
      tracesSampleRate: 0.1,
      enabled: process.env.NODE_ENV === 'production',
    });
  }
}
