import { describe, expect, it } from "vitest";
import {
  SCENARIO_STORAGE_KEY,
  emptySnapshot,
  isUnlocked,
  loadSnapshot,
  progressFor,
  recordCompletion,
  saveSnapshot,
} from "@/lib/scenarios/store";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe("scenario store", () => {
  it("returns empty snapshot when nothing is stored", () => {
    const storage = new MemoryStorage();
    expect(loadSnapshot(storage)).toEqual(emptySnapshot());
  });

  it("round-trips a snapshot", () => {
    const storage = new MemoryStorage();
    const snapshot = recordCompletion(emptySnapshot(), {
      scenarioId: "s-greetings-1-cafe-entrar",
      stars: 2,
      passed: true,
      turnsTaken: 5,
      completedAt: 1700000000000,
    });
    saveSnapshot(storage, snapshot);
    const loaded = loadSnapshot(storage);
    expect(loaded.byId["s-greetings-1-cafe-entrar"]?.bestStars).toBe(2);
  });

  it("takes the max of bestStars across attempts", () => {
    const storage = new MemoryStorage();
    const first = recordCompletion(emptySnapshot(), {
      scenarioId: "x",
      stars: 1,
      passed: true,
      turnsTaken: 3,
      completedAt: 1,
    });
    const second = recordCompletion(first, {
      scenarioId: "x",
      stars: 3,
      passed: true,
      turnsTaken: 4,
      completedAt: 2,
    });
    saveSnapshot(storage, second);
    const loaded = loadSnapshot(storage);
    expect(loaded.byId.x?.bestStars).toBe(3);
    expect(loaded.byId.x?.attempts).toBe(2);
  });

  it("preserves bestStars when a later attempt scores lower", () => {
    const storage = new MemoryStorage();
    const first = recordCompletion(emptySnapshot(), {
      scenarioId: "y",
      stars: 3,
      passed: true,
      turnsTaken: 4,
      completedAt: 1,
    });
    const second = recordCompletion(first, {
      scenarioId: "y",
      stars: 1,
      passed: true,
      turnsTaken: 5,
      completedAt: 2,
    });
    const progress = progressFor(second, "y");
    expect(progress?.bestStars).toBe(3);
    expect(progress?.attempts).toBe(2);
  });

  it("treats missing completedAt as locked", () => {
    const snapshot = emptySnapshot();
    expect(isUnlocked(snapshot, "s-cafe-1-pedir-basico")).toBe(false);
  });

  it("marks scenario as unlocked after a completion", () => {
    const snapshot = recordCompletion(emptySnapshot(), {
      scenarioId: "s-cafe-1-pedir-basico",
      stars: 1,
      passed: true,
      turnsTaken: 3,
      completedAt: 1,
    });
    expect(isUnlocked(snapshot, "s-cafe-1-pedir-basico")).toBe(true);
  });

  it("rejects malformed JSON in storage", () => {
    const storage = new MemoryStorage();
    storage.setItem(SCENARIO_STORAGE_KEY, "not-json");
    expect(loadSnapshot(storage)).toEqual(emptySnapshot());
  });
});
