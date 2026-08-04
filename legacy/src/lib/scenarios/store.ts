import type { ScenarioCompletion, ScenarioProgress } from "./library";

export type { ScenarioProgress };

export const SCENARIO_STORAGE_KEY = "pt.scenarios.v1";

export type ScenarioStoreSnapshot = {
  byId: Record<string, ScenarioProgress>;
  lastUpdatedAt: number;
};

const EMPTY_SNAPSHOT: ScenarioStoreSnapshot = { byId: {}, lastUpdatedAt: 0 };

export function emptySnapshot(): ScenarioStoreSnapshot {
  return { byId: {}, lastUpdatedAt: 0 };
}

export function loadSnapshot(storage: { getItem(key: string): string | null }): ScenarioStoreSnapshot {
  const raw = storage.getItem(SCENARIO_STORAGE_KEY);
  if (!raw) return emptySnapshot();
  try {
    const parsed = JSON.parse(raw) as Partial<ScenarioStoreSnapshot>;
    if (!parsed || typeof parsed !== "object" || typeof parsed.byId !== "object") {
      return emptySnapshot();
    }
    return {
      byId: parsed.byId as Record<string, ScenarioProgress>,
      lastUpdatedAt: typeof parsed.lastUpdatedAt === "number" ? parsed.lastUpdatedAt : 0,
    };
  } catch {
    return emptySnapshot();
  }
}

export function saveSnapshot(
  storage: { setItem(key: string, value: string): void },
  snapshot: ScenarioStoreSnapshot,
): void {
  storage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(snapshot));
}

export function recordCompletion(
  snapshot: ScenarioStoreSnapshot,
  completion: ScenarioCompletion,
): ScenarioStoreSnapshot {
  const previous = snapshot.byId[completion.scenarioId];
  const bestStars = previous
    ? Math.max(previous.bestStars, completion.stars) as 0 | 1 | 2 | 3
    : completion.stars;
  const next: ScenarioProgress = {
    scenarioId: completion.scenarioId,
    completedAt: completion.completedAt,
    bestStars,
    attempts: (previous?.attempts ?? 0) + 1,
  };
  return {
    byId: { ...snapshot.byId, [completion.scenarioId]: next },
    lastUpdatedAt: completion.completedAt,
  };
}

export function progressFor(
  snapshot: ScenarioStoreSnapshot,
  scenarioId: string,
): ScenarioProgress | undefined {
  return snapshot.byId[scenarioId];
}

export function isUnlocked(
  snapshot: ScenarioStoreSnapshot,
  scenarioId: string,
): boolean {
  return Boolean(snapshot.byId[scenarioId]?.completedAt);
}

export { EMPTY_SNAPSHOT };
