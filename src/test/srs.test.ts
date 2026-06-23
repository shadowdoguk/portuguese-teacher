import { describe, expect, it } from "vitest";
import {
  AGAIN_RESET_HALF_LIFE_MS,
  INITIAL_HALF_LIFE_MS,
  MAX_HALF_LIFE_MS,
  MIN_HALF_LIFE_MS,
  SRS_HALF_LIFE_MULTIPLIERS,
  allReviewableRefs,
  applyRecall,
  countDue,
  dueBucketCounts,
  dueQueue,
  emptyState,
  enrollItem,
  enrollMany,
  isRecallGrade,
  RECALL_GRADES,
  vocabularyRefsFromCurriculum,
  type SrsItemRef,
} from "@/lib/srs";

const ONE_MIN = 60_000;
const ONE_DAY = 24 * 60 * 60 * 1000;
const FIXED_NOW = 1_700_000_000_000;

function makeRef(overrides: Partial<SrsItemRef> = {}): SrsItemRef {
  return {
    kind: "vocabulary",
    itemId: overrides.itemId ?? "v-1",
    pt: overrides.pt ?? "bom dia",
    gloss: overrides.gloss ?? "good morning",
    unitId: overrides.unitId ?? "a0-1",
    ...(overrides.audioAssetId ? { audioAssetId: overrides.audioAssetId } : {}),
    ...(overrides.imageAssetId ? { imageAssetId: overrides.imageAssetId } : {}),
  };
}

function makeRefs(count: number): SrsItemRef[] {
  return Array.from({ length: count }, (_, i) =>
    makeRef({ itemId: `synthetic-${i}`, pt: `palavra ${i}`, gloss: `word ${i}` }),
  );
}

describe("HLR scheduler — recall multiplier math", () => {
  it("classifies RecallGrade as 'again' | 'hard' | 'good' | 'easy'", () => {
    expect(RECALL_GRADES).toEqual(["again", "hard", "good", "easy"]);
    for (const g of RECALL_GRADES) {
      expect(isRecallGrade(g)).toBe(true);
    }
    expect(isRecallGrade("perfect")).toBe(false);
  });

  it("documents the published multipliers", () => {
    expect(SRS_HALF_LIFE_MULTIPLIERS.again).toBe(0.25);
    expect(SRS_HALF_LIFE_MULTIPLIERS.hard).toBe(0.5);
    expect(SRS_HALF_LIFE_MULTIPLIERS.good).toBe(2.5);
    expect(SRS_HALF_LIFE_MULTIPLIERS.easy).toBe(4);
  });

  it("resets the half-life to AGAIN_RESET_HALF_LIFE_MS on 'again' and bumps lapses", () => {
    const ref = makeRef();
    const enrolled = enrollItem(emptyState(), ref, FIXED_NOW);
    const result = applyRecall(enrolled, "learner-1", ref.itemId, "again", FIXED_NOW);
    expect(result.record.halfLifeMs).toBe(AGAIN_RESET_HALF_LIFE_MS);
    expect(result.record.lapses).toBe(1);
    expect(result.record.dueAt).toBe(FIXED_NOW + AGAIN_RESET_HALF_LIFE_MS);
  });

  it("halves the half-life on 'hard'", () => {
    const ref = makeRef();
    const enrolled = enrollItem(emptyState(), ref, FIXED_NOW);
    const result = applyRecall(enrolled, "learner-1", ref.itemId, "hard", FIXED_NOW);
    expect(result.record.halfLifeMs).toBe(enrolled.items[ref.itemId]!.halfLifeMs * 0.5);
    expect(result.record.lapses).toBe(0);
  });

  it("extends the half-life by 2.5x on 'good'", () => {
    const ref = makeRef();
    const enrolled = enrollItem(emptyState(), ref, FIXED_NOW);
    const result = applyRecall(enrolled, "learner-1", ref.itemId, "good", FIXED_NOW);
    expect(result.record.halfLifeMs).toBe(enrolled.items[ref.itemId]!.halfLifeMs * 2.5);
  });

  it("extends the half-life by 4x on 'easy'", () => {
    const ref = makeRef();
    const enrolled = enrollItem(emptyState(), ref, FIXED_NOW);
    const result = applyRecall(enrolled, "learner-1", ref.itemId, "easy", FIXED_NOW);
    expect(result.record.halfLifeMs).toBe(enrolled.items[ref.itemId]!.halfLifeMs * 4);
  });

  it("clamps the half-life to the MIN/MAX window", () => {
    const ref = makeRef();
    let state = enrollItem(emptyState(), ref, FIXED_NOW);
    for (let i = 0; i < 30; i += 1) {
      state = applyRecall(state, "learner-1", ref.itemId, "easy", FIXED_NOW).state;
    }
    expect(state.items[ref.itemId]!.halfLifeMs).toBeLessThanOrEqual(MAX_HALF_LIFE_MS);

    state = applyRecall(state, "learner-1", ref.itemId, "hard", FIXED_NOW).state;
    for (let i = 0; i < 30; i += 1) {
      state = applyRecall(state, "learner-1", ref.itemId, "hard", FIXED_NOW).state;
    }
    expect(state.items[ref.itemId]!.halfLifeMs).toBeGreaterThanOrEqual(MIN_HALF_LIFE_MS);
  });

  it("emits a structured srs_recall event with before/after half-lives", () => {
    const ref = makeRef();
    const enrolled = enrollItem(emptyState(), ref, FIXED_NOW);
    const result = applyRecall(enrolled, "learner-7", ref.itemId, "good", FIXED_NOW);
    expect(result.event).toMatchObject({
      event: "srs_recall",
      learnerId: "learner-7",
      itemId: ref.itemId,
      grade: "good",
      timestamp: FIXED_NOW,
    });
    expect(result.event.halfLifeBeforeMs).toBe(INITIAL_HALF_LIFE_MS);
    expect(result.event.halfLifeAfterMs).toBe(INITIAL_HALF_LIFE_MS * 2.5);
    expect(result.event.dueAt).toBe(FIXED_NOW + INITIAL_HALF_LIFE_MS * 2.5);
  });

  it("rejects recalls for unknown item ids", () => {
    expect(() => applyRecall(emptyState(), "learner-1", "ghost", "good", FIXED_NOW)).toThrow(
      /unknown SRS item/,
    );
  });
});

