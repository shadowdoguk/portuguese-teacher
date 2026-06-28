import { DEFAULT_SETTINGS, applySettingsPatch, type Settings, type SettingsPatch } from "./types";

export const STORAGE_PREFIX = "portuguese-teacher:settings:";

export function settingsStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadSettings(userId: string | null | undefined): Settings {
  if (!userId) return { ...DEFAULT_SETTINGS };
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  const raw = window.localStorage.getItem(settingsStorageKey(userId));
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as SettingsPatch;
    return applySettingsPatch({ ...DEFAULT_SETTINGS }, parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(userId: string, settings: Settings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(settingsStorageKey(userId), JSON.stringify(settings));
}

export function clearSettings(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(settingsStorageKey(userId));
}
