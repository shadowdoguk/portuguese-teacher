import { describe, expect, it } from "vitest";
import {
  aggregateRecentMistakes,
  DEFAULT_RECENT_MISTAKES_LIMIT,
  DEFAULT_RECENT_MISTAKES_WINDOW_DAYS,
  MAX_RECENT_MISTAKES_LIMIT,
  MAX_RECENT_MISTAKES_WINDOW_DAYS,
  type ItemLookup,
} from "@/lib/dashboard/recent-mistakes";
import type { SrsRecallEvent } from "@/lib/srs/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-06-30T12:00:00.000Z").getTime();

function makeEvent(overrides: Partial<SrsRecallEvent> & { grade: SrsRecallEvent["grade"] }): SrsRecallEvent {
  const { grade, ...rest } = overrides;
  return {
    event: "srs_recall",
    learnerId: "learner-1",
    itemId: "item-1",
    grade,
    halfLifeBeforeMs: 600_000,
    halfLifeAfterMs: 600_000,
    dueAt: NOW,
    timestamp: NOW,
    ...rest,
  };
}

const VOCAB: Record<string, ItemLookup> = {
  "v-cafe": { kind: "vocabulary", pt: "café", gloss: "coffee" },
  "v-bom-dia": { kind: "vocabulary", pt: "bom dia", gloss: "good morning" },
  "v-obrigado": { kind: "vocabulary", pt: "obrigado", gloss: "thank you" },
};

const GRAMMAR: Record<string, ItemLookup> = {
  "grammar-ser-estar": { kind: "grammar", pt: "ser vs estar", gloss: "two 'to be' verbs" },
};

function lookupItem(id: string): ItemLookup | null {
  return VOCAB[id] ?? GRAMMAR[id] ?? null;
}

