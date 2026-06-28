import { A0_CURRICULUM, indexCurriculum, type Lesson, type PracticeExercise, type Unit } from "@/lib/curriculum";
import type { SrsItemRef, SrsReviewRecord, SrsState } from "@/lib/srs/types";
import { dueQueue, type DueItem } from "@/lib/srs/scheduler";

export type LessonExerciseKind = "authored" | "review";

export type AuthoredLessonExercise = {
  kind: "authored";
  id: string;
  position: number;
  exercise: PracticeExercise;
};

export type ReviewLessonExercise = {
  kind: "review";
  id: string;
  position: number;
  ref: SrsItemRef;
  record: SrsReviewRecord;
};

export type LessonExercise = AuthoredLessonExercise | ReviewLessonExercise;

export type InterleaveOptions = {
  /** Maximum SRS items to inject into the lesson. Default 3 (per FR-LP-2). */
  maxInjected?: number;
  /** Insert one SRS item every N authored exercises. Default 2. */
  cadence?: number;
};

export const DEFAULT_MAX_INJECTED = 3;
export const DEFAULT_INTERLEAVE_CADENCE = 2;

export function getLessonFromCurriculum(lessonId: string, unit?: Unit): Lesson | undefined {
  if (unit) {
    const direct = unit.lessons.find((l) => l.id === lessonId);
    if (direct) return direct;
  }
  const index = indexCurriculum(A0_CURRICULUM);
  for (const candidate of index.unitsById.values()) {
    const found = candidate.lessons.find((l) => l.id === lessonId);
    if (found) return found;
  }
  return undefined;
}

export function findUnitForLesson(lessonId: string): Unit | undefined {
  const index = indexCurriculum(A0_CURRICULUM);
  for (const unit of index.unitsById.values()) {
    if (unit.lessons.some((lesson) => lesson.id === lessonId)) return unit;
  }
  return undefined;
}

export function dueQueueItemsForLesson(
  state: SrsState,
  refs: ReadonlyArray<SrsItemRef>,
  now: number,
  options: InterleaveOptions = {},
): DueItem[] {
  const max = options.maxInjected ?? DEFAULT_MAX_INJECTED;
  return dueQueue(state, { refs, now, limit: max });
}

/**
 * Interleave the authored exercises with the SRS review items.
 *
 * Insert one review item every `cadence` authored exercises (default 2),
 * capped at `maxInjected` reviews (default 3). Authored items always keep
 * their authored position; reviews fill the gaps. The cap prevents a
 * Learner with a long review queue from having their Lesson hijacked by
 * the SRS scheduler.
 */
export function interleaveSrsItems(
  authored: ReadonlyArray<PracticeExercise>,
  srsDue: ReadonlyArray<DueItem>,
  options: InterleaveOptions = {},
): LessonExercise[] {
  const max = options.maxInjected ?? DEFAULT_MAX_INJECTED;
  const cadence = Math.max(1, options.cadence ?? DEFAULT_INTERLEAVE_CADENCE);
  const reviews = srsDue.slice(0, max);
  const out: LessonExercise[] = [];

  let reviewIdx = 0;
  for (let i = 0; i < authored.length; i += 1) {
    const exercise = authored[i];
    if (!exercise) continue;
    out.push({
      kind: "authored",
      id: exercise.id,
      position: out.length,
      exercise,
    });
    const shouldInsert =
      reviewIdx < reviews.length && (i + 1) % cadence === 0;
    if (shouldInsert) {
      const due = reviews[reviewIdx];
      reviewIdx += 1;
      if (due) {
        out.push({
          kind: "review",
          id: `srs-${due.ref.itemId}-${out.length}`,
          position: out.length,
          ref: due.ref,
          record: due.record,
        });
      }
    }
  }
  return out;
}

export function totalReviewItems(stream: ReadonlyArray<LessonExercise>): number {
  return stream.filter((item) => item.kind === "review").length;
}

export function totalAuthoredItems(stream: ReadonlyArray<LessonExercise>): number {
  return stream.filter((item) => item.kind === "authored").length;
}