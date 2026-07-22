"use client";

import { useCallback, useEffect, useState } from "react";
import {
  emptySnapshot,
  recordCompletion,
  type ScenarioStoreSnapshot,
  type ScenarioProgress,
} from "@/lib/scenarios/store";
import { ScenarioLibrary } from "@/components/practice/ScenarioLibrary";
import { ScenarioPlayer } from "@/components/practice/ScenarioPlayer";
import type { Scenario } from "@/lib/scenarios";
import { useLearnerId } from "@/lib/auth/useLearnerId";

export function ScenarioWorkspace() {
  const [snapshot, setSnapshot] = useState<ScenarioStoreSnapshot>(emptySnapshot);
  const [active, setActive] = useState<Scenario | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const learnerId = useLearnerId();

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const id = learnerId;
      if (!id) {
        setHydrated(true);
        return;
      }
      try {
        const res = await fetch(
          `/api/scenarios?learnerId=${encodeURIComponent(id)}`,
        );
        if (!res.ok) {
          throw new Error(`Failed to load scenario progress (${res.status})`);
        }
        const body = (await res.json()) as {
          ok: boolean;
          snapshot: ScenarioStoreSnapshot;
        };
        if (!body.ok) {
          throw new Error("Scenario snapshot response was not ok");
        }
        if (cancelled) return;
        setSnapshot(body.snapshot);
        setHydrated(true);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setSnapshot(emptySnapshot());
        setHydrated(true);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [learnerId]);

  const onComplete = useCallback(
    async (result: {
      stars: 0 | 1 | 2 | 3;
      passed: boolean;
      turnsTaken: number;
      reasons: ReadonlyArray<string>;
    }) => {
      if (!active || !learnerId) return;
      const completedAt = Date.now();
      const optimistic = recordCompletion(snapshot, {
        scenarioId: active.id,
        stars: result.stars,
        passed: result.passed,
        turnsTaken: result.turnsTaken,
        completedAt,
      });
      setSnapshot(optimistic);
      try {
        const res = await fetch(
          `/api/scenarios/${encodeURIComponent(active.id)}/complete`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              learnerId,
              passed: result.passed,
              stars: result.stars,
              turnsTaken: result.turnsTaken,
              completedAt,
            }),
          },
        );
        if (!res.ok) {
          const message = await readError(res);
          throw new Error(message);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      }
    },
    [active, snapshot, learnerId],
  );

  if (active) {
    return (
      <ScenarioPlayer
        scenario={active}
        onExit={() => setActive(null)}
        onComplete={onComplete}
      />
    );
  }

  const progress = snapshot.byId as Record<string, ScenarioProgress>;
  return (
    <div className="space-y-6">
      <ScenarioLibrary progress={progress} onSelect={setActive} />
      {error ? (
        <p className="text-xs text-terracotta-deep" data-testid="scenario-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}
