"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { loadSettings, saveSettings } from "./store";
import {
  DEFAULT_SETTINGS,
  applySettingsPatch,
  type Settings,
  type SettingsPatch,
} from "./types";

export type SettingsContextValue = {
  settings: Settings;
  update: (patch: SettingsPatch) => void;
  reset: () => void;
};

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setSettings({ ...DEFAULT_SETTINGS });
      setHydratedFor(null);
      return;
    }
    if (hydratedFor === userId) return;
    setSettings(loadSettings(userId));
    setHydratedFor(userId);
  }, [userId, hydratedFor]);

  const update = useCallback<SettingsContextValue["update"]>(
    (patch) => {
      setSettings((current) => {
        const next = applySettingsPatch(current, patch);
        if (userId) saveSettings(userId, next);
        return next;
      });
    },
    [userId],
  );

  const reset = useCallback<SettingsContextValue["reset"]>(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    if (userId) saveSettings(userId, { ...DEFAULT_SETTINGS });
  }, [userId]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, update, reset }),
    [settings, update, reset],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    return {
      settings: { ...DEFAULT_SETTINGS },
      update: () => undefined,
      reset: () => undefined,
    };
  }
  return ctx;
}

export function useSettingsOrAuth(): { userId: string | null } {
  const auth = useAuth();
  return { userId: auth.user?.id ?? null };
}
