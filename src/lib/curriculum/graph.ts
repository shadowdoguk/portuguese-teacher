import type {
  Curriculum,
  LearnerSkillMastery,
  Level,
  Milestone,
  RemedialAnchor,
  RemedialAnchorGapArea,
  Unit,
} from "./types";

export class CurriculumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurriculumError";
  }
}

type Index = {
  unitsById: Map<string, Unit>;
  unitsByLevel: Map<Level, Unit[]>;
  milestonesByBoundary: Map<Milestone["boundary"], Milestone>;
  prerequisites: Map<string, ReadonlyArray<string>>;
  dependents: Map<string, string[]>;
  entryUnitId: string;
};

function buildIndex(curriculum: Curriculum): Index {
  const unitsById = new Map<string, Unit>();
  const unitsByLevel = new Map<Level, Unit[]>();
  const prerequisites = new Map<string, ReadonlyArray<string>>();
  const dependents = new Map<string, string[]>();

  for (const unit of curriculum.units) {
    if (unitsById.has(unit.id)) {
      throw new CurriculumError(`Duplicate unit id: ${unit.id}`);
    }
    unitsById.set(unit.id, unit);

    const bucket = unitsByLevel.get(unit.level) ?? [];
    bucket.push(unit);
    unitsByLevel.set(unit.level, bucket);

    prerequisites.set(unit.id, unit.prerequisiteUnitIds);

    for (const prereqId of unit.prerequisiteUnitIds) {
      const bucket = dependents.get(prereqId) ?? [];
      bucket.push(unit.id);
      dependents.set(prereqId, bucket);
    }
  }

  if (unitsById.size !== curriculum.units.length) {
    throw new CurriculumError("Duplicate unit ids detected in curriculum");
  }

  if (!unitsById.has(curriculum.entryUnitId)) {
    throw new CurriculumError(`Entry unit ${curriculum.entryUnitId} is not present in curriculum`);
  }

  const milestonesByBoundary = new Map<Milestone["boundary"], Milestone>();
  for (const milestone of curriculum.milestones) {
    if (milestonesByBoundary.has(milestone.boundary)) {
      throw new CurriculumError(`Duplicate milestone for boundary: ${milestone.boundary}`);
    }
    if (!unitsById.has(milestone.unitId)) {
      throw new CurriculumError(
        `Milestone ${milestone.boundary} references missing unit ${milestone.unitId}`,
      );
    }
    milestonesByBoundary.set(milestone.boundary, milestone);
  }

  return {
    unitsById,
    unitsByLevel,
    milestonesByBoundary,
    prerequisites,
    dependents,
    entryUnitId: curriculum.entryUnitId,
  };
}

export function assertAllMilestonesPresent(index: CurriculumIndex): void {
  for (const boundary of ["A0-A1", "A1-A2", "A2-B1"] as const) {
    if (!index.milestonesByBoundary.has(boundary)) {
      throw new CurriculumError(`Missing milestone for boundary ${boundary}`);
    }
  }
}

export type CurriculumIndex = Index;

export function indexCurriculum(curriculum: Curriculum): CurriculumIndex {
  return buildIndex(curriculum);
}

export function getUnit(index: CurriculumIndex, unitId: string): Unit | undefined {
  return index.unitsById.get(unitId);
}

export function unitsAtLevel(index: CurriculumIndex, level: Level): Unit[] {
  return [...(index.unitsByLevel.get(level) ?? [])];
}

export function entryUnit(index: CurriculumIndex): Unit {
  const unit = index.unitsById.get(index.entryUnitId);
  if (!unit) {
    throw new CurriculumError(`Entry unit ${index.entryUnitId} is not present in curriculum`);
  }
  return unit;
}

export function topologicalLevels(index: CurriculumIndex): Level[] {
  const levels = new Set<Level>();
  for (const unit of index.unitsById.values()) {
    levels.add(unit.level);
  }
  return Array.from(levels).sort();
}

export function assertCurriculumInvariants(curriculum: Curriculum): void {
  const index = buildIndex(curriculum);

  assertDagAcyclic(index);
  assertPrerequisitesReferenceExistingUnits(index);
  assertMilestonesReferenceBoundaryUnits(index);
  assertUnitOrderMonotonic(index);
  assertRemedialAnchorsAcyclic(curriculum);
  assertRemedialAnchorsPointBackward(index);
  assertAllLessonsReachableFromEntry(index);
}

