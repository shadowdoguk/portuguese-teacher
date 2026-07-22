// Scenario briefing audio resolution. Issue #45.
//
// The ScenarioPlayer reads three audio assets for the pre-task stage:
//   - preTaskAudioAssetId → the briefing copy (read aloud as the third
//     caption block).
//   - goalAudioAssetId → the goal sentence (read aloud first).
//   - settingAudioAssetId → the setting narration (read aloud second).
//
// Asset IDs are optional on the Scenario type. When missing, we derive a
// deterministic ID from the scenario ID + field name so the v1 audio
// pipeline emits files at stable paths regardless of whether the seed
// data fills them in explicitly. This lets `pnpm assets:tts` work
// end-to-end against the existing 4 A0 scenarios without touching
// `seed-a0.ts`.

import type { Scenario } from "@/lib/curriculum/types";

export type BriefingField = "preTask" | "goal" | "setting";

export type BriefingAudioId = {
  scenarioId: string;
  unitId: string;
  field: BriefingField;
};

export const BRIEFING_FIELD_ORDER: ReadonlyArray<BriefingField> = [
  "goal",
  "setting",
  "preTask",
];

export const BRIEFING_FIELD_LABEL: Record<BriefingField, string> = {
  goal: "Goal",
  setting: "Setting",
  preTask: "Briefing",
};

/**
 * Deterministic asset ID. Used when the seed data didn't set an
 * explicit `preTaskAudioAssetId` / `goalAudioAssetId` /
 * `settingAudioAssetId`. Format: `scenario-<scenarioId>-<field>`.
 */
export function defaultBriefingAssetId(
  scenarioId: string,
  field: BriefingField,
): string {
  return `scenario-${scenarioId}-${field}`;
}

/**
 * Resolve the asset ID for a single briefing field, preferring the
 * Scenario's explicit value when present and falling back to the
 * deterministic default otherwise.
 */
export function briefingAssetIdFor(
  scenario: Scenario,
  field: BriefingField,
): string {
  const explicit =
    field === "preTask"
      ? scenario.preTaskAudioAssetId
      : field === "goal"
        ? scenario.goalAudioAssetId
        : scenario.settingAudioAssetId;
  return explicit ?? defaultBriefingAssetId(scenario.id, field);
}

/**
 * Resolve the briefing audio IDs in canonical playback order
 * (goal → setting → preTask). Skips fields with empty copy so a
 * blank `preTask` doesn't pad the briefing with silence.
 */
export function briefingAudioIdsFor(
  scenario: Scenario,
): ReadonlyArray<BriefingAudioId> {
  const out: BriefingAudioId[] = [];
  for (const field of BRIEFING_FIELD_ORDER) {
    const text = briefingTextFor(scenario, field);
    if (!text.trim()) continue;
    out.push({ scenarioId: scenario.id, unitId: scenario.unitId, field });
  }
  return out;
}

export function briefingTextFor(
  scenario: Scenario,
  field: BriefingField,
): string {
  if (field === "goal") return scenario.goal;
  if (field === "setting") return scenario.setting;
  return scenario.preTask;
}

/**
 * The full briefing copy as a single string, in playback order, with
 * each segment separated by a sentence boundary so the TTS engine
 * produces natural pauses.
 */
export function briefingFullText(scenario: Scenario): string {
  return briefingAudioIdsFor(scenario)
    .map((id) => briefingTextFor(scenario, id.field).trim())
    .filter(Boolean)
    .join(". ");
}