describe("enrollment", () => {
  it("enrolls an item with the documented initial half-life and no reviews yet", () => {
    const ref = makeRef();
    const state = enrollItem(emptyState(), ref, FIXED_NOW);
    expect(state.items[ref.itemId]).toEqual({
      itemId: ref.itemId,
      halfLifeMs: INITIAL_HALF_LIFE_MS,
      lastReviewedAt: null,
      dueAt: FIXED_NOW + INITIAL_HALF_LIFE_MS,
      reviewCount: 0,
      lapses: 0,
    });
  });

  it("is idempotent — re-enrolling does not reset existing records", () => {
    const ref = makeRef();
    const once = enrollItem(emptyState(), ref, FIXED_NOW);
    const graded = applyRecall(once, "learner", ref.itemId, "easy", FIXED_NOW).state;
    const twice = enrollItem(graded, ref, FIXED_NOW);
    expect(twice.items[ref.itemId]!.reviewCount).toBe(1);
    expect(twice.items[ref.itemId]!.halfLifeMs).toBeGreaterThan(INITIAL_HALF_LIFE_MS);
  });

  it("enrollMany handles a list of refs", () => {
    const refs = makeRefs(5);
    const state = enrollMany(emptyState(), refs, FIXED_NOW);
    expect(Object.keys(state.items)).toHaveLength(5);
  });
});

describe("due queue selection", () => {
  it("returns an empty array when nothing is due", () => {
    const ref = makeRef();
    const state = enrollItem(emptyState(), ref, FIXED_NOW);
    expect(dueQueue(state, { refs: [ref], now: FIXED_NOW })).toEqual([]);
  });

  it("returns an empty array when no items have been enrolled", () => {
    expect(dueQueue(emptyState(), { refs: [], now: FIXED_NOW })).toEqual([]);
  });

  it("returns due items ordered by oldest dueAt first", () => {
    const refs = makeRefs(3);
    const initial = enrollMany(emptyState(), refs, FIXED_NOW);
    const items = Object.values(initial.items);
    const firstId = items[0]!.itemId;
    const secondId = items[1]!.itemId;

    const backdatedSecond = {
      ...initial,
      items: {
        ...initial.items,
        [secondId]: {
          ...items[1]!,
          dueAt: FIXED_NOW - 5 * ONE_MIN,
        },
        [firstId]: {
          ...items[0]!,
          dueAt: FIXED_NOW - ONE_MIN,
        },
      },
    };

    const queue = dueQueue(backdatedSecond, {
      refs,
      now: FIXED_NOW,
      limit: 20,
    });
    expect(queue[0]?.ref.itemId).toBe(secondId);
    expect(queue[1]?.ref.itemId).toBe(firstId);
  });

  it("caps the queue to the requested limit (default 20, per FR-LP-4)", () => {
    const refs = makeRefs(30);
    const initial = enrollMany(emptyState(), refs, FIXED_NOW);
    const allDue = {
      items: Object.fromEntries(
        Object.entries(initial.items).map(([id, rec]) => [
          id,
          { ...rec, dueAt: FIXED_NOW - ONE_MIN },
        ]),
      ),
    };
    expect(dueQueue(allDue, { refs, now: FIXED_NOW })).toHaveLength(20);
    expect(dueQueue(allDue, { refs, now: FIXED_NOW, limit: 12 })).toHaveLength(12);
    expect(dueQueue(allDue, { refs, now: FIXED_NOW, limit: 5 })).toHaveLength(5);
  });

  it("ignores refs that have not been enrolled (no phantom items)", () => {
    const ref = makeRef();
    const state = enrollItem(emptyState(), ref, FIXED_NOW - 10 * ONE_MIN);
    const otherRef = makeRef({ itemId: "ghost" });
    const queue = dueQueue(state, { refs: [ref, otherRef], now: FIXED_NOW });
    expect(queue).toHaveLength(1);
    expect(queue[0]?.ref.itemId).toBe(ref.itemId);
  });
});

