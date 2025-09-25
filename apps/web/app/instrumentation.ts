declare global {
  interface Window {
    __OTLP_URL?: string;
  }
}

export async function register() {
  if (typeof window === 'undefined') return;
  const { WebTracerProvider, SimpleSpanProcessor } = await import('@opentelemetry/sdk-trace-web');
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
  const provider = new WebTracerProvider();
  const exporter = new OTLPTraceExporter({ url: window.__OTLP_URL || '/otel' });
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  provider.register();
}
