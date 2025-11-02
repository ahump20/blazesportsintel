import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development',

  // Performance monitoring
  tracesSampleRate: 0.1,

  // Session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/blazesportsintel\.com/],
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter sensitive data
  beforeSend(event) {
    // Remove query parameters that might contain sensitive data
    if (event.request?.url) {
      try {
        const url = new URL(event.request.url);
        url.search = '';
        event.request.url = url.toString();
      } catch {}
    }
    return event;
  },

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
});
