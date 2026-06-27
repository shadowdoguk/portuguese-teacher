"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { useSettings } from "@/lib/settings";
import {
  DEFAULT_WINDOW_DAYS,
  type AffectiveFilterScore,
  type SignalKind,
  type SignalSource,
} from "./types";
import { affectiveFilterScore } from "./scoring";
import { recordSignal, type RecordSignalInput } from "./store";

export type AffectiveContextValue = {
  isReady: boolean;
  learnerId: string | null;
  record: (input: Omit<RecordSignalInput, "learnerId" | "confidenceCheckinEnabled">) => void;
  computeScore: (windowDays?: number) => AffectiveFilterScore | null;
};

export const AffectiveContext = createContext<AffectiveContextValue | null>(null);

export function AffectiveProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const learnerId = user?.id ?? null;
  const learnerIdRef = useRef<string | null>(learnerId);
  useEffect(() => {
    learnerIdRef.current = learnerId;
  }, [learnerId]);

  const isReady = learnerId !== null;

  const record = useCallback<AffectiveContextValue["record"]>(
    (input) => {
      const id = learnerIdRef.current;
      if (!id) return;
      recordSignal({
        ...input,
        learnerId: id,
        confidenceCheckinEnabled: settings.confidenceCheckinOptIn,
      });
    },
    [settings.confidenceCheckinOptIn],
  );

  const computeScore = useCallback<AffectiveContextValue["computeScore"]>(
    (windowDays = DEFAULT_WINDOW_DAYS) => {
      const id = learnerIdRef.current;
      if (!id) return null;
      return affectiveFilterScore(id, windowDays);
    },
    [],
  );

  const value = useMemo<AffectiveContextValue>(
    () => ({ isReady, learnerId, record, computeScore }),
    [isReady, learnerId, record, computeScore],
  );

  return <AffectiveContext.Provider value={value}>{children}</AffectiveContext.Provider>;
}

export function useAffective(): AffectiveContextValue {
  const ctx = useContext(AffectiveContext);
  if (!ctx) {
    return {
      isReady: false,
      learnerId: null,
      record: () => undefined,
      computeScore: () => null,
    };
  }
  return ctx;
}

export function useClientSignal(kind: SignalKind) {
  const { record } = useAffective();
  return useCallback(
    (value?: number) => {
      const input: Omit<RecordSignalInput, "learnerId" | "confidenceCheckinEnabled"> = {
        kind,
        source: "client" as SignalSource,
      };
      if (value !== undefined) input.value = value;
      record(input);
    },
    [kind, record],
  );
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

export function useScoreSnapshot(windowDays?: number): AffectiveFilterScore | null {
  const { computeScore, isReady } = useAffective();
  const ref = useRef<AffectiveFilterScore | null>(null);
  useEffect(() => {
    if (!isReady) {
      ref.current = null;
      return;
    }
    ref.current = computeScore(windowDays);
  }, [isReady, computeScore, windowDays]);
  return ref.current;
}
