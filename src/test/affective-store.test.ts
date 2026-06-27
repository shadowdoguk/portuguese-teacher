import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  STORAGE_PREFIX,
  affectiveStorageKey,
  appendSignal,
  clearSignals,
  loadSignals,
  recordSignal,
  recordSignals,
  saveSignals,
  type AffectiveFilterSignal,
} from "@/lib/affective";

function makeSignal(overrides: Partial<AffectiveFilterSignal> = {}): AffectiveFilterSignal {
  return {
    id: `sig-${Math.random().toString(36).slice(2, 8)}`,
    learnerId: "l1",
    source: "client",
    kind: "response-latency",
    occurredAt: new Date().toISOString(),
    value: 1200,
    ...overrides,
  };
}

describe("affectiveStorageKey", () => {
  it("keys per learner", () => {
    expect(affectiveStorageKey("user-1")).toBe(`${STORAGE_PREFIX}user-1`);
  });
});

describe("loadSignals / saveSignals / appendSignal", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns [] for unknown learner", () => {
    expect(loadSignals("nobody")).toEqual([]);
  });

  it("returns [] for malformed JSON", () => {
    window.localStorage.setItem(affectiveStorageKey("l1"), "{not-json");
    expect(loadSignals("l1")).toEqual([]);
  });

  it("filters out non-signal entries", () => {
    window.localStorage.setItem(
      affectiveStorageKey("l1"),
      JSON.stringify([
        makeSignal({ learnerId: "l1" }),
        { id: 1, garbage: true },
        null,
      ]),
    );
    const loaded = loadSignals("l1");
    expect(loaded).toHaveLength(1);
  });

  it("appends in order and persists", () => {
    appendSignal(makeSignal({ kind: "mic-cancel", value: 1 }));
    appendSignal(makeSignal({ kind: "tab-blur", value: 5000 }));
    const loaded = loadSignals("l1");
    expect(loaded).toHaveLength(2);
    expect(loaded[0]?.kind).toBe("mic-cancel");
    expect(loaded[1]?.kind).toBe("tab-blur");
  });

  it("round-trips through saveSignals", () => {
    const original = [makeSignal({ kind: "review-skip" })];
    saveSignals("l1", original);
    expect(loadSignals("l1")).toEqual(original);
  });

  it("clears all signals for a learner", () => {
    appendSignal(makeSignal({}));
    clearSignals("l1");
    expect(loadSignals("l1")).toEqual([]);
  });
});

describe("recordSignal", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("writes a signal with auto-generated id", () => {
    const written = recordSignal({
      learnerId: "l1",
      source: "client",
      kind: "response-latency",
      value: 1500,
    });
    expect(written).not.toBeNull();
    expect(written?.id).toMatch(/^l1:response-latency:/);
    const loaded = loadSignals("l1");
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.value).toBe(1500);
  });

  it("rejects confidence-checkin when opt-in is false", () => {
    const result = recordSignal({
      learnerId: "l1",
      source: "self-report",
      kind: "confidence-checkin",
      rating: 3,
      confidenceCheckinEnabled: false,
    });
    expect(result).toBeNull();
    expect(loadSignals("l1")).toEqual([]);
  });

  it("accepts confidence-checkin when opt-in is true", () => {
    const result = recordSignal({
      learnerId: "l1",
      source: "self-report",
      kind: "confidence-checkin",
      rating: 4,
      confidenceCheckinEnabled: true,
    });
    expect(result).not.toBeNull();
    expect(loadSignals("l1")).toHaveLength(1);
  });

  it("accepts confidence-checkin when opt-in is undefined (default permissive)", () => {
    const result = recordSignal({
      learnerId: "l1",
      source: "self-report",
      kind: "confidence-checkin",
      rating: 5,
    });
    expect(result).not.toBeNull();
  });

  it("preserves a fixed occurredAt when supplied", () => {
    const ts = new Date("2026-06-27T12:00:00.000Z");
    const result = recordSignal({
      learnerId: "l1",
      source: "server",
      kind: "milestone-attempt",
      now: ts,
    });
    expect(result?.occurredAt).toBe(ts.toISOString());
  });
});

describe("recordSignals", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns only the accepted signals", () => {
    const written = recordSignals([
      {
        learnerId: "l1",
        source: "client",
        kind: "response-latency",
        value: 1000,
      },
      {
        learnerId: "l1",
        source: "self-report",
        kind: "confidence-checkin",
        rating: 1,
        confidenceCheckinEnabled: false,
      },
      {
        learnerId: "l1",
        source: "server",
        kind: "unit-drop-off",
      },
    ]);
    expect(written).toHaveLength(2);
    expect(loadSignals("l1")).toHaveLength(2);
  });
});