function assertDagAcyclic(index: CurriculumIndex): void {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const id of index.unitsById.keys()) color.set(id, WHITE);

  function visit(id: string): void {
    const c = color.get(id);
    if (c === GRAY) {
      throw new CurriculumError(`Cycle detected in canonical DAG at unit ${id}`);
    }
    if (c === BLACK) return;
    color.set(id, GRAY);
    for (const dep of index.dependents.get(id) ?? []) visit(dep);
    color.set(id, BLACK);
  }

  for (const id of index.unitsById.keys()) {
    if (color.get(id) === WHITE) visit(id);
  }
}

function assertPrerequisitesReferenceExistingUnits(index: CurriculumIndex): void {
  for (const [unitId, prereqs] of index.prerequisites) {
    for (const prereqId of prereqs) {
      if (prereqId === unitId) {
        throw new CurriculumError(`Unit ${unitId} lists itself as a prerequisite`);
      }
      if (!index.unitsById.has(prereqId)) {
        throw new CurriculumError(`Unit ${unitId} references missing prerequisite ${prereqId}`);
      }
    }
  }
}

function assertMilestonesReferenceBoundaryUnits(index: CurriculumIndex): void {
  for (const milestone of index.milestonesByBoundary.values()) {
    const unit = index.unitsById.get(milestone.unitId);
    if (!unit) continue;
    if (unit.level !== milestone.fromLevel) {
      throw new CurriculumError(
        `Milestone ${milestone.boundary} unit ${unit.id} is at level ${unit.level}, expected ${milestone.fromLevel}`,
      );
    }
  }
}

function assertUnitOrderMonotonic(index: CurriculumIndex): void {
  for (const [, units] of index.unitsByLevel) {
    const sorted = [...units].sort((a, b) => a.order - b.order);
    for (let i = 0; i < units.length; i += 1) {
      if (units[i]?.id !== sorted[i]?.id) {
        throw new CurriculumError(
          `Units at the same level must be sorted by \`order\`; found ${units
            .map((u) => `${u.id}:${u.order}`)
            .join(", ")}`,
        );
      }
    }
  }
}

function assertRemedialAnchorsAcyclic(curriculum: Curriculum): void {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const unit of curriculum.units) color.set(unit.id, WHITE);

  const edges = new Map<string, string[]>();
  for (const unit of curriculum.units) {
    const targets = new Set<string>();
    for (const anchor of unit.remedialAnchors) {
      targets.add(anchor.toUnitId);
    }
    edges.set(unit.id, Array.from(targets));
  }

  function visit(id: string): void {
    const c = color.get(id);
    if (c === GRAY) {
      throw new CurriculumError(`Cycle detected through Remedial Anchors at unit ${id}`);
    }
    if (c === BLACK) return;
    color.set(id, GRAY);
    for (const next of edges.get(id) ?? []) visit(next);
    color.set(id, BLACK);
  }

  for (const id of edges.keys()) {
    if (color.get(id) === WHITE) visit(id);
  }
}

function assertRemedialAnchorsPointBackward(index: CurriculumIndex): void {
  for (const unit of index.unitsById.values()) {
    for (const anchor of unit.remedialAnchors) {
      const target = index.unitsById.get(anchor.toUnitId);
      if (!target) {
        throw new CurriculumError(
          `Remedial anchor on ${unit.id} points to missing unit ${anchor.toUnitId}`,
        );
      }
      const reachesTarget = isReachable(index, anchor.toUnitId, unit.id);
      if (!reachesTarget) {
        throw new CurriculumError(
          `Remedial anchor on ${unit.id} -> ${anchor.toUnitId} must point to a unit reachable before it in the canonical DAG`,
        );
      }
    }
  }
}

export function isReachable(index: CurriculumIndex, fromUnitId: string, toUnitId: string): boolean {
  if (fromUnitId === toUnitId) return true;
  const seen = new Set<string>();
  const queue: string[] = [fromUnitId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toUnitId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const dep of index.dependents.get(current) ?? []) {
      queue.push(dep);
    }
  }
  return false;
}

export function getPrerequisites(index: CurriculumIndex, unitId: string): Unit[] {
  return (index.prerequisites.get(unitId) ?? [])
    .map((id) => index.unitsById.get(id))
    .filter((u): u is Unit => u !== undefined);
}

export function getDependents(index: CurriculumIndex, unitId: string): Unit[] {
  return (index.dependents.get(unitId) ?? [])
    .map((id) => index.unitsById.get(id))
    .filter((u): u is Unit => u !== undefined);
}

export function getMilestoneForBoundary(
  index: CurriculumIndex,
  boundary: Milestone["boundary"],
): Milestone {
  const milestone = index.milestonesByBoundary.get(boundary);
  if (!milestone) {
    throw new CurriculumError(`No milestone registered for ${boundary}`);
  }
  return milestone;
}

export type ResolvedAnchorPath = {
  fromUnitId: string;
  visited: ReadonlyArray<{ unitId: string; anchor: RemedialAnchor }>;
  total: number;
};

