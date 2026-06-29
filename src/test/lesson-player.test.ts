import { describe, expect, it } from "vitest";
import { A0_CURRICULUM, type PracticeExercise } from "@/lib/curriculum";
import {
  DEFAULT_MAX_INJECTED,
  findUnitForLesson,
  getLessonFromCurriculum,
  interleaveSrsItems,
  totalAuthoredItems,
  totalReviewItems,
} from "@/lib/lesson/player";
import {
  AGAIN_RESET_HALF_LIFE_MS,
  INITIAL_HALF_LIFE_MS,
  applyRecall,
  emptyState,
  enrollItem,
  type RecallGrade,
  type SrsItemRef,
  type SrsReviewRecord,
} from "@/lib/srs";
import { dueQueue } from "@/lib/srs/scheduler";

function makeRef(id: string, pt: string, gloss: string, unitId = "a0-1"): SrsItemRef {
  return { kind: "vocabulary", itemId: id, pt, gloss, unitId };
}

function authored(id: string, kind: PracticeExercise["kind"] = "flashcard"): PracticeExercise {
  return {
    id,
    lessonId: "lesson-test",
    kind,
    prompt: `prompt-${id}`,
    expectedAnswer: `answer-${id}`,
    difficulty: "core",
    vocabularyRefs: [],
    grammarRefs: [],
  };
}

function freshRecord(itemId: string, halfLifeMs: number, dueAt: number): SrsReviewRecord {
  return {
    itemId,
    halfLifeMs,
    lastReviewedAt: null,
    dueAt,
    reviewCount: 0,
    lapses: 0,
  };
}

describe("getLessonFromCurriculum + findUnitForLesson", () => {
  it("returns the seeded A0 lessons", () => {
    const sample = A0_CURRICULUM.units[0]?.lessons[0];
    if (!sample) throw new Error("expected A0 curriculum to seed at least one lesson");
    const lesson = getLessonFromCurriculum(sample.id);
    expect(lesson).toBeDefined();
    expect(lesson?.id).toBe(sample.id);
  });

  it("returns undefined for an unknown lesson id", () => {
    expect(getLessonFromCurriculum("does-not-exist")).toBeUndefined();
  });

  it("findUnitForLesson returns the owning unit", () => {
    const sample = A0_CURRICULUM.units[0]?.lessons[0];
    if (!sample) throw new Error("expected at least one seeded lesson");
    const unit = findUnitForLesson(sample.id);
    expect(unit).toBeDefined();
    expect(unit?.lessons.some((l) => l.id === sample.id)).toBe(true);
  });
});

