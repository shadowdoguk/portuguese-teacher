import { getObservabilitySink, type DegradationStatus } from "./sink";

export type ServiceId = "asr" | "llm" | "tts";

export type ServiceStatus = {
  status: DegradationStatus | "ok";
  lastChangedAt: number;
  detail: string | null;
};

export type HealthSnapshot = {
  status: "ok" | "degraded" | "down";
  services: Record<ServiceId, ServiceStatus>;
  takenAt: number;
};

const HISTORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

type State = {
  status: Map<ServiceId, ServiceStatus>;
  history: Map<ServiceId, Array<{ at: number; status: DegradationStatus | "ok" }>>;
};

function createState(): State {
  const now = Date.now();
  const status = new Map<ServiceId, ServiceStatus>();
  const history = new Map<ServiceId, Array<{ at: number; status: DegradationStatus | "ok" }>>();
  for (const service of ["asr", "llm", "tts"] as const) {
    status.set(service, { status: "ok", lastChangedAt: now, detail: null });
    history.set(service, [{ at: now, status: "ok" }]);
  }
  return { status, history };
}

let state: State | null = null;
function ensure(): State {
  if (!state) state = createState();
  return state;
}

export function recordServiceStatus(
  service: ServiceId,
  status: DegradationStatus | "ok",
  detail: string | null = null,
): void {
  const s = ensure();
  const prev = s.status.get(service);
  const now = Date.now();
  if (prev && prev.status === status) {
    if (detail && detail !== prev.detail) {
      s.status.set(service, { status, lastChangedAt: now, detail });
    }
    return;
  }
  s.status.set(service, { status, lastChangedAt: now, detail });
  const entries = s.history.get(service) ?? [];
  entries.push({ at: now, status });
  const cutoff = now - HISTORY_RETENTION_MS;
  while (entries.length > 0 && entries[0] && entries[0].at < cutoff) {
    entries.shift();
  }
  s.history.set(service, entries);
}

export function getHealthSnapshot(): HealthSnapshot {
  const s = ensure();
  const services: Record<ServiceId, ServiceStatus> = {
    asr: s.status.get("asr") ?? { status: "ok", lastChangedAt: Date.now(), detail: null },
    llm: s.status.get("llm") ?? { status: "ok", lastChangedAt: Date.now(), detail: null },
    tts: s.status.get("tts") ?? { status: "ok", lastChangedAt: Date.now(), detail: null },
  };
  let worst: "ok" | "degraded" | "down" = "ok";
  for (const service of ["asr", "llm", "tts"] as const) {
    const status = services[service].status;
    if (status === "down") worst = "down";
    else if (status === "degraded" && worst !== "down") worst = "degraded";
  }
  return { status: worst, services, takenAt: Date.now() };
}

export type ServiceAvailability = {
  service: ServiceId;
  upPercent: number;
  sampleCount: number;
  fromMs: number;
  toMs: number;
};

export function getServiceAvailability(
  service: ServiceId,
  windowMs: number = HISTORY_RETENTION_MS,
  now: number = Date.now(),
): ServiceAvailability {
  const s = ensure();
  const entries = s.history.get(service) ?? [];
  const fromMs = now - windowMs;
  const inWindow = entries.filter((entry) => entry.at >= fromMs && entry.at <= now);
  const okCount = inWindow.filter((entry) => entry.status === "ok").length;
  const upPercent = inWindow.length === 0 ? 100 : Math.round((okCount / inWindow.length) * 1000) / 10;
  return { service, upPercent, sampleCount: inWindow.length, fromMs, toMs: now };
}

export function recordProbeHit(service: ServiceId, ok: boolean, region: string, now: number = Date.now()): void {
  recordServiceStatus(service, ok ? "ok" : "down", `probe:${region}`);
  getObservabilitySink().emit({
    kind: "degradation",
    occurredAt: now,
    service,
    status: ok ? "recovered" : "down",
    detail: `synthetic probe region=${region}`,
  });
}

export function resetHealthStateForTests(): void {
  state = createState();
}