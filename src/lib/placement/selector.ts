import {
  LEVELS,
  type Curriculum,
  type Level,
  type PracticeExercise,
  type PracticeExerciseKind,
} from "@/lib/curriculum";
import {
  PLACEMENT_ADVANCE_THRESHOLD,
  PLACEMENT_INITIAL_BATCH,
  PLACEMENT_MAX_ITEMS,
  PLACEMENT_MIN_ITEMS,
  PLACEMENT_REGRESS_THRESHOLD,
  PlacementError,
  type PlacementAnswer,
  type PlacementItem,
  type PlacementItemKind,
  type PlacementItemScore,
  type PlacementSkill,
} from "./types";

const KIND_TO_PLACEMENT: Readonly<Record<PracticeExerciseKind, PlacementItemKind | null>> = {
  flashcard: "reading",
  "fill-in": "reading",
  "listen-and-repeat": "listening",
  "role-play": "free-response",
  "free-response": "free-response",
  "pronunciation-drill": "listening",
  "scenario-turn": "free-response",
};

const KIND_TO_SKILL: Readonly<Record<PracticeExerciseKind, PlacementSkill | null>> = {
  flashcard: "reading",
  "fill-in": "reading",
  "listen-and-repeat": "listening",
  "role-play": "speaking",
  "free-response": "speaking",
  "pronunciation-drill": "speaking",
  "scenario-turn": "speaking",
};

export function levelToBucket(level: Level): number {
  return LEVELS.indexOf(level);
}

export function bucketToLevel(bucket: number): Level {
  const clamped = Math.max(0, Math.min(LEVELS.length - 1, Math.trunc(bucket)));
  return LEVELS[clamped] as Level;
}

function classifyExercise(exercise: PracticeExercise): {
  kind: PlacementItemKind;
  skill: PlacementSkill;
} | null {
  const kind = KIND_TO_PLACEMENT[exercise.kind];
  const skill = KIND_TO_SKILL[exercise.kind];
  if (!kind || !skill) return null;
  return { kind, skill };
}

export function collectPlacementPool(curriculum: Curriculum): PlacementItem[] {
  const pool: PlacementItem[] = [];
  for (const unit of curriculum.units) {
    const bucket = levelToBucket(unit.level);
    for (const lesson of unit.lessons) {
      for (const exercise of lesson.exercises) {
        const classified = classifyExercise(exercise);
        if (!classified) continue;
        pool.push({
          id: `${unit.id}::${exercise.id}`,
          sourceExerciseId: exercise.id,
          sourceUnitId: unit.id,
          sourceLessonId: lesson.id,
          kind: classified.kind,
          skill: classified.skill,
          difficulty: exercise.difficulty,
          prompt: exercise.prompt,
          expectedAnswer: exercise.expectedAnswer,
          levelBucket: bucket,
        });
      }
    }
  }
  return pool;
}

function pickFromBucket(
  pool: ReadonlyArray<PlacementItem>,
  bucket: number,
  count: number,
  used: ReadonlySet<string>,
): PlacementItem[] {
  return pool.filter((item) => item.levelBucket === bucket && !used.has(item.id)).slice(0, count);
}

function nearestBucketWithItems(
  pool: ReadonlyArray<PlacementItem>,
  targetBucket: number,
  used: ReadonlySet<string>,
): number | null {
  for (let offset = 0; offset < LEVELS.length; offset += 1) {
    const upBucket = targetBucket + offset;
    if (upBucket < LEVELS.length && pickFromBucket(pool, upBucket, 1, used).length > 0) {
      return upBucket;
    }
    if (offset === 0) continue;
    const downBucket = targetBucket - offset;
    if (downBucket >= 0 && pickFromBucket(pool, downBucket, 1, used).length > 0) {
      return downBucket;
    }
  }
  return null;
}

function decorateIds(items: ReadonlyArray<PlacementItem>): PlacementItem[] {
  return items.map((item, index) => ({
    ...item,
    id: `placement-${index + 1}-${item.sourceExerciseId}`,
  }));
}