describe("interleaveSrsItems", () => {
  it("returns authored items untouched when no reviews are due", () => {
    const stream = interleaveSrsItems(
      [authored("e1"), authored("e2"), authored("e3")],
      [],
    );
    expect(stream).toHaveLength(3);
    expect(stream.every((s) => s.kind === "authored")).toBe(true);
    expect(totalAuthoredItems(stream)).toBe(3);
    expect(totalReviewItems(stream)).toBe(0);
  });

  it("inserts one review after every 2 authored (default cadence)", () => {
    const ref = makeRef("a0-1-v-bom-dia", "bom dia", "good morning");
    const record = freshRecord(ref.itemId, INITIAL_HALF_LIFE_MS, 1_700_000_000_000);
    const due = [{ ref, record }];
    const stream = interleaveSrsItems(
      [authored("e1"), authored("e2"), authored("e3"), authored("e4")],
      due,
    );
    expect(stream).toHaveLength(5);
    expect(stream[0]?.kind).toBe("authored");
    expect(stream[1]?.kind).toBe("authored");
    expect(stream[2]?.kind).toBe("review");
    expect(stream[3]?.kind).toBe("authored");
    expect(stream[4]?.kind).toBe("authored");
  });

  it("caps the injected review count at maxInjected", () => {
    const refs = Array.from({ length: 10 }, (_, i) => makeRef(`r-${i}`, `pt-${i}`, `gloss-${i}`));
    const records = refs.map((ref) => freshRecord(ref.itemId, INITIAL_HALF_LIFE_MS, 0));
    const due = refs.map((ref, i) => ({ ref, record: records[i]! }));
    const stream = interleaveSrsItems(
      Array.from({ length: 20 }, (_, i) => authored(`e-${i}`)),
      due,
      { maxInjected: 3, cadence: 2 },
    );
    expect(totalReviewItems(stream)).toBe(3);
    expect(stream.filter((s) => s.kind === "review").every((s) => s.kind === "review")).toBe(true);
  });

  it("respects a custom cadence", () => {
    const ref = makeRef("r1", "pt", "gloss");
    const record = freshRecord(ref.itemId, INITIAL_HALF_LIFE_MS, 0);
    const due = [{ ref, record }];
    const stream = interleaveSrsItems(
      [authored("e1"), authored("e2"), authored("e3"), authored("e4"), authored("e5")],
      due,
      { cadence: 3, maxInjected: 1 },
    );
    expect(stream[3]?.kind).toBe("review");
    expect(totalReviewItems(stream)).toBe(1);
  });

  it("preserves authored positions in order", () => {
    const stream = interleaveSrsItems(
      [authored("e1"), authored("e2"), authored("e3")],
      [],
    );
    expect(stream.map((s) => (s.kind === "authored" ? s.exercise.id : null))).toEqual([
      "e1",
      "e2",
      "e3",
    ]);
  });

  it("positions are dense and start at 0", () => {
    const ref = makeRef("r1", "pt", "gloss");
    const record = freshRecord(ref.itemId, INITIAL_HALF_LIFE_MS, 0);
    const stream = interleaveSrsItems(
      [authored("e1"), authored("e2"), authored("e3"), authored("e4")],
      [{ ref, record }],
      { cadence: 2 },
    );
    expect(stream.map((s) => s.position)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("interleaveSrsItems with real SRS scheduler", () => {
  const NOW = 1_700_000_000_000;
  const grades: ReadonlyArray<RecallGrade> = ["again", "hard", "good", "easy"];

  it("uses dueQueue to pick the items to inject", () => {
    const refs: SrsItemRef[] = ["v-1", "v-2", "v-3", "v-4"].map((id) =>
      makeRef(id, `pt-${id}`, `gloss-${id}`),
    );
    let state = emptyState();
    for (const ref of refs) {
      state = enrollItem(state, ref, NOW - INITIAL_HALF_LIFE_MS - 1);
    }
    const due = dueQueue(state, { refs, now: NOW, limit: DEFAULT_MAX_INJECTED });
    expect(due.length).toBe(DEFAULT_MAX_INJECTED);
    const stream = interleaveSrsItems(
      Array.from({ length: 12 }, (_, i) => authored(`e-${i}`)),
      due,
      { maxInjected: DEFAULT_MAX_INJECTED, cadence: 2 },
    );
    expect(totalReviewItems(stream)).toBe(DEFAULT_MAX_INJECTED);
  });

  it("graded reviews update the half-life shared with /review", () => {
    const ref = makeRef("v-shared", "olá", "hello");
    const seeded = enrollItem(emptyState(), ref, NOW);
    const afterRecall = applyRecall(seeded, "demo", ref.itemId, "easy", NOW + 1_000);
    const record = afterRecall.record;
    expect(record.halfLifeMs).toBeGreaterThan(INITIAL_HALF_LIFE_MS);
    expect(record.halfLifeMs).toBeLessThanOrEqual(180 * 24 * 60 * 60 * 1000);
    expect(afterRecall.event.event).toBe("srs_recall");
  });

  it("clamps to AGAIN_RESET_HALF_LIFE_MS when graded 'again'", () => {
    const ref = makeRef("v-again", "adeus", "goodbye");
    const seeded = enrollItem(emptyState(), ref, NOW);
    const extended = applyRecall(seeded, "demo", ref.itemId, "easy", NOW + 1_000).state;
    const lapsed = applyRecall(extended, "demo", ref.itemId, "again", NOW + 2_000);
    expect(lapsed.record.halfLifeMs).toBe(AGAIN_RESET_HALF_LIFE_MS);
    expect(lapsed.record.lapses).toBe(1);
    expect(grades).toContain("again");
  });
});