export type ResolveAnchorsResult = {
  startingUnitId: string;
  units: ReadonlyArray<Unit>;
  paths: ReadonlyArray<ResolvedAnchorPath>;
};

/**
 * Mastery signal used to filter + order Remedial Anchors. A higher number
 * means the Learner is stronger in that gap area. Default = 0.5 for all
 * areas (no information); values should be in [0, 1].
 */
export type AnchorMastery = Partial<LearnerSkillMastery>;

export type ResolveAnchorsOptions = {
  /** Cap on chain length. Default 5 (per #17 acceptance). */
  maxDepth?: number;
  /** Optional learner-mastery signal (gap area → 0..1). */
  learnerMastery?: AnchorMastery;
  /**
   * Affective Filter score (0–100). When above the HIGH threshold (default
   * 70), the runtime prefers warmer/scaffolded anchor content — the
   * resolver marks every returned path with `scaffolded: true` so the
   * AI Teacher can adjust its tone.
   */
  affectiveFilterScore?: number;
  /** Threshold for considering the affective filter "high". Default 70. */
  affectiveHighThreshold?: number;
};

export type ResolvedAnchorStep = {
  unitId: string;
  anchor: RemedialAnchor;
  /** Score this anchor earned against the learner-mastery signal. */
  priority: number;
  /** True when the affective filter demands warmer scaffolding. */
  scaffolded: boolean;
};

export type ResolvedRemediationPlan = {
  startingUnitId: string;
  steps: ReadonlyArray<ResolvedAnchorStep>;
  /** True when at least one step is scaffolded. */
  scaffolded: boolean;
  /** Human-readable rationale for the AI Teacher. */
  rationale: string;
};

const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_AFFECTIVE_HIGH = 70;

function masteryFor(area: RemedialAnchorGapArea, signal: AnchorMastery): number {
  const value = signal[area];
  return typeof value === "number" ? Math.max(0, Math.min(1, value)) : 0.5;
}

function priorityFor(
  anchor: RemedialAnchor,
  mastery: AnchorMastery,
): number {
  // Higher priority when (a) anchor.weight is high and (b) Learner is weak in
  // this gap area. Returns a value in [0, 1].
  const weakness = 1 - masteryFor(anchor.gapArea, mastery);
  return Math.max(0, Math.min(1, anchor.weight * weakness));
}

export function resolveAnchors(index: CurriculumIndex, unitId: string): ResolveAnchorsResult {
  const start = index.unitsById.get(unitId);
  if (!start) {
    throw new CurriculumError(`Cannot resolve anchors: unknown unit ${unitId}`);
  }
  const startId = start.id;

  const collected = new Map<string, Unit>();
  const paths: ResolvedAnchorPath[] = [];
  collected.set(start.id, start);

  function walk(
    current: Unit,
    anchorChain: { unitId: string; anchor: RemedialAnchor }[],
    visited: Set<string>,
  ): void {
    for (const anchor of current.remedialAnchors) {
      if (visited.has(anchor.toUnitId)) {
        throw new CurriculumError(`Anchor cycle at ${current.id} -> ${anchor.toUnitId}`);
      }
      const target = index.unitsById.get(anchor.toUnitId);
      if (!target) {
        throw new CurriculumError(
          `Anchor from ${current.id} references missing unit ${anchor.toUnitId}`,
        );
      }
      const nextChain = [...anchorChain, { unitId: current.id, anchor }];
      if (!collected.has(target.id)) {
        collected.set(target.id, target);
        paths.push({
          fromUnitId: startId,
          visited: nextChain,
          total: nextChain.length,
        });
      }
      const nextVisited = new Set(visited);
      nextVisited.add(anchor.toUnitId);
      walk(target, nextChain, nextVisited);
    }
  }

  walk(start, [], new Set([start.id]));

  const ordered = Array.from(collected.values()).sort((a, b) => {
    if (a.level !== b.level) return a.level.localeCompare(b.level);
    return a.order - b.order;
  });

  return {
    startingUnitId: startId,
    units: ordered,
    paths,
  };
}

/**
 * Build the runtime Remediation Plan for a failed Milestone (or any unit).
 *
 * Walks the anchor graph from `unitId`, ordered by gap-area weakness ×
 * anchor weight, and produces a flat list of `ResolvedAnchorStep`s capped
 * at `maxDepth` (default 5). The canonical curriculum DAG is unchanged;
 * the *induced* graph is a DAG (assertRemedialAnchorsAcyclic + the per-step
 * `visited` set).
 *
 * When `affectiveFilterScore` exceeds `affectiveHighThreshold`, every step
 * is flagged `scaffolded: true` so the AI Teacher can soften its tone and
 * add extra scaffolding on top of the anchor content.
 */
