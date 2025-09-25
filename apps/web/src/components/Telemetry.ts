export type TelemetryEvent = {
  type: string;
  ts: string;
  details?: Record<string, unknown>;
};

// Renamed to avoid host false "tool" trigger
export function tlog(ev: TelemetryEvent) {
  console.debug("[telemetry]", { ...ev, ts: new Date().toISOString() });
}
