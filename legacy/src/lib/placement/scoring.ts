import {
  LEVELS,
  unitsAtLevel,
  type Curriculum,
  type CurriculumIndex,
  type Level,
  type Unit,
} from "@/lib/curriculum";
import {
  PlacementError,
  type PlacementAnswer,
  type PlacementConfirmOutcome,
  type PlacementItem,
  type PlacementOutcome,
  type PlacementSkill,
  type PlacementSkillScores,
} from "./types";
import { bucketToLevel, levelToBucket } from "./selector";

const SKILL_ORDER: ReadonlyArray<PlacementSkill> = ["listening", "reading", "speaking"];

function emptySkillScores(): PlacementSkillScores {
  return { listening: 0, reading: 0, speaking: 0 };
}

function average(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function computeSkillScores(
  items: ReadonlyArray<PlacementItem>,
  answers: ReadonlyArray<PlacementAnswer>,
): PlacementSkillScores {
  const buckets: Record<PlacementSkill, number[]> = {
    listening: [],
    reading: [],
    speaking: [],
  };

  for (const answer of answers) {
    const item = items.find((candidate) => candidate.id === answer.itemId);
    if (!item) continue;
    buckets[item.skill].push(answer.score);
  }

  return {
    listening: average(buckets.listening),
    reading: average(buckets.reading),
    speaking: average(buckets.speaking),
  };
}

export function overallScore(skillScores: PlacementSkillScores): number {
  return average(SKILL_ORDER.map((skill) => skillScores[skill]));
}

function bucketFromScore(score: number): number {
  if (score >= 0.75) return 2;
  if (score >= 0.5) return 1;
  if (score >= 0.25) return 0;
  return 0;
}

function pickUnitAtBucket(
  index: CurriculumIndex,
  bucket: number,
  prefer: "first" | "last",
): Unit | undefined {
  const level = bucketToLevel(bucket);
  const units = unitsAtLevel(index, level);
  if (units.length === 0) return undefined;
  if (prefer === "last") return units[units.length - 1];
  return units[0];
}

function clampBucketToCurriculum(
  index: CurriculumIndex,
  bucket: number,
): number {
  for (let offset = 0; offset < LEVELS.length; offset += 1) {
    const upBucket = bucket + offset;
    if (upBucket < LEVELS.length && unitsAtLevel(index, LEVELS[upBucket] as Level).length > 0) {
      return upBucket;
    }
    if (offset === 0) continue;
    const downBucket = bucket - offset;
    if (downBucket >= 0 && unitsAtLevel(index, LEVELS[downBucket] as Level).length > 0) {
      return downBucket;
    }
  }
  return Math.max(0, Math.min(LEVELS.length - 1, bucket));
}

export function recommendStartUnit(
  index: CurriculumIndex,
  selfAssessedLevel: Exclude<Level, "A0">,
  perSkillScores: PlacementSkillScores,
): { unitId: string; level: Level; rationale: string } {
  const overall = overallScore(perSkillScores);
  const skillLowest = SKILL_ORDER.reduce(
    (lowest, skill) => (perSkillScores[skill] < perSkillScores[lowest] ? skill : lowest),
    SKILL_ORDER[0]!,
  );

  const selfBucket = levelToBucket(selfAssessedLevel);
  const scoreBucket = bucketFromScore(overall);
  const weakestSkillBucket = bucketFromScore(perSkillScores[skillLowest]);

  let targetBucket = scoreBucket;
  if (perSkillScores[skillLowest] <= 0.3) {
    targetBucket = Math.min(targetBucket, weakestSkillBucket);
  }

  targetBucket = Math.min(targetBucket, selfBucket);

  const clamped = clampBucketToCurriculum(index, targetBucket);
  const level = bucketToLevel(clamped);
  const prefer: "first" | "last" = overall >= 0.75 ? "last" : "first";
  const unit = pickUnitAtBucket(index, clamped, prefer);

  if (!unit) {
    throw new PlacementError(`No unit available for recommended level ${level}`);
  }

  const rationaleParts: string[] = [];
  rationaleParts.push(
    `overall ${(overall * 100).toFixed(0)}% across ${SKILL_ORDER.length} skills`,
  );
  rationaleParts.push(`self-assessment ${selfAssessedLevel}`);
  if (perSkillScores[skillLowest] <= 0.3) {
    rationaleParts.push(`weakest skill ${skillLowest} at ${(perSkillScores[skillLowest] * 100).toFixed(0)}%`);
  }

  return {
    unitId: unit.id,
    level,
    rationale: rationaleParts.join("; "),
  };
}

export function buildPlacementOutcome(
  curriculum: Curriculum,
  index: CurriculumIndex,
  selfAssessedLevel: Exclude<Level, "A0">,
  items: ReadonlyArray<PlacementItem>,
  answers: ReadonlyArray<PlacementAnswer>,
): PlacementOutcome {
  const perSkillScores = computeSkillScores(items, answers);
  const overall = overallScore(perSkillScores);
  const recommendation = recommendStartUnit(index, selfAssessedLevel, perSkillScores);
  return {
    perSkillScores,
    overallScore: overall,
    recommendedStartUnitId: recommendation.unitId,
    recommendedStartLevel: recommendation.level,
    rationale: recommendation.rationale,
  };
}

export type ConfirmOptions = {
  learnerAccepted: boolean;
  overrideUnitId?: string;
};

export function buildConfirmOutcome(
  outcome: PlacementOutcome,
  options: ConfirmOptions,
  now: () => string = () => new Date().toISOString(),
): PlacementConfirmOutcome {
  const confirmedStartUnitId =
    options.learnerAccepted || !options.overrideUnitId
      ? outcome.recommendedStartUnitId
      : options.overrideUnitId;
  return {
    ...outcome,
    learnerAccepted: options.learnerAccepted,
    confirmedStartUnitId,
    confirmedAt: now(),
  };
}

export function requiresPlacement(selfAssessedLevel: Level): selfAssessedLevel is Exclude<Level, "A0"> {
  return selfAssessedLevel !== "A0";
}
