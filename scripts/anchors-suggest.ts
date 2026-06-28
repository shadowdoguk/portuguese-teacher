/**
 * anchors:suggest — propose Remedial Anchors for a Unit from synthetic
 * gap-area data.
 *
 * Reads the canonical A0 curriculum, finds reachable prior Units, and
 * emits a markdown report proposing `RemedialAnchor` records for the
 * given Unit (default: A0.4 'Rotina e horas'). The proposals never
 * include forward edges (an anchor must point to a Unit that is
 * reachable *before* the anchor's source in the canonical DAG).
 *
 * Usage:
 *   pnpm anchors:suggest            # proposes for a0-4-rotina-e-horas
 *   pnpm anchors:suggest a0-3-cafe-pedidos
 *   pnpm anchors:suggest --json     # JSON output instead of markdown
 *
 * Synthetic data:
 *   We model the platform-wide learner pool with a small synthetic
 *   distribution per gap area (vocab | grammar | pronunciation | fluency).
 *   Anchors whose gapArea is weak across the pool get the highest weight.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  A0_CURRICULUM,
  indexCurriculum,
  isReachable,
  assertCurriculumInvariants,
  type RemedialAnchorGapArea,
  type Unit,
} from "../src/lib/curriculum/index.js";

const REMEDIAL_ANCHOR_GAP_AREAS: readonly RemedialAnchorGapArea[] = [
  "vocab",
  "grammar",
  "pronunciation",
  "fluency",
];

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const positionalArgs = args.filter((arg) => !arg.startsWith("--"));
const targetUnitId = positionalArgs[0] ?? "a0-4-rotina-e-horas";

const index = indexCurriculum(A0_CURRICULUM);
assertCurriculumInvariants(A0_CURRICULUM);

const target = index.unitsById.get(targetUnitId);
if (!target) {
  console.error(`Unknown unit: ${targetUnitId}`);
  console.error("Available units:", A0_CURRICULUM.units.map((u) => u.id).join(", "));
  process.exit(1);
}

// Synthetic platform-wide gap-area mastery distribution.
// Lower number = wider weakness = anchor gets a higher weight.
const platformWeakness: Record<RemedialAnchorGapArea, number> = {
  vocab: 0.62,
  grammar: 0.45,
  pronunciation: 0.71,
  fluency: 0.55,
};

function weaknessFor(area: RemedialAnchorGapArea): number {
  return platformWeakness[area];
}

function reasonFor(area: RemedialAnchorGapArea) {
  switch (area) {
    case "vocab":
      return "vocabulary-decay";
    case "grammar":
      return "grammar-gap";
    case "pronunciation":
      return "phoneme-confusion";
    case "fluency":
      return "scenario-struggle";
  }
}

function proposalsFor(unit: Unit): Array<{
  fromUnitId: string;
  toUnitId: string;
  reason: string;
  gapArea: RemedialAnchorGapArea;
  weight: number;
  note: string;
}> {
  const proposals: Array<{
    fromUnitId: string;
    toUnitId: string;
    reason: string;
    gapArea: RemedialAnchorGapArea;
    weight: number;
    note: string;
  }> = [];
  for (const candidate of A0_CURRICULUM.units) {
    if (candidate.id === unit.id) continue;
    if (!isReachable(index, candidate.id, unit.id)) continue;
    for (const area of REMEDIAL_ANCHOR_GAP_AREAS) {
      const weight = Math.round((1 - weaknessFor(area)) * 100) / 100;
      if (weight <= 0.2) continue;
      proposals.push({
        fromUnitId: unit.id,
        toUnitId: candidate.id,
        reason: reasonFor(area),
        gapArea: area,
        weight,
        note: `Synthetic proposal: platform-wide ${area} weakness ${(weaknessFor(area) * 100).toFixed(0)}%.`,
      });
    }
  }
  return proposals.sort((a, b) => b.weight - a.weight).slice(0, 6);
}

const proposals = proposalsFor(target);

if (asJson) {
  process.stdout.write(JSON.stringify({ targetUnitId, proposals }, null, 2) + "\n");
  process.exit(0);
}

const lines: string[] = [];
lines.push(`# Anchors suggest — ${targetUnitId}`);
lines.push("");
lines.push(
  `Target Unit: **${target.title}** (\`${target.id}\`) — level ${target.level}, order ${target.order}.`,
);
lines.push("");
lines.push("Existing anchors on this Unit:");
lines.push("");
if (target.remedialAnchors.length === 0) {
  lines.push("- (none)");
} else {
  for (const anchor of target.remedialAnchors) {
    lines.push(
      `- ${anchor.toUnitId} (${anchor.gapArea}, weight ${anchor.weight}, ${anchor.reason})`,
    );
  }
}
lines.push("");
lines.push("## Proposed anchors (synthetic platform-wide gap data)");
lines.push("");
lines.push("| toUnitId | gapArea | reason | weight |");
lines.push("| --- | --- | --- | --- |");
for (const proposal of proposals) {
  lines.push(
    `| ${proposal.toUnitId} | ${proposal.gapArea} | ${proposal.reason} | ${proposal.weight.toFixed(2)} |`,
  );
}
lines.push("");
lines.push(
  "Review and copy these into `src/lib/curriculum/seed-a0.ts` to author the anchor.",
);
lines.push("");

const out = lines.join("\n");
const outPath = resolve(repoRoot, `tmp/anchors-suggest-${targetUnitId}.md`);
writeFileSync(outPath, out, "utf8");

console.log(out);
console.log(`\nWritten: ${outPath}`);
console.log("Review the proposals, then paste the chosen rows into seed-a0.ts.");
console.log(
  "Re-run `pnpm typecheck && pnpm test && pnpm progress:check` after editing the curriculum.",
);
process.exit(0);