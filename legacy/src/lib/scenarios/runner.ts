import type { Scenario, ScenarioStage, VoiceLoopTurn } from "./types";
import { scoreScenario } from "./library";

export type RunnerInput = {
  scenario: Scenario;
  history: ReadonlyArray<VoiceLoopTurn>;
  manualCompletion?: { criteriaMet: ReadonlyArray<boolean> };
  now?: () => number;
};

export type RunnerState = {
  scenarioId: string;
  stage: ScenarioStage;
  turnIndex: number;
  expectedTurns: number;
  startedAt: number | null;
  completedAt: number | null;
};

export type RunnerNextResult =
  | { kind: "advance"; state: RunnerState }
  | { kind: "completed"; state: RunnerState; stars: 0 | 1 | 2 | 3; passed: boolean; reasons: ReadonlyArray<string> };

const FINAL_STAGE: ScenarioStage = "post-task";

export function initialState(scenario: Scenario, now: number = Date.now()): RunnerState {
  return {
    scenarioId: scenario.id,
    stage: "pre-task",
    turnIndex: 0,
    expectedTurns: scenario.expectedTurns,
    startedAt: now,
    completedAt: null,
  };
}

export function advance(
  state: RunnerState,
  scenario: Scenario,
  history: ReadonlyArray<VoiceLoopTurn>,
  now: number = Date.now(),
): RunnerNextResult {
  const turnIndex = Math.min(history.length, scenario.expectedTurns);

  if (state.stage === "pre-task") {
    return {
      kind: "advance",
      state: { ...state, stage: "during-task", turnIndex },
    };
  }

  if (state.stage === "during-task") {
    if (turnIndex < scenario.expectedTurns) {
      return {
        kind: "advance",
        state: { ...state, turnIndex },
      };
    }
    return {
      kind: "advance",
      state: { ...state, stage: FINAL_STAGE, turnIndex },
    };
  }

  if (state.stage === "post-task") {
    return complete(state, scenario, history, now);
  }

  return { kind: "advance", state };
}

export function complete(
  state: RunnerState,
  scenario: Scenario,
  history: ReadonlyArray<VoiceLoopTurn>,
  now: number = Date.now(),
  manualCriteria?: ReadonlyArray<boolean>,
): RunnerNextResult {
  const criteriaMet = manualCriteria ?? inferCriteriaFromHistory(scenario, history);
  const breakdown = scoreScenario(scenario, criteriaMet);
  const completedAt = state.completedAt ?? now;
  return {
    kind: "completed",
    state: { ...state, stage: "post-task", completedAt },
    stars: breakdown.stars,
    passed: breakdown.passed,
    reasons: breakdown.reasons,
  };
}

export function inferCriteriaFromHistory(
  scenario: Scenario,
  history: ReadonlyArray<VoiceLoopTurn>,
): ReadonlyArray<boolean> {
  const learnerUtterances = history.map((turn) => turn.utteranceId);
  const turnCount = learnerUtterances.length;
  const comprehensionOkCount = history.filter((turn) => turn.comprehensionOk).length;
  const pronunciationAvg =
    history.length === 0
      ? 0
      : history.reduce((sum, turn) => sum + turn.pronunciationScore, 0) / history.length;

  return scenario.successCriteria.map((criterion) =>
    evaluateCriterion(criterion, {
      turnCount,
      comprehensionOkRatio: comprehensionOkCount / Math.max(1, history.length),
      pronunciationAvg,
    }),
  );
}

function evaluateCriterion(
  criterion: string,
  signals: { turnCount: number; comprehensionOkRatio: number; pronunciationAvg: number },
): boolean {
  const lower = criterion.toLowerCase();

  if (lower.includes("cumpriment") || lower.includes("saudaç") || lower.includes("despedid")) {
    return signals.turnCount >= 2 && signals.comprehensionOkRatio >= 0.5;
  }
  if (lower.includes("obrigad") || lower.includes("por favor") || lower.includes("desculp")) {
    return signals.turnCount >= 1;
  }
  if (lower.includes("pedir") || lower.includes("confirma")) {
    return signals.turnCount >= 2 && signals.pronunciationAvg >= 60;
  }
  if (lower.includes("pergunt")) {
    return signals.turnCount >= 2;
  }
  if (lower.includes("aceita")) {
    return signals.comprehensionOkRatio >= 0.6;
  }
  if (lower.includes("diz ") || lower.includes("usa ")) {
    return signals.turnCount >= 1;
  }
  return signals.turnCount >= 1 && signals.comprehensionOkRatio >= 0.5;
}

export type RemedialTrigger = {
  scenarioId: string;
  reason: "phoneme-confusion" | "grammar-gap" | "vocabulary-decay" | "scenario-struggle";
  toUnitId: string;
  note: string;
};

export function detectRemedialTriggers(
  scenario: Scenario,
  history: ReadonlyArray<VoiceLoopTurn>,
): ReadonlyArray<RemedialTrigger> {
  if (history.length < 2) return [];
  const lowComprehension = history.filter((t) => !t.comprehensionOk).length;
  const lowPronunciation = history.filter((t) => t.pronunciationScore < 60).length;

  const triggers: RemedialTrigger[] = [];
  if (lowComprehension / history.length > 0.5) {
    triggers.push({
      scenarioId: scenario.id,
      reason: "scenario-struggle",
      toUnitId: scenario.unitId,
      note: "Mais de metade das falas sem compreensão — considerar Remedial Anchor.",
    });
  }
  if (lowPronunciation / history.length > 0.4) {
    triggers.push({
      scenarioId: scenario.id,
      reason: "phoneme-confusion",
      toUnitId: scenario.unitId,
      note: "Pronúncia abaixo de 60 em mais de 40% das falas — rever fonemas.",
    });
  }
  for (const anchor of scenario.remedialAnchorRefs) {
    if (lowComprehension / history.length > 0.3) {
      triggers.push({
        scenarioId: scenario.id,
        reason: anchor.reason,
        toUnitId: anchor.toUnitId,
        note: anchor.note,
      });
    }
  }
  return triggers;
}
