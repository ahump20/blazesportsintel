import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Environment
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

  // Performance monitoring
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],

  // Filter sensitive data
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }

    if (event.request?.cookies) {
      event.request.cookies = {};
    }

    return event;
  },

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
});
