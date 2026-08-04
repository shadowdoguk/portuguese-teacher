import {
  resolveRemediationPlan,
  unitsAtLevel,
  type AnchorMastery,
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
  options: { affectiveFilterScore?: number } = {},
): AssessmentOutcome {
  const perSkillScores = computeSkillScores(items, answers);
  const overall = overallScore(perSkillScores);
  const passed = overall >= milestone.passingScore;

  const anchorUnitIds: string[] = [];
  const anchorSteps: Array<{
    unitId: string;
    gapArea: "vocab" | "grammar" | "pronunciation" | "fluency";
    reason: "phoneme-confusion" | "grammar-gap" | "vocabulary-decay" | "scenario-struggle";
    weight: number;
    priority: number;
    scaffolded: boolean;
  }> = [];
  if (!passed) {
    const plan = resolveRemediationPlan(index, milestone.unitId, {
      learnerMastery: assessmentMasteryFromScores(perSkillScores),
      affectiveFilterScore: options.affectiveFilterScore,
      maxDepth: 5,
    });
    for (const step of plan.steps) {
      anchorUnitIds.push(step.unitId);
      anchorSteps.push({
        unitId: step.unitId,
        gapArea: step.anchor.gapArea,
        reason: step.anchor.reason,
        weight: step.anchor.weight,
        priority: step.priority,
        scaffolded: step.scaffolded,
      });
    }
  }

  const rationaleParts: string[] = [];
  rationaleParts.push(`overall ${(overall * 100).toFixed(0)}% vs pass ${(milestone.passingScore * 100).toFixed(0)}%`);
  const weakest = weakestSkill(perSkillScores);
  rationaleParts.push(`weakest skill ${weakest} at ${(perSkillScores[weakest] * 100).toFixed(0)}%`);

  return {
    perSkillScores,
    overallScore: overall,
    passed,
    recommendedAnchorUnitIds: anchorUnitIds,
    recommendedAnchorSteps: anchorSteps,
    rationale: rationaleParts.join("; "),
  };
}

/**
 * Map the four assessment skills onto the four RemedialAnchor gapAreas
 * (vocab | grammar | pronunciation | fluency). Used to derive a
 * learner-mastery signal from the per-skill scores of a failed Milestone
 * so `resolveRemediationPlan` can rank anchors by gap-area weakness.
 */
export function assessmentMasteryFromScores(
  perSkillScores: AssessmentSkillScores,
): AnchorMastery {
  return {
    vocab: (perSkillScores.reading + perSkillScores.writing) / 2,
    grammar: perSkillScores.writing,
    pronunciation: (perSkillScores.listening + perSkillScores.speaking) / 2,
    fluency: perSkillScores.speaking,
  };
}

function collectRemedialAnchorUnitIds(
  milestone: Milestone,
  index: CurriculumIndex,
  perSkillScores: AssessmentSkillScores,
  affectiveFilterScore: number | undefined,
): string[] {
  const plan = resolveRemediationPlan(index, milestone.unitId, {
    learnerMastery: assessmentMasteryFromScores(perSkillScores),
    affectiveFilterScore,
    maxDepth: 5,
  });
  return plan.steps.map((step) => step.unitId);
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