export function startPlacementSession(
  curriculum: Curriculum,
  selfAssessedLevel: Exclude<Level, "A0">,
): PlacementItem[] {
  const pool = collectPlacementPool(curriculum);
  if (pool.length === 0) {
    throw new PlacementError("Curriculum has no placement-eligible exercises");
  }

  const targetBucket = levelToBucket(selfAssessedLevel);
  const used = new Set<string>();
  const bucket = nearestBucketWithItems(pool, targetBucket, used);
  if (bucket === null) {
    throw new PlacementError("Curriculum has no placement-eligible exercises at any level");
  }

  const initial = pickFromBucket(pool, bucket, PLACEMENT_INITIAL_BATCH, used);
  if (initial.length < PLACEMENT_INITIAL_BATCH) {
    const fallback = pool.filter((item) => !used.has(item.id)).slice(0, PLACEMENT_INITIAL_BATCH - initial.length);
    initial.push(...fallback);
  }
  return decorateIds(initial);
}

export function nextPlacementBucket(
  currentBucket: number,
  answers: ReadonlyArray<PlacementAnswer>,
): number {
  if (answers.length === 0) return currentBucket;
  const avg = averageScore(answers);
  if (avg >= PLACEMENT_ADVANCE_THRESHOLD) {
    return Math.min(LEVELS.length - 1, currentBucket + 1);
  }
  if (avg <= PLACEMENT_REGRESS_THRESHOLD) {
    return Math.max(0, currentBucket - 1);
  }
  return currentBucket;
}

export function averageScore(answers: ReadonlyArray<PlacementAnswer>): number {
  if (answers.length === 0) return 0;
  const total = answers.reduce((sum, a) => sum + a.score, 0);
  return total / answers.length;
}

export function extendPlacementItems(
  curriculum: Curriculum,
  currentItems: ReadonlyArray<PlacementItem>,
  answers: ReadonlyArray<PlacementAnswer>,
  batchSize: number = 4,
): PlacementItem[] {
  const pool = collectPlacementPool(curriculum);
  const used = new Set(currentItems.map((item) => `${item.sourceUnitId}::${item.sourceExerciseId}`));

  const lastBucket = currentItems.length > 0 ? currentItems[currentItems.length - 1]!.levelBucket : 0;
  const targetBucket = nextPlacementBucket(lastBucket, answers);

  const picks = pickFromBucket(pool, targetBucket, batchSize, used);
  if (picks.length < batchSize) {
    const fallback = pool.filter((item) => !used.has(item.id)).slice(0, batchSize - picks.length);
    picks.push(...fallback);
  }

  const combined = [...currentItems.map((item) => ({ ...item })), ...picks];
  return decorateIds(combined).slice(0, PLACEMENT_MAX_ITEMS);
}

export function shouldTerminate(
  currentItems: ReadonlyArray<PlacementItem>,
  answers: ReadonlyArray<PlacementAnswer>,
): boolean {
  if (currentItems.length >= PLACEMENT_MAX_ITEMS) return true;
  if (currentItems.length >= PLACEMENT_MIN_ITEMS && answers.length >= currentItems.length) return true;
  return false;
}

export function placementItem(
  curriculum: Curriculum,
  itemId: string,
): PlacementItem | undefined {
  return collectPlacementPool(curriculum).find((item) => item.id === itemId);
}

export function scoreAnswer(score: PlacementItemScore): PlacementItemScore {
  return score;
}

export const PLACEMENT_LIMITS = {
  min: PLACEMENT_MIN_ITEMS,
  max: PLACEMENT_MAX_ITEMS,
  initialBatch: PLACEMENT_INITIAL_BATCH,
  advanceThreshold: PLACEMENT_ADVANCE_THRESHOLD,
  regressThreshold: PLACEMENT_REGRESS_THRESHOLD,
} as const;
