import { LEVELS, type Level, type Scenario } from "@/lib/curriculum/types";

export type ScenarioLevelMatch = "core" | "stretch" | "review";

export type LevelMismatch = {
  match: ScenarioLevelMatch;
  /** Signed distance: positive = scenario is harder than the Learner. */
  distance: number;
  /** Human-readable label for the badge. */
  label: string;
  /** One-line suggestion for the AI Teacher to relay. */
  guidance: string;
};

const LABELS: Record<ScenarioLevelMatch, string> = {
  core: "Core practice",
  stretch: "Stretch",
  review: "Review",
};

const STRETCH_GUIDANCE =
  "This scenario is at a higher CEFR level than your current placement. Take it slowly — scaffolding will surface vocabulary hints and slower pacing. Consider visiting the remedial anchor first if you feel unsure.";
const REVIEW_GUIDANCE =
  "This scenario is well below your current CEFR level. It will move quickly. If you'd rather push forward, swap to a stretch scenario from the library instead.";
const CORE_GUIDANCE = "This scenario matches your current CEFR level.";

function levelIndex(level: Level): number {
  const idx = LEVELS.indexOf(level);
  return idx < 0 ? 0 : idx;
}

export function levelDistance(learnerLevel: Level, scenario: Pick<Scenario, "targetLevel">): number {
  return levelIndex(scenario.targetLevel) - levelIndex(learnerLevel);
}

export function levelMismatch(
  learnerLevel: Level,
  scenario: Pick<Scenario, "targetLevel">,
): LevelMismatch {
  const distance = levelDistance(learnerLevel, scenario);
  let match: ScenarioLevelMatch;
  let guidance: string;
  if (distance >= 1) {
    match = "stretch";
    guidance = STRETCH_GUIDANCE;
  } else if (distance <= -2) {
    match = "review";
    guidance = REVIEW_GUIDANCE;
  } else {
    match = "core";
    guidance = CORE_GUIDANCE;
  }
  return {
    match,
    distance,
    label: LABELS[match],
    guidance,
  };
}

export type AdaptedVocabHint = {
  itemId: string;
  known: boolean;
};

export function partitionScenarioVocab(
  scenario: Pick<Scenario, "vocabularyRefs">,
  knownVocabIds: ReadonlySet<string>,
): ReadonlyArray<AdaptedVocabHint> {
  return scenario.vocabularyRefs.map((itemId) => ({
    itemId,
    known: knownVocabIds.has(itemId),
  }));
}

export type AdaptedPreTask = {
  /** Vocabulary hints split into known vs unknown, in scenario order. */
  knownVocab: ReadonlyArray<string>;
  unknownVocab: ReadonlyArray<string>;
  /** True when at least one vocabulary item is still unknown. */
  hasUnknown: boolean;
};

export function adaptPreTask(
  scenario: Pick<Scenario, "vocabularyRefs">,
  knownVocabIds: ReadonlySet<string>,
): AdaptedPreTask {
  const known: string[] = [];
  const unknown: string[] = [];
  for (const ref of scenario.vocabularyRefs) {
    if (knownVocabIds.has(ref)) known.push(ref);
    else unknown.push(ref);
  }
  return {
    knownVocab: known,
    unknownVocab: unknown,
    hasUnknown: unknown.length > 0,
  };
}