describe("aggregateRecentMistakes", () => {
  it("returns empty result for a learner with no events", () => {
    const result = aggregateRecentMistakes({
      events: [],
      lookupItem,
      now: NOW,
    });
    expect(result.items).toEqual([]);
    expect(result.totalLapses).toBe(0);
    expect(result.uniqueItems).toBe(0);
    expect(result.windowMs).toBe(DEFAULT_RECENT_MISTAKES_WINDOW_DAYS * DAY_MS);
  });

  it("ignores grades other than 'again'", () => {
    const events: SrsRecallEvent[] = [
      makeEvent({ grade: "good", itemId: "v-cafe" }),
      makeEvent({ grade: "hard", itemId: "v-cafe" }),
      makeEvent({ grade: "easy", itemId: "v-cafe" }),
    ];
    const result = aggregateRecentMistakes({
      events,
      lookupItem,
      now: NOW,
    });
    expect(result.items).toEqual([]);
    expect(result.totalLapses).toBe(0);
  });

  it("ignores events outside the window", () => {
    const events: SrsRecallEvent[] = [
      makeEvent({ grade: "again", itemId: "v-cafe", timestamp: NOW - 10 * DAY_MS }),
    ];
    const result = aggregateRecentMistakes({
      events,
      lookupItem,
      now: NOW,
    });
    expect(result.items).toEqual([]);
  });

  it("groups lapses by itemId and counts them", () => {
    const events: SrsRecallEvent[] = [
      makeEvent({ grade: "again", itemId: "v-cafe", timestamp: NOW - 1 * DAY_MS }),
      makeEvent({ grade: "again", itemId: "v-cafe", timestamp: NOW - 2 * DAY_MS }),
      makeEvent({ grade: "again", itemId: "v-bom-dia", timestamp: NOW - 3 * DAY_MS }),
    ];
    const result = aggregateRecentMistakes({
      events,
      lookupItem,
      now: NOW,
    });
    expect(result.totalLapses).toBe(3);
    expect(result.uniqueItems).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.itemId).toBe("v-cafe");
    expect(result.items[0]?.lapses).toBe(2);
    expect(result.items[0]?.pt).toBe("café");
    expect(result.items[0]?.gloss).toBe("coffee");
    expect(result.items[0]?.kind).toBe("vocabulary");
    expect(result.items[1]?.itemId).toBe("v-bom-dia");
    expect(result.items[1]?.lapses).toBe(1);
  });

  it("sorts by lapses desc, then by most-recent lapse", () => {
    const events: SrsRecallEvent[] = [
      makeEvent({ grade: "again", itemId: "v-cafe", timestamp: NOW - 6 * DAY_MS }),
      makeEvent({ grade: "again", itemId: "v-bom-dia", timestamp: NOW - 1 * DAY_MS }),
      makeEvent({ grade: "again", itemId: "v-bom-dia", timestamp: NOW - 2 * DAY_MS }),
      makeEvent({ grade: "again", itemId: "v-obrigado", timestamp: NOW - 5 * DAY_MS }),
    ];
    const result = aggregateRecentMistakes({
      events,
      lookupItem,
      now: NOW,
    });
    expect(result.items.map((i) => i.itemId)).toEqual([
      "v-bom-dia",
      "v-obrigado",
      "v-cafe",
    ]);
  });

  it("caps the returned list at the limit", () => {
    const events: SrsRecallEvent[] = [];
    for (let i = 0; i < 10; i += 1) {
      events.push(
        makeEvent({ grade: "again", itemId: `v-item-${i}`, timestamp: NOW - i * 1000 }),
      );
    }
    const result = aggregateRecentMistakes({
      events,
      lookupItem: () => null,
      now: NOW,
      limit: 3,
    });
    expect(result.items).toHaveLength(3);
    expect(result.uniqueItems).toBe(10);
  });

  it("returns the default window when the override is invalid", () => {
    const events: SrsRecallEvent[] = [
      makeEvent({ grade: "again", itemId: "v-cafe", timestamp: NOW - 6 * DAY_MS }),
    ];
    const result = aggregateRecentMistakes({
      events,
      lookupItem,
      now: NOW,
      windowDays: 0,
    });
    expect(result.windowMs).toBe(DEFAULT_RECENT_MISTAKES_WINDOW_DAYS * DAY_MS);
    expect(result.items).toHaveLength(1);
  });

  it("caps the window at MAX_RECENT_MISTAKES_WINDOW_DAYS", () => {
    const result = aggregateRecentMistakes({
      events: [],
      lookupItem,
      now: NOW,
      windowDays: 365,
    });
    expect(result.windowMs).toBe(MAX_RECENT_MISTAKES_WINDOW_DAYS * DAY_MS);
  });

  it("caps the limit at MAX_RECENT_MISTAKES_LIMIT", () => {
    const result = aggregateRecentMistakes({
      events: [],
      lookupItem,
      now: NOW,
      limit: 9999,
    });
    expect(result.items.length).toBeLessThanOrEqual(MAX_RECENT_MISTAKES_LIMIT);
  });

  it("defaults to DEFAULT_RECENT_MISTAKES_LIMIT when the limit is non-positive", () => {
    const events: SrsRecallEvent[] = [];
    for (let i = 0; i < DEFAULT_RECENT_MISTAKES_LIMIT + 2; i += 1) {
      events.push(
        makeEvent({ grade: "again", itemId: `v-item-${i}`, timestamp: NOW - i * 1000 }),
      );
    }
    const result = aggregateRecentMistakes({
      events,
      lookupItem: () => null,
      now: NOW,
      limit: -3,
    });
    expect(result.items).toHaveLength(DEFAULT_RECENT_MISTAKES_LIMIT);
  });

  it("falls back to itemId when the lookup misses", () => {
    const events: SrsRecallEvent[] = [
      makeEvent({ grade: "again", itemId: "v-unknown", timestamp: NOW - 1 * DAY_MS }),
    ];
    const result = aggregateRecentMistakes({
      events,
      lookupItem: () => null,
      now: NOW,
    });
    expect(result.items[0]?.pt).toBe("v-unknown");
    expect(result.items[0]?.gloss).toBe("Item not found in current curriculum");
    expect(result.items[0]?.kind).toBe("vocabulary");
  });

  it("identifies grammar items by their 'grammar-' prefix when lookup misses", () => {
    const events: SrsRecallEvent[] = [
      makeEvent({
        grade: "again",
        itemId: "grammar-future-tense",
        timestamp: NOW - 1 * DAY_MS,
      }),
    ];
    const result = aggregateRecentMistakes({
      events,
      lookupItem: () => null,
      now: NOW,
    });
    expect(result.items[0]?.kind).toBe("grammar");
  });

  it("uses the grammar lookup when provided", () => {
    const events: SrsRecallEvent[] = [
      makeEvent({
        grade: "again",
        itemId: "grammar-ser-estar",
        timestamp: NOW - 1 * DAY_MS,
      }),
    ];
    const result = aggregateRecentMistakes({
      events,
      lookupItem,
      now: NOW,
    });
    expect(result.items[0]?.kind).toBe("grammar");
    expect(result.items[0]?.pt).toBe("ser vs estar");
    expect(result.items[0]?.gloss).toBe("two 'to be' verbs");
  });

  it("tracks the most-recent lapseAt per item", () => {
    const events: SrsRecallEvent[] = [
      makeEvent({ grade: "again", itemId: "v-cafe", timestamp: NOW - 5 * DAY_MS }),
      makeEvent({ grade: "again", itemId: "v-cafe", timestamp: NOW - 1 * DAY_MS }),
      makeEvent({ grade: "again", itemId: "v-cafe", timestamp: NOW - 3 * DAY_MS }),
    ];
    const result = aggregateRecentMistakes({
      events,
      lookupItem,
      now: NOW,
    });
    expect(result.items[0]?.lastLapseAt).toBe(NOW - 1 * DAY_MS);
  });
});