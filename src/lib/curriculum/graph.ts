import type { Curriculum, Level, Milestone, RemedialAnchor, Unit } from "./types";

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
