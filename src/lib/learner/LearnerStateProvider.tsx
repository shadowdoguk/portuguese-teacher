"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth/useAuth";
import {
  DEFAULT_SETTINGS,
  applySettingsPatch,
  type Settings,
  type SettingsPatch,
} from "@/lib/settings/types";
import {
  loadSettings,
  saveSettings,
} from "@/lib/settings/store";
import {
  loadSignals,
  recordSignal,
  type RecordSignalInput,
} from "@/lib/affective/store";
import {
  DEFAULT_WINDOW_DAYS,
  type AffectiveFilterScore,
  type AffectiveFilterSignal,
} from "@/lib/affective/types";
import { affectiveFilterScore } from "@/lib/affective/scoring";

/**
 * Unified per-Learner state provider.
 *
 * Owns the per-Learner data that lives in localStorage (Settings + Affective
 * signals), keyed on the authenticated Learner ID from AuthProvider.
 *
 * One hydration lifecycle: when the authenticated Learner changes, this
 * provider rehydrates Settings + Affective signals together in one
 * `useEffect`. Closes the "auth switching carries wrong affective baseline"
 * bug (issue #105 sub-slice 1.4) where Settings re-hydrated on user change
 * but Affective did not — switching accounts in the same browser session
 * left the previous Learner's affective signals active.
 *
 * Backwards-compat: `useSettings()` and `useAffective()` (and the
 * `useClientSignal`/`useDocumentVisibilityTracker`/`useScoreSnapshot`
 * hooks) are re-exported from `@/lib/settings` and `@/lib/affective`
 * and read from this context, so existing call sites and tests stay green.
 */

export type LearnerStateContextValue = {
  learnerId: string | null;
  isHydrated: boolean;
  settings: Settings;
  updateSettings: (patch: SettingsPatch) => void;
  resetSettings: () => void;
  affectiveSignals: AffectiveFilterSignal[];
  recordAffectiveSignal: (
    input: Omit<RecordSignalInput, "learnerId" | "confidenceCheckinEnabled">,
  ) => void;
  computeAffectiveScore: (windowDays?: number) => AffectiveFilterScore | null;
};

export const LearnerStateContext = createContext<LearnerStateContextValue | null>(
  null,
);

export function LearnerStateProvider({
  children,
  initialSettings,
  initialSignals,
  initialLearnerId,
}: {
  children: ReactNode;
  initialSettings?: Settings;
  initialSignals?: AffectiveFilterSignal[];
  initialLearnerId?: string | null;
}) {
  const { user } = useAuth();
  const authLearnerId = user?.id ?? null;
  const learnerId = initialLearnerId !== undefined ? initialLearnerId : authLearnerId;

  const [settings, setSettings] = useState<Settings>(
    () => initialSettings ?? { ...DEFAULT_SETTINGS },
  );
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const [signals, setSignals] = useState<AffectiveFilterSignal[]>(
    () => initialSignals ?? [],
  );
  const learnerIdRef = useRef<string | null>(learnerId);

  // Track latest learnerId so async callbacks (e.g. record) read the right value.
  useEffect(() => {
    learnerIdRef.current = learnerId;
  }, [learnerId]);

  // One hydration lifecycle: when learnerId changes, re-load both Settings and
  // Affective signals from localStorage together. This is the bug fix from
  // the issue body: previously Settings re-hydrated but Affective did not.
  useEffect(() => {
    if (!learnerId) {
      setSettings({ ...DEFAULT_SETTINGS });
      setSignals([]);
      setHydratedFor(null);
      return;
    }
    if (hydratedFor === learnerId) return;
    setSettings(loadSettings(learnerId));
    setSignals(loadSignals(learnerId));
    setHydratedFor(learnerId);
  }, [learnerId, hydratedFor]);

  const updateSettings = useCallback<LearnerStateContextValue["updateSettings"]>(
    (patch) => {
      setSettings((current) => {
        const next = applySettingsPatch(current, patch);
        const id = learnerIdRef.current;
        if (id) saveSettings(id, next);
        return next;
      });
    },
    [],
  );

  const resetSettings = useCallback<LearnerStateContextValue["resetSettings"]>(
    () => {
      const defaults: Settings = { ...DEFAULT_SETTINGS };
      setSettings(defaults);
      const id = learnerIdRef.current;
      if (id) saveSettings(id, defaults);
    },
    [],
  );

  const recordAffectiveSignal =
    useCallback<LearnerStateContextValue["recordAffectiveSignal"]>(
      (input) => {
        const id = learnerIdRef.current;
        if (!id) return;
        const recorded = recordSignal({
          ...input,
          learnerId: id,
          confidenceCheckinEnabled: settings.confidenceCheckinOptIn,
        });
        if (recorded) setSignals((prev) => [...prev, recorded]);
      },
      [settings.confidenceCheckinOptIn],
    );

  const computeAffectiveScore = useCallback<
    LearnerStateContextValue["computeAffectiveScore"]
  >((windowDays = DEFAULT_WINDOW_DAYS) => {
    const id = learnerIdRef.current;
    if (!id) return null;
    return affectiveFilterScore(id, windowDays);
  }, []);

  const value = useMemo<LearnerStateContextValue>(
    () => ({
      learnerId,
      isHydrated: hydratedFor === learnerId && learnerId !== null,
      settings,
      updateSettings,
      resetSettings,
      affectiveSignals: signals,
      recordAffectiveSignal,
      computeAffectiveScore,
    }),
    [
      learnerId,
      hydratedFor,
      settings,
      updateSettings,
      resetSettings,
      signals,
      recordAffectiveSignal,
      computeAffectiveScore,
    ],
  );

  return (
    <LearnerStateContext.Provider value={value}>
      {children}
    </LearnerStateContext.Provider>
  );
}

export function useLearnerState(): LearnerStateContextValue {
  const ctx = useContext(LearnerStateContext);
  if (!ctx) {
    return {
      learnerId: null,
      isHydrated: false,
      settings: { ...DEFAULT_SETTINGS },
      updateSettings: () => undefined,
      resetSettings: () => undefined,
      affectiveSignals: [],
      recordAffectiveSignal: () => undefined,
      computeAffectiveScore: () => null,
    };
  }
  return ctx;
}
