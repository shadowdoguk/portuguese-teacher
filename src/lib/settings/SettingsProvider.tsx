"use client";

import { createContext, type ReactNode } from "react";
import {
  LearnerStateProvider,
  useLearnerState,
} from "@/lib/learner/LearnerStateProvider";
import type { Settings, SettingsPatch } from "./types";

/**
 * Backwards-compat: `SettingsProvider` is now an alias for the unified
 * `LearnerStateProvider` (issue #105 PR 2 — Provider consolidation).
 * Existing call sites and tests continue to wrap in `<SettingsProvider>`,
 * which now also owns Affective signals under the same hydration lifecycle.
 *
 * `SettingsContext` is kept as a legacy context for back-compat exports. All
 * consumers should use `useSettings()` (now a thin wrapper around
 * `useLearnerState()`).
 */

export type SettingsContextValue = {
  settings: Settings;
  update: (patch: SettingsPatch) => void;
  reset: () => void;
};

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings?: Settings;
}) {
  return (
    <LearnerStateProvider initialSettings={initialSettings}>
      {children}
    </LearnerStateProvider>
  );
}

export function useSettings(): SettingsContextValue {
  const s = useLearnerState();
  return {
    settings: s.settings,
    update: s.updateSettings,
    reset: s.resetSettings,
  };
}
