import {
  unitsAtLevel,
  type Curriculum,
  type CurriculumIndex,
  type Level,
  type LevelBoundary,
  type Milestone,
  type Unit,
} from "@/lib/curriculum";
import {
  AssessmentError,
  ASSESSMENT_SKILLS,
  type AssessmentAnswer,
  type AssessmentItem,
  type AssessmentOutcome,
  type AssessmentSkill,
  type AssessmentSkillScores,
} from "./types";
import { levelToBucket } from "./selector";

function emptySkillScores(): AssessmentSkillScores {
  return { listening: 0, reading: 0, writing: 0, speaking: 0 };
}

function average(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function computeSkillScores(
  items: ReadonlyArray<AssessmentItem>,
  answers: ReadonlyArray<AssessmentAnswer>,
): AssessmentSkillScores {
  const buckets: Record<AssessmentSkill, number[]> = {
    listening: [],
    reading: [],
    writing: [],
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
    writing: average(buckets.writing),
    speaking: average(buckets.speaking),
  };
}

export function overallScore(skillScores: AssessmentSkillScores): number {
  return average(ASSESSMENT_SKILLS.map((skill) => skillScores[skill]));
}

export function weakestSkill(
  skillScores: AssessmentSkillScores,
): AssessmentSkill {
  let weakest: AssessmentSkill = ASSESSMENT_SKILLS[0]!;
  for (const skill of ASSESSMENT_SKILLS) {
    if (skillScores[skill] < skillScores[weakest]) {
      weakest = skill;
    }
  }
  return weakest;
}

export function buildAssessmentOutcome(
  milestone: Milestone,
  index: CurriculumIndex,
  items: ReadonlyArray<AssessmentItem>,
  answers: ReadonlyArray<AssessmentAnswer>,
): AssessmentOutcome {
  const perSkillScores = computeSkillScores(items, answers);
  const overall = overallScore(perSkillScores);
  const passed = overall >= milestone.passingScore;

  const anchorUnitIds = passed
    ? []
    : collectRemedialAnchorUnitIds(milestone, index, perSkillScores);

  const rationaleParts: string[] = [];
  rationaleParts.push(`overall ${(overall * 100).toFixed(0)}% vs pass ${(milestone.passingScore * 100).toFixed(0)}%`);
  const weakest = weakestSkill(perSkillScores);
  rationaleParts.push(`weakest skill ${weakest} at ${(perSkillScores[weakest] * 100).toFixed(0)}%`);

  return {
    perSkillScores,
    overallScore: overall,
    passed,
    recommendedAnchorUnitIds: anchorUnitIds,
    rationale: rationaleParts.join("; "),
  };
}

function collectRemedialAnchorUnitIds(
  milestone: Milestone,
  index: CurriculumIndex,
  perSkillScores: AssessmentSkillScores,
): string[] {
  const weakest = weakestSkill(perSkillScores);
  const result = new Set<string>();
  for (const anchor of milestoneAnchorChains(milestone, index)) {
    if (anchorMatchesSkill(anchor, weakest)) {
      result.add(anchor.toUnitId);
    }
  }
  for (const anchor of milestoneAnchorChains(milestone, index)) {
    result.add(anchor.toUnitId);
  }
  return Array.from(result);
}

function anchorMatchesSkill(
  anchor: { reason: string; toUnitId: string; fromUnitId: string },
  weakest: AssessmentSkill,
): boolean {
  switch (anchor.reason) {
    case "phoneme-confusion":
      return weakest === "listening" || weakest === "speaking";
    case "grammar-gap":
      return weakest === "writing";
    case "vocabulary-decay":
      return weakest === "reading" || weakest === "writing";
    case "scenario-struggle":
      return weakest === "speaking";
    default:
      return false;
  }
}

type AnchorEdge = {
  fromUnitId: string;
  toUnitId: string;
  reason: "phoneme-confusion" | "grammar-gap" | "vocabulary-decay" | "scenario-struggle";
  note: string;
};

function milestoneAnchorChains(
  milestone: Milestone,
  index: CurriculumIndex,
): AnchorEdge[] {
  const start = index.unitsById.get(milestone.unitId);
  if (!start) return [];
  const edges: AnchorEdge[] = [];
  for (const unit of index.unitsById.values()) {
    for (const anchor of unit.remedialAnchors) {
      edges.push({
        fromUnitId: unit.id,
        toUnitId: anchor.toUnitId,
        reason: anchor.reason,
        note: anchor.note,
      });
    }
  }
  return edges.filter((edge) => edge.fromUnitId === milestone.unitId);
}

export function nextUnitAfterMilestone(
  index: CurriculumIndex,
  milestone: Milestone,
): { unit: Unit; level: Level } | undefined {
  const candidates = unitsAtLevel(index, milestone.toLevel);
  if (candidates.length === 0) return undefined;
  const sorted = [...candidates].sort((a, b) => a.order - b.order);
  const first = sorted[0];
  if (!first) return undefined;
  return { unit: first, level: first.level };
}

export function milestoneByBoundary(
  curriculum: Curriculum,
  boundary: LevelBoundary,
): Milestone | undefined {
  return curriculum.milestones.find((m) => m.boundary === boundary);
}

export function isLevelBoundary(value: string): value is LevelBoundary {
  return ["A0-A1", "A1-A2", "A2-B1"].includes(value);
}
