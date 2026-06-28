"use client";

import { useEffect, useState } from "react";
import type { HealthSnapshot } from "@/lib/observability/health";

const POLL_INTERVAL_MS = 30_000;

type LoadState =
  | { status: "loading" }
  | { status: "ok" }
  | { status: "degraded" | "down"; snapshot: HealthSnapshot };

function describeSnapshot(snapshot: HealthSnapshot): string {
  const affected = (Object.entries(snapshot.services) as Array<[
    string,
    { status: string; detail: string | null },
  ]>)
    .filter(([, info]) => info.status !== "ok")
    .map(([name, info]) => {
      const detail = info.detail ? ` (${info.detail})` : "";
      return `${name.toUpperCase()} ${info.status}${detail}`;
    });
  if (affected.length === 0) return "";
  return affected.join(" · ");
}

export function DegradationBanner() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll(): Promise<void> {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Health endpoint returned ${res.status}`);
        }
        const snapshot = (await res.json()) as HealthSnapshot;
        if (cancelled) return;
        if (snapshot.status === "ok") {
          setState({ status: "ok" });
        } else {
          setState({ status: snapshot.status, snapshot });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "ok" });
        }
      } finally {
        if (!cancelled) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  if (state.status !== "degraded" && state.status !== "down") return null;

  const isDown = state.status === "down";
  const detail = describeSnapshot(state.snapshot);

  return (
    <div
      role={isDown ? "alert" : "status"}
      aria-live={isDown ? "assertive" : "polite"}
      data-testid="degradation-banner"
      data-status={state.status}
      className={
        isDown
          ? "border-b border-terracotta-deep bg-terracotta-deep/10 px-4 py-2 text-sm text-terracotta-deep"
          : "border-b border-amber-700/40 bg-amber-100/60 px-4 py-2 text-sm text-amber-900"
      }
    >
      <span className="font-medium">
        {isDown ? "Some teacher services are offline." : "Some teacher services are slower than usual."}
      </span>{" "}
      <span className="text-ink-soft">
        {detail || "Voice loop is using fallback paths; your session will continue."}
      </span>
    </div>
  );
}