"use client";

import { useCallback, useEffect, useState } from "react";
import {
  emptySnapshot,
  loadSnapshot,
  recordCompletion,
  saveSnapshot,
  type ScenarioStoreSnapshot,
  type ScenarioProgress,
} from "@/lib/scenarios/store";
import { ScenarioLibrary } from "@/components/practice/ScenarioLibrary";
import { ScenarioPlayer } from "@/components/practice/ScenarioPlayer";
import type { Scenario } from "@/lib/scenarios";

export function ScenarioWorkspace() {
  const [snapshot, setSnapshot] = useState<ScenarioStoreSnapshot>(emptySnapshot);
  const [active, setActive] = useState<Scenario | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSnapshot(loadSnapshot(window.localStorage));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    saveSnapshot(window.localStorage, snapshot);
  }, [snapshot, hydrated]);

  const onComplete = useCallback(
    (result: {
      stars: 0 | 1 | 2 | 3;
      passed: boolean;
      turnsTaken: number;
      reasons: ReadonlyArray<string>;
    }) => {
      if (!active) return;
      setSnapshot((prev) =>
        recordCompletion(prev, {
          scenarioId: active.id,
          stars: result.stars,
          passed: result.passed,
          turnsTaken: result.turnsTaken,
          completedAt: Date.now(),
        }),
      );
    },
    [active],
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
  return <ScenarioLibrary progress={progress} onSelect={setActive} />;
}
