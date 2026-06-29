// Next.js instrumentation hook — runs once at server startup.
//
// In production, switch the active ObservabilitySink from the console sink
// (which only emits JSON to stdout) to the API sink (which POSTs latency
// events to /api/observability/events for persistence + SLI aggregation).
// In mock mode / tests we stay on the console sink so unit tests don't
// accidentally write to the database.
//
// See issue #36 + ADR-0002 §"Latency budget" for the SLI dashboard surface.

export async function register(): Promise<void> {
  // Next.js calls `register` in the "nodejs" runtime only when explicitly
  // enabled via `experimental.instrumentation` in next.config.mjs. We
  // also gate on runtime so we don't try to load server-only modules
  // during the edge runtime build phase.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Don't wire the DB sink during test runs — unit tests should stay on
  // the console sink (and tests that want to assert on emitted events use
  // `setObservabilitySink` to swap to a stub).
  if (process.env.NODE_ENV === "test") return;

  // Mock mode also stays on console; the SLI dashboard will be empty in
  // mock mode by design (no real latency events are flowing).
  if (process.env.NEXT_PUBLIC_MOCK === "1") return;

  const { createApiObservabilitySink, setObservabilitySink } = await import(
    "@/lib/observability/sink"
  );
  setObservabilitySink(
    createApiObservabilitySink({
      endpoint: "/api/observability/events",
      batchSize: 50,
      flushIntervalMs: 2_000,
    }),
  );
}