describe("countDue", () => {
  it("counts every item whose dueAt <= now", () => {
    const refs = makeRefs(4);
    let state = enrollMany(emptyState(), refs, FIXED_NOW);
    const records = Object.values(state.items);
    state = {
      items: {
        ...state.items,
        [records[0]!.itemId]: { ...records[0]!, dueAt: FIXED_NOW - ONE_MIN },
        [records[1]!.itemId]: { ...records[1]!, dueAt: FIXED_NOW + ONE_DAY },
        [records[2]!.itemId]: { ...records[2]!, dueAt: FIXED_NOW - ONE_MIN },
      },
    };
    expect(countDue(state, refs, FIXED_NOW)).toBe(2);
  });

  it("returns 0 on an empty state without throwing", () => {
    expect(countDue(emptyState(), [], FIXED_NOW)).toBe(0);
  });
});

describe("100-item synthetic Learner — 14-day due-date distribution", () => {
  it("produces a stable, sensible spread across 14 days after several recall rounds", () => {
    const refs = makeRefs(100);
    const now = FIXED_NOW;
    let state = enrollMany(emptyState(), refs, now);

    // Simulate 6 review rounds with mixed grades. Most items are graded
    // "good" (70%), with some "easy" (15%) / "hard" (12%) / occasional
    // "again" (3%). This drives half-lives from minutes into a days-to-weeks
    // regime, which is the steady-state range we want to exercise.
    const rounds = 6;
    for (let round = 0; round < rounds; round += 1) {
      for (const ref of refs) {
        const r = Math.abs(hashCode(ref.itemId + ":" + round)) % 100;
        const grade = r < 3 ? "again" : r < 15 ? "hard" : r < 85 ? "good" : "easy";
        state = applyRecall(state, "synthetic-1", ref.itemId, grade, now).state;
      }
    }

    const buckets = dueBucketCounts(state, refs, now, ONE_DAY, 14);
    const total = buckets.reduce((a, b) => a + b, 0);
    expect(total).toBe(100);

    const day0 = buckets[0] ?? 0;
    const laterDays = buckets.slice(1).reduce((a, b) => a + b, 0);
    expect(day0).toBeLessThan(total);
    expect(laterDays).toBeGreaterThan(0);

    const max = Math.max(...buckets);
    const min = Math.min(...buckets);
    expect(max).toBeLessThan(total);
    expect(max - min).toBeLessThan(total);
  });
});

describe("curriculum adapter", () => {
  it("enumerates every vocabulary entry in A0_CURRICULUM", () => {
    const refs = vocabularyRefsFromCurriculum();
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref.kind).toBe("vocabulary");
      expect(ref.pt.length).toBeGreaterThan(0);
      expect(ref.gloss.length).toBeGreaterThan(0);
    }
  });

  it("produces a non-empty reviewable set across vocabulary + grammar", () => {
    expect(allReviewableRefs().length).toBeGreaterThan(0);
  });
});

describe("storage boundary types", () => {
  it("exposes the documented constants", () => {
    expect(INITIAL_HALF_LIFE_MS).toBe(5 * ONE_MIN);
    expect(AGAIN_RESET_HALF_LIFE_MS).toBe(5 * ONE_MIN);
    expect(MIN_HALF_LIFE_MS).toBe(ONE_MIN);
    expect(MAX_HALF_LIFE_MS).toBe(180 * ONE_DAY);
  });
});

function hashCode(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return h;
}
