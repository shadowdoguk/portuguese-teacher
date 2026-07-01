import type { Scenario } from "./types";
import { SCENARIO_LIBRARY } from "@/lib/scenarios/library";

/**
 * Library scenarios wired to the A1/A2/B1 Unit seeds defined in
 * `seed-a1.ts`, `seed-a2.ts`, and `seed-b1.ts`.
 *
 * The in-memory `SCENARIO_LIBRARY` carries 100 scenarios across 21
 * Unit IDs (Session 9, PR #98). The DB seed only writes 4 of them —
 * the 4 A0 scenarios whose Unit IDs match `seed-a0.ts`. The other
 * 96 scenarios target Unit IDs that the A1/A2/B1 seed files declare
 * but never populate with content (the v1 minimum-viable content
 * surface — see ADR-0005 §"Deferred to v1.1").
 *
 * This module maps the library's Unit IDs to the seeds' Unit IDs and
 * exposes a `SCENARIOS_BY_UNIT_ID` lookup the seed files consume when
 * they build their `Unit.scenarios` arrays. Today the 4 seeded
 * A1/A2/B1 Unit IDs (a1-1-viagens, a1-2-alimentacao,
 * a2-1-rotina-trabalho, b1-1-gastronomia) account for 46 of the
 * remaining 96 scenarios; the other 50 reference Unit IDs that the
 * A1/A2/B1 seeds haven't authored yet (a1-2-mercearia, a2-1-compras,
 * etc.) and are out of scope for this slice.
 *
 * v1.1 expands the seed files to author those additional Unit IDs
 * (ADR-0005 §1 v1.1 deferrals — "additional A1/A2/B1 Units").
 */

export const SEEDED_A1_A2_B1_SCENARIO_UNIT_IDS = [
  "a1-1-viagens",
  "a1-2-alimentacao",
  "a2-1-rotina-trabalho",
  "b1-1-gastronomia",
] as const;

export const EXTENDED_SCENARIOS: ReadonlyArray<Scenario> = SCENARIO_LIBRARY.filter(
  (scenario) =>
    (SEEDED_A1_A2_B1_SCENARIO_UNIT_IDS as readonly string[]).includes(
      scenario.unitId,
    ),
);

export const SCENARIOS_BY_UNIT_ID: Readonly<Record<string, ReadonlyArray<Scenario>>> = (() => {
  const grouped: Record<string, Scenario[]> = {};
  for (const scenario of EXTENDED_SCENARIOS) {
    if (!grouped[scenario.unitId]) grouped[scenario.unitId] = [];
    grouped[scenario.unitId]!.push(scenario);
  }
  return grouped;
})();

export function scenariosForUnit(unitId: string): ReadonlyArray<Scenario> {
  return SCENARIOS_BY_UNIT_ID[unitId] ?? [];
}