// Compile a validated manifest into the row payloads the API
// apply-publish helper writes to the database.
//
// Pure: same input → same output. The byte-equal manifest hash comes
// from `canonicalize.ts`; the row payloads here are derived from the
// parsed manifest without further I/O.

import { canonicalizeManifest } from './canonicalize.js';
import type { ManifestSource } from './manifest.js';

export interface CompiledCurriculumVersion {
  readonly id: string;
  readonly active: 0 | 1;
  readonly publishedAt: Date | null;
  readonly manifestHash: string;
  readonly units: ReadonlyArray<CompiledUnit>;
  readonly scenarios: ReadonlyArray<CompiledScenario>;
}

export interface CompiledUnit {
  readonly unitId: string;
  readonly level: string;
  readonly title: string;
  readonly summary: string;
  readonly curriculumOrder: number;
  readonly sentences: ReadonlyArray<CompiledSentence>;
  readonly islands: ReadonlyArray<CompiledIsland>;
}

export interface CompiledSentence {
  readonly sentenceId: string;
  readonly unitId: string;
  readonly textPt: string;
  readonly textEn: string;
  readonly vocabRefs: ReadonlyArray<string>;
  readonly grammarRefs: ReadonlyArray<string>;
  readonly pronunciationRefs: ReadonlyArray<string>;
  readonly tags: ReadonlyArray<string>;
  readonly curriculumOrder: number;
}

export interface CompiledIsland {
  readonly islandId: string;
  readonly unitId: string;
  readonly title: string;
  readonly sentenceIds: ReadonlyArray<string>;
  readonly curriculumOrder: number;
}

export interface CompiledScenario {
  readonly scenarioId: string;
  readonly unitId: string;
  readonly title: string;
  readonly setting: string;
  readonly roles: ReadonlyArray<string>;
  readonly learnerObjective: string;
  readonly expectedVocabularyRefs: ReadonlyArray<string>;
  readonly expectedGrammarRefs: ReadonlyArray<string>;
  readonly openingMessage: string;
  readonly completionConditions: ReadonlyArray<string>;
  readonly correctionPolicy: string;
  readonly feedbackRubric: ReadonlyArray<string>;
}

export interface CompileResult {
  readonly cv: CompiledCurriculumVersion;
  /** Row payload for every (cv_id, sentence_id) projection (ADR-0001 §4). */
  readonly cvSentenceVersions: ReadonlyArray<{
    readonly cvId: string;
    readonly sentenceId: string;
    readonly textPt: string;
    readonly textEn: string;
    readonly audioId: null;
    readonly textReviewedAt: null;
    readonly audioReviewedAt: null;
  }>;
}

export function compileManifest(manifest: ManifestSource): CompileResult {
  const manifestHash = sha256Hex(canonicalizeManifest(manifest));
  const units: CompiledUnit[] = [];
  const scenarios: CompiledScenario[] = [];
  const cvSentenceVersions: CompileResult['cvSentenceVersions'] = [];

  for (const u of manifest.units) {
    const sentences: CompiledSentence[] = u.sentences.map((s) => ({
      sentenceId: s.sentenceId,
      unitId: u.unitId,
      textPt: s.textPt,
      textEn: s.textEn,
      vocabRefs: s.vocabRefs,
      grammarRefs: s.grammarRefs,
      pronunciationRefs: s.pronunciationRefs,
      tags: s.tags,
      curriculumOrder: s.curriculumOrder,
    }));

    const islands: CompiledIsland[] = u.islands.map((isl, idx) => ({
      islandId: isl.islandId,
      unitId: u.unitId,
      title: isl.title,
      sentenceIds: isl.sentenceIds,
      curriculumOrder: idx,
    }));

    units.push({
      unitId: u.unitId,
      level: manifest.level,
      title: u.title,
      summary: u.summary,
      curriculumOrder: u.curriculumOrder,
      sentences,
      islands,
    });

    for (const s of u.sentences) {
      cvSentenceVersions.push({
        cvId: manifest.cvId,
        sentenceId: s.sentenceId,
        textPt: s.textPt,
        textEn: s.textEn,
        audioId: null,
        textReviewedAt: null,
        audioReviewedAt: null,
      });
    }

    for (const sc of u.scenarios) {
      scenarios.push({
        scenarioId: sc.scenarioId,
        unitId: u.unitId,
        title: sc.title,
        setting: sc.setting,
        roles: sc.roles,
        learnerObjective: sc.learnerObjective,
        expectedVocabularyRefs: sc.expectedVocabularyRefs,
        expectedGrammarRefs: sc.expectedGrammarRefs,
        openingMessage: sc.openingMessage,
        completionConditions: sc.completionConditions,
        correctionPolicy: sc.correctionPolicy,
        feedbackRubric: sc.feedbackRubric,
      });
    }
  }

  const cv: CompiledCurriculumVersion = {
    id: manifest.cvId,
    active: 1,
    publishedAt: null, // set by applyPublish on successful transaction commit
    manifestHash,
    units,
    scenarios,
  };

  return { cv, cvSentenceVersions };
}

function sha256Hex(bytes: Uint8Array): string {
  // Phase A: rely on Node's `crypto` directly. Phase B may swap to
  // the platform Web Crypto API for parity with the browser.
  return createHash('sha256').update(bytes).digest('hex');
}

import { createHash } from 'node:crypto';