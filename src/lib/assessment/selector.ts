import {
  LEVELS,
  type Curriculum,
  type Level,
  type LevelBoundary,
  type Milestone,
  type PracticeExercise,
  type PracticeExerciseKind,
} from "@/lib/curriculum";
import {
  ASSESSMENT_ADVANCE_THRESHOLD,
  ASSESSMENT_INITIAL_BATCH,
  ASSESSMENT_MAX_ITEMS,
  ASSESSMENT_MIN_ITEMS,
  ASSESSMENT_REGRESS_THRESHOLD,
  AssessmentError,
  type AssessmentAnswer,
  type AssessmentItem,
  type AssessmentItemKind,
  type AssessmentItemScore,
  type AssessmentSkill,
} from "./types";

const KIND_TO_ASSESSMENT: Readonly<Record<PracticeExerciseKind, AssessmentItemKind | null>> = {
  flashcard: "reading",
  "fill-in": "writing",
  "listen-and-repeat": "listening",
  "role-play": "speaking",
  "free-response": "writing",
  "pronunciation-drill": "listening",
  "scenario-turn": "speaking",
};

const KIND_TO_SKILL: Readonly<Record<PracticeExerciseKind, AssessmentSkill | null>> = {
  flashcard: "reading",
  "fill-in": "writing",
  "listen-and-repeat": "listening",
  "role-play": "speaking",
  "free-response": "writing",
  "pronunciation-drill": "listening",
  "scenario-turn": "speaking",
};

export function levelToBucket(level: Level): number {
  return LEVELS.indexOf(level);
}

function bucketToLevel(bucket: number): Level {
  const clamped = Math.max(0, Math.min(LEVELS.length - 1, Math.trunc(bucket)));
  return LEVELS[clamped] as Level;
}

function classifyExercise(exercise: PracticeExercise): {
  kind: AssessmentItemKind;
  skill: AssessmentSkill;
} | null {
  const kind = KIND_TO_ASSESSMENT[exercise.kind];
  const skill = KIND_TO_SKILL[exercise.kind];
  if (!kind || !skill) return null;
  return { kind, skill };
}

export function collectAssessmentPool(
  curriculum: Curriculum,
  boundary: LevelBoundary,
): AssessmentItem[] {
  const milestone = curriculum.milestones.find((m) => m.boundary === boundary);
  if (!milestone) {
    throw new AssessmentError(`No milestone registered for boundary ${boundary}`);
  }

  const fromBucket = levelToBucket(milestone.fromLevel);
  const toBucket = levelToBucket(milestone.toLevel);
  const candidateBuckets = new Set<number>([fromBucket, toBucket]);

  const fromUnitIds = new Set<string>([milestone.unitId]);
  for (const unit of curriculum.units) {
    if (unit.level === milestone.fromLevel || unit.level === milestone.toLevel) {
      fromUnitIds.add(unit.id);
    }
  }

  for (const unit of curriculum.units) {
    for (const anchor of unit.remedialAnchors) {
      if (fromUnitIds.has(anchor.toUnitId)) {
        fromUnitIds.add(unit.id);
      }
    }
  }

  const pool: AssessmentItem[] = [];
  for (const unit of curriculum.units) {
    if (!fromUnitIds.has(unit.id)) continue;
    const bucket = levelToBucket(unit.level);
    const inCandidateBucket = candidateBuckets.has(bucket);
    const isRemedialAnchor = inCandidateBucket || true;
    if (!isRemedialAnchor) continue;
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
          prompt: exercise.prompt,
          expectedAnswer: exercise.expectedAnswer,
          difficulty: exercise.difficulty,
          levelBucket: bucket,
        });
      }
    }
  }

  return pool;
}

function pickFromBucket(
  pool: ReadonlyArray<AssessmentItem>,
  bucket: number,
  count: number,
  used: ReadonlySet<string>,
  skill: AssessmentSkill | null,
): AssessmentItem[] {
  const candidates = pool.filter((item) => {
    if (used.has(item.id)) return false;
    if (item.levelBucket !== bucket) return false;
    if (skill && item.skill !== skill) return false;
    return true;
  });
  return candidates.slice(0, count);
}

function pickBalancedInitialBatch(
  pool: ReadonlyArray<AssessmentItem>,
  bucket: number,
  used: Set<string>,
  batchSize: number,
): AssessmentItem[] {
  const perSkill = Math.max(1, Math.floor(batchSize / 4));
  const picked: AssessmentItem[] = [];
  const skills: ReadonlyArray<AssessmentSkill> = ["listening", "reading", "writing", "speaking"];
  for (const skill of skills) {
    const picks = pickFromBucket(pool, bucket, perSkill, used, skill);
    for (const item of picks) {
      picked.push(item);
      used.add(item.id);
    }
  }
  const remaining = batchSize - picked.length;
  if (remaining > 0) {
    const extras = pickFromBucket(pool, bucket, remaining, used, null);
    for (const item of extras) {
      picked.push(item);
      used.add(item.id);
    }
  }
  return picked;
}

