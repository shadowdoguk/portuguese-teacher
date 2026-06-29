import { describe, expect, it } from "vitest";
import {
  BRIEFING_FIELD_LABEL,
  BRIEFING_FIELD_ORDER,
  briefingAssetIdFor,
  briefingAudioIdsFor,
  briefingFullText,
  briefingTextFor,
  defaultBriefingAssetId,
} from "@/lib/scenarios/briefing-audio";
import type { Scenario } from "@/lib/curriculum/types";

function buildScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "sc-cafe",
    unitId: "u1",
    category: "cafe-restaurant",
    targetLevel: "A0",
    goal: "Pedir uma bebida.",
    setting: "Café em Lisboa.",
    roles: { learner: "Cliente", teacher: "Empregado" },
    preTask: "Que horas são?",
    expectedTurns: 3,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: ["Cumprimenta o empregado."],
    passingScore: 0.6,
    ...overrides,
  };
}

describe("defaultBriefingAssetId", () => {
  it("returns a deterministic ID keyed on the scenario + field", () => {
    expect(defaultBriefingAssetId("sc-cafe", "goal")).toBe("scenario-sc-cafe-goal");
    expect(defaultBriefingAssetId("sc-cafe", "setting")).toBe(
      "scenario-sc-cafe-setting",
    );
    expect(defaultBriefingAssetId("sc-cafe", "preTask")).toBe(
      "scenario-sc-cafe-preTask",
    );
  });

  it("produces IDs that match the TTS pipeline source-asset path", () => {
    // The TTS pipeline (src/lib/assets/tts-pipeline.ts) calls
    // briefingAssetIdFor() in walkScenarioBriefing() — same call site,
    // same format. Pin the contract so any drift breaks loudly.
    const scenario = buildScenario();
    expect(briefingAssetIdFor(scenario, "goal")).toBe("scenario-sc-cafe-goal");
    expect(briefingAssetIdFor(scenario, "preTask")).toBe(
      "scenario-sc-cafe-preTask",
    );
  });
});

describe("briefingAssetIdFor", () => {
  it("prefers the explicit audioAssetId on the scenario when set", () => {
    const scenario = buildScenario({
      preTaskAudioAssetId: "custom-preTask",
      goalAudioAssetId: "custom-goal",
      settingAudioAssetId: "custom-setting",
    });
    expect(briefingAssetIdFor(scenario, "preTask")).toBe("custom-preTask");
    expect(briefingAssetIdFor(scenario, "goal")).toBe("custom-goal");
    expect(briefingAssetIdFor(scenario, "setting")).toBe("custom-setting");
  });

  it("falls back to the deterministic default when the explicit ID is absent", () => {
    const scenario = buildScenario({ goalAudioAssetId: undefined });
    expect(briefingAssetIdFor(scenario, "goal")).toBe("scenario-sc-cafe-goal");
  });
});

describe("briefingAudioIdsFor", () => {
  it("returns the canonical playback order (goal → setting → preTask)", () => {
    const ids = briefingAudioIdsFor(buildScenario());
    expect(ids.map((id) => id.field)).toEqual(["goal", "setting", "preTask"]);
    expect(ids[0]).toEqual({
      scenarioId: "sc-cafe",
      unitId: "u1",
      field: "goal",
    });
  });

  it("skips fields with empty copy so a blank preTask doesn't pad with silence", () => {
    const ids = briefingAudioIdsFor(buildScenario({ preTask: "   " }));
    expect(ids.map((id) => id.field)).toEqual(["goal", "setting"]);
  });

  it("skips fields with empty string", () => {
    const ids = briefingAudioIdsFor(buildScenario({ preTask: "" }));
    expect(ids.map((id) => id.field)).toEqual(["goal", "setting"]);
  });

  it("returns an empty array when every field is blank", () => {
    const ids = briefingAudioIdsFor(
      buildScenario({ goal: "", setting: "", preTask: "" }),
    );
    expect(ids).toEqual([]);
  });
});

describe("briefingTextFor", () => {
  it("returns the matching field from the scenario", () => {
    const scenario = buildScenario();
    expect(briefingTextFor(scenario, "goal")).toBe("Pedir uma bebida.");
    expect(briefingTextFor(scenario, "setting")).toBe("Café em Lisboa.");
    expect(briefingTextFor(scenario, "preTask")).toBe("Que horas são?");
  });
});

describe("briefingFullText", () => {
  it("concatenates the briefing fields in playback order with sentence boundaries", () => {
    expect(briefingFullText(buildScenario())).toBe(
      "Pedir uma bebida.. Café em Lisboa.. Que horas são?",
    );
  });

  it("omits blank fields from the concatenated text", () => {
    const text = briefingFullText(buildScenario({ preTask: "" }));
    expect(text).toBe("Pedir uma bebida.. Café em Lisboa.");
  });
});

describe("BRIEFING_FIELD_ORDER + BRIEFING_FIELD_LABEL", () => {
  it("exposes the canonical order so the player + pipeline stay aligned", () => {
    expect(BRIEFING_FIELD_ORDER).toEqual(["goal", "setting", "preTask"]);
  });

  it("exposes a human label for each field", () => {
    expect(BRIEFING_FIELD_LABEL.goal).toBe("Goal");
    expect(BRIEFING_FIELD_LABEL.setting).toBe("Setting");
    expect(BRIEFING_FIELD_LABEL.preTask).toBe("Briefing");
  });
});