export function resolveRemediationPlan(
  index: CurriculumIndex,
  unitId: string,
  options: ResolveAnchorsOptions = {},
): ResolvedRemediationPlan {
  const start = index.unitsById.get(unitId);
  if (!start) {
    throw new CurriculumError(`Cannot build remediation plan: unknown unit ${unitId}`);
  }
  const maxDepth = Math.max(1, options.maxDepth ?? DEFAULT_MAX_DEPTH);
  const mastery = options.learnerMastery ?? {};
  const affectiveHigh = options.affectiveHighThreshold ?? DEFAULT_AFFECTIVE_HIGH;
  const affectiveScore = options.affectiveFilterScore;
  const scaffolded = typeof affectiveScore === "number" && affectiveScore >= affectiveHigh;

  const steps: ResolvedAnchorStep[] = [];
  const emittedUnits = new Set<string>([start.id]);

  /**
   * Walk from `current` outward, tracking the visited set per-path.
   * The canonical DAG stays acyclic (assertRemedialAnchorsAcyclic); the
   * induced graph is also a DAG *per path* because Remedial Anchors only
   * point to Units that are reachable *before* the anchor's source. We
   * additionally pass a fresh copy of `visited` on each recursion so
   * sibling branches don't poison each other (e.g. A→B and A→C→B are
   * both valid and we want both B-anchored continuations).
   *
   * We also dedupe at the *output* level — the same Unit may be reached
   * via multiple chains (e.g. A→B and A→C→B), but the AI Teacher only
   * needs to re-present each Unit once. The per-path `visited` keeps the
   * walker from looping; the output `emittedUnits` prevents duplicates.
   */
  function walkUnit(current: Unit, depth: number, visited: Set<string>): void {
    if (depth >= maxDepth) return;
    const orderedAnchors = [...current.remedialAnchors].sort(
      (a, b) => priorityFor(b, mastery) - priorityFor(a, mastery),
    );
    for (const anchor of orderedAnchors) {
      if (steps.length >= maxDepth) return;
      if (visited.has(anchor.toUnitId)) {
        throw new CurriculumError(
          `Anchor cycle at ${current.id} -> ${anchor.toUnitId} during remediation planning`,
        );
      }
      const target = index.unitsById.get(anchor.toUnitId);
      if (!target) {
        throw new CurriculumError(
          `Anchor from ${current.id} references missing unit ${anchor.toUnitId}`,
        );
      }
      if (!emittedUnits.has(target.id)) {
        emittedUnits.add(target.id);
        steps.push({
          unitId: target.id,
          anchor,
          priority: priorityFor(anchor, mastery),
          scaffolded,
        });
      }
      const nextVisited = new Set(visited);
      nextVisited.add(target.id);
      walkUnit(target, depth + 1, nextVisited);
    }
  }

  walkUnit(start, 0, new Set([start.id]));

  const rationaleParts = [
    `starting from ${start.id}`,
    `${steps.length} anchor${steps.length === 1 ? "" : "s"}`,
    scaffolded ? "scaffolded (affective filter high)" : "canonical",
  ];

  return {
    startingUnitId: start.id,
    steps,
    scaffolded,
    rationale: rationaleParts.join("; "),
  };
}

export function reachableUnits(
  index: CurriculumIndex,
  fromUnitId: string,
  maxDepth: number,
): Unit[] {
  const seen = new Set<string>();
  const result: Unit[] = [];
  const queue: Array<{ id: string; depth: number }> = [{ id: fromUnitId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const unit = index.unitsById.get(id);
    if (!unit) continue;
    result.push(unit);
    if (depth >= maxDepth) continue;
    for (const dep of index.dependents.get(id) ?? []) {
      queue.push({ id: dep, depth: depth + 1 });
    }
  }

  return result.sort((a, b) => {
    if (a.level !== b.level) return a.level.localeCompare(b.level);
    return a.order - b.order;
  });
}

export function lessonCount(index: CurriculumIndex): number {
  let total = 0;
  for (const unit of index.unitsById.values()) {
    total += unit.lessons.length;
  }
  return total;
}

export function assertAllLessonsReachableFromEntry(index: CurriculumIndex): void {
  const reachable = new Set(
    reachableUnits(index, index.entryUnitId, Number.POSITIVE_INFINITY).map((u) => u.id),
  );
  for (const unit of index.unitsById.values()) {
    if (!reachable.has(unit.id)) {
      throw new CurriculumError(
        `Unit ${unit.id} is not reachable from entry unit ${index.entryUnitId}`,
      );
    }
  }
}
