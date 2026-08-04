"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import {
  LearnerStateProvider,
  useLearnerState,
} from "@/lib/learner/LearnerStateProvider";
import {
  DEFAULT_WINDOW_DAYS,
  type AffectiveFilterScore,
  type AffectiveFilterSignal,
  type SignalKind,
  type SignalSource,
} from "./types";
import type { RecordSignalInput } from "./store";

/**
 * Backwards-compat: `AffectiveProvider` is now an alias for the unified
 * `LearnerStateProvider` (issue #105 PR 2 — Provider consolidation). The
 * Affective signals stream is owned by LearnerStateProvider, hydrated
 * alongside Settings when the authenticated Learner changes.
 *
 * `AffectiveContext` is kept as a legacy context for back-compat exports.
 * All consumers should use `useAffective()` (a thin wrapper around
 * `useLearnerState()`).
 */

export type AffectiveContextValue = {
  isReady: boolean;
  learnerId: string | null;
  record: (input: Omit<RecordSignalInput, "learnerId" | "confidenceCheckinEnabled">) => void;
  computeScore: (windowDays?: number) => AffectiveFilterScore | null;
};

export const AffectiveContext = createContext<AffectiveContextValue | null>(null);

export function AffectiveProvider({
  children,
  initialSignals,
  initialLearnerId,
}: {
  children: ReactNode;
  initialSignals?: AffectiveFilterSignal[];
  initialLearnerId?: string | null;
}) {
  return (
    <LearnerStateProvider
      initialSignals={initialSignals}
      initialLearnerId={initialLearnerId}
    >
      {children}
    </LearnerStateProvider>
  );
}

export function useAffective(): AffectiveContextValue {
  const s = useLearnerState();
  return {
    isReady: s.isHydrated,
    learnerId: s.learnerId,
    record: s.recordAffectiveSignal,
    computeScore: s.computeAffectiveScore,
  };
}

export function useClientSignal(kind: SignalKind) {
  const { record } = useAffective();
  return (value?: number) => {
    const input: Omit<RecordSignalInput, "learnerId" | "confidenceCheckinEnabled"> = {
      kind,
      source: "client" as SignalSource,
    };
    if (value !== undefined) input.value = value;
    record(input);
  };
}

export function useScoreSnapshot(windowDays?: number): AffectiveFilterScore | null {
  const { computeScore, isReady } = useAffective();
  const [snapshot, setSnapshot] = useState<AffectiveFilterScore | null>(null);
  useEffect(() => {
    if (!isReady) {
      setSnapshot(null);
      return;
    }
    setSnapshot(computeScore(windowDays));
  }, [isReady, computeScore, windowDays]);
  return snapshot;
}

export function useDocumentVisibilityTracker() {
  const { record } = useAffective();
  useEffect(() => {
    if (typeof document === "undefined") return;
    let blurAt: number | null = null;
    const handleBlur = () => {
      blurAt = Date.now();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        blurAt = Date.now();
      } else if (document.visibilityState === "visible" && blurAt !== null) {
        const elapsed = Date.now() - blurAt;
        record({ kind: "tab-blur", source: "client", value: elapsed });
        blurAt = null;
      }
    };
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [record]);
}