function nearestBucketWithItems(
  pool: ReadonlyArray<AssessmentItem>,
  targetBucket: number,
  used: ReadonlySet<string>,
): number | null {
  for (let offset = 0; offset < LEVELS.length; offset += 1) {
    const upBucket = targetBucket + offset;
    if (upBucket < LEVELS.length && pickFromBucket(pool, upBucket, 1, used, null).length > 0) {
      return upBucket;
    }
    if (offset === 0) continue;
    const downBucket = targetBucket - offset;
    if (downBucket >= 0 && pickFromBucket(pool, downBucket, 1, used, null).length > 0) {
      return downBucket;
    }
  }
  return null;
}

function decorateIds(items: ReadonlyArray<AssessmentItem>): AssessmentItem[] {
  return items.map((item, index) => ({
    ...item,
    id: `assess-${index + 1}-${item.sourceExerciseId}`,
  }));
}

export function startAssessmentSession(
  curriculum: Curriculum,
  milestone: Milestone,
): AssessmentItem[] {
  const pool = collectAssessmentPool(curriculum, milestone.boundary);
  if (pool.length === 0) {
    throw new AssessmentError(
      `No assessment items available for milestone ${milestone.boundary}`,
    );
  }

  const startBucket = levelToBucket(milestone.fromLevel);
  const used = new Set<string>();
  const bucket = nearestBucketWithItems(pool, startBucket, used);
  if (bucket === null) {
    throw new AssessmentError(
      `No assessment items found at any level for milestone ${milestone.boundary}`,
    );
  }

  const initial = pickBalancedInitialBatch(pool, bucket, used, ASSESSMENT_INITIAL_BATCH);
  if (initial.length < ASSESSMENT_INITIAL_BATCH) {
    const extras = pool.filter((item) => !used.has(item.id)).slice(0, ASSESSMENT_INITIAL_BATCH - initial.length);
    initial.push(...extras);
    for (const item of extras) used.add(item.id);
  }
  return decorateIds(initial);
}

export function nextAssessmentBucket(
  currentBucket: number,
  answers: ReadonlyArray<AssessmentAnswer>,
): number {
  if (answers.length === 0) return currentBucket;
  const avg = averageScore(answers);
  if (avg >= ASSESSMENT_ADVANCE_THRESHOLD) {
    return Math.min(LEVELS.length - 1, currentBucket + 1);
  }
  if (avg <= ASSESSMENT_REGRESS_THRESHOLD) {
    return Math.max(0, currentBucket - 1);
  }
  return currentBucket;
}

export function averageScore(answers: ReadonlyArray<AssessmentAnswer>): number {
  if (answers.length === 0) return 0;
  return answers.reduce((sum, a) => sum + a.score, 0) / answers.length;
}

export function extendAssessmentItems(
  curriculum: Curriculum,
  milestone: Milestone,
  currentItems: ReadonlyArray<AssessmentItem>,
  answers: ReadonlyArray<AssessmentAnswer>,
  batchSize: number = 5,
): AssessmentItem[] {
  const pool = collectAssessmentPool(curriculum, milestone.boundary);
  const used = new Set(currentItems.map((item) => `${item.sourceUnitId}::${item.sourceExerciseId}`));
  const lastBucket = currentItems.length > 0 ? currentItems[currentItems.length - 1]!.levelBucket : 0;
  const targetBucket = nextAssessmentBucket(lastBucket, answers);

  const picks = pickBalancedInitialBatch(pool, targetBucket, used, batchSize);
  if (picks.length < batchSize) {
    const extras = pool
      .filter((item) => !used.has(item.id))
      .slice(0, batchSize - picks.length);
    for (const item of extras) {
      picks.push(item);
      used.add(item.id);
    }
  }

  const combined = [...currentItems, ...picks];
  return decorateIds(combined).slice(0, ASSESSMENT_MAX_ITEMS);
}

export function shouldTerminateAssessment(
  currentItems: ReadonlyArray<AssessmentItem>,
  answers: ReadonlyArray<AssessmentAnswer>,
): boolean {
  if (currentItems.length >= ASSESSMENT_MAX_ITEMS) return true;
  if (currentItems.length >= ASSESSMENT_MIN_ITEMS && answers.length >= currentItems.length) return true;
  return false;
}

export function scoreAnswer(score: AssessmentItemScore): AssessmentItemScore {
  return score;
}

export const ASSESSMENT_LIMITS = {
  min: ASSESSMENT_MIN_ITEMS,
  max: ASSESSMENT_MAX_ITEMS,
  initialBatch: ASSESSMENT_INITIAL_BATCH,
  advanceThreshold: ASSESSMENT_ADVANCE_THRESHOLD,
  regressThreshold: ASSESSMENT_REGRESS_THRESHOLD,
} as const;
