import { A0_CURRICULUM } from "@/lib/curriculum";
import type { Curriculum, GrammarPattern } from "@/lib/curriculum/types";
import type { SrsItemRef } from "./types";

export function vocabularyRefsFromCurriculum(curriculum: Curriculum = A0_CURRICULUM): SrsItemRef[] {
  const refs: SrsItemRef[] = [];
  for (const unit of curriculum.units) {
    for (const vocab of unit.vocabulary) {
      refs.push({
        kind: "vocabulary",
        itemId: vocab.id,
        pt: vocab.pt,
        gloss: vocab.gloss,
        unitId: vocab.unitId,
        ...(vocab.audioAssetId ? { audioAssetId: vocab.audioAssetId } : {}),
        ...(vocab.imageAssetId ? { imageAssetId: vocab.imageAssetId } : {}),
      });
    }
  }
  return refs;
}

export function grammarRefsFromCurriculum(curriculum: Curriculum = A0_CURRICULUM): SrsItemRef[] {
  const refs: SrsItemRef[] = [];
  for (const unit of curriculum.units) {
    for (const pattern of unit.grammar) {
      refs.push(grammarRef(pattern, unit.id));
    }
  }
  return refs;
}

export function grammarRef(pattern: GrammarPattern, unitId: string): SrsItemRef {
  return {
    kind: "grammar",
    itemId: pattern.id,
    pt: pattern.name,
    gloss: pattern.description,
    unitId,
  };
}

export function allReviewableRefs(curriculum: Curriculum = A0_CURRICULUM): SrsItemRef[] {
  return [...vocabularyRefsFromCurriculum(curriculum), ...grammarRefsFromCurriculum(curriculum)];
}

export type ScenarioSourceMap = ReadonlyMap<string, string>;

export function applyScenarioSources(
  refs: ReadonlyArray<SrsItemRef>,
  sources: ScenarioSourceMap,
): SrsItemRef[] {
  if (sources.size === 0) return refs.slice();
  return refs.map((ref) => {
    const source = sources.get(ref.itemId);
    if (!source) return ref;
    return { ...ref, sourceScenarioId: source };
  });
}
