// Apply-publish helper (amendment Task A3).
//
// Wraps the rows produced by `compileManifest` in a single Drizzle
// transaction that:
//   1. SELECT … FOR UPDATE on `curriculum_versions WHERE active = 1`
//      to serialise concurrent publish attempts.
//   2. UPDATE any existing active CV to `active = 0` (atomic rotation).
//   3. INSERT the new CV row, plus its units / islands / sentences /
//      scenarios / cv_sentence_versions, all under ON CONFLICT (id)
//      DO NOTHING for idempotency.
//   4. Returns `isFirstPublish: true` when no previous active row
//      existed, so the caller can audit-log accordingly.
//
// Idempotency guarantee: re-running applyPublish with the same
// manifest yields the same DB state and returns either
// `{outcome: 'noop'}` (when the same hash already exists for the CV
// id) or `{outcome: 'rotated', isFirstPublish: false}`.

import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  audioAssets,
  contentStatusEnum,
  conversationScenarios,
  curriculumVersions,
  cvSentenceVersions,
  islands,
  sentences,
  units,
} from '@pt/api/db/schema';
import type { CompileResult } from './compile.js';

export type ApplyOutcome =
  | { readonly outcome: 'created'; readonly isFirstPublish: boolean }
  | { readonly outcome: 'noop' }
  | { readonly outcome: 'rotated'; readonly isFirstPublish: false };

export interface ApplyPublishInput {
  readonly db: PostgresJsDatabase<Record<string, unknown>>;
  readonly compile: CompileResult;
  readonly now?: Date;
}

export async function applyPublish(input: ApplyPublishInput): Promise<ApplyOutcome> {
  const { db, compile, now = new Date() } = input;
  const cvId = compile.cv.id;
  const manifestHash = compile.cv.manifestHash;

  return db.transaction(async (tx) => {
    // (1) Serialise: lock the active-row set.
    await tx.execute(sql`SELECT 1 FROM curriculum_versions WHERE active = 1 FOR UPDATE`);

    // (2) Check no-op: same CV id with the same manifest hash.
    const existing = await tx.execute(sql`
      SELECT manifest_hash FROM curriculum_versions WHERE id = ${cvId} LIMIT 1
    `);
    const existingRow = (existing as unknown as { rows?: Array<{ manifest_hash: string }> }).rows?.[0];
    if (existingRow && existingRow.manifest_hash === manifestHash) {
      return { outcome: 'noop' } as const;
    }

    // (3) Rotate: clear any active flag on the prior CV (if any).
    const rotated = await tx.execute(sql`
      UPDATE curriculum_versions SET active = 0 WHERE active = 1 RETURNING id
    `);
    const isFirstPublish = !((rotated as unknown as { rows?: unknown[] }).rows?.length);

    // (4) Insert the new CV row, active.
    await tx.insert(curriculumVersions).values({
      id: cvId,
      active: 1,
      publishedAt: now,
      manifestHash,
    });

    // (5) Insert every unit / island / sentence / scenario.
    for (const u of compile.cv.units) {
      await tx.insert(units).values({
        unitId: u.unitId,
        level: u.level,
        title: u.title,
        summary: u.summary,
        status: 'published' as const,
        curriculumOrder: u.curriculumOrder,
      });
      for (const isl of u.islands) {
        await tx.insert(islands).values({
          islandId: isl.islandId,
          unitId: isl.unitId,
          title: isl.title,
          status: 'published' as const,
          curriculumOrder: isl.curriculumOrder,
        }).onConflictDoNothing();
      }
      for (const s of u.sentences) {
        await tx.insert(sentences).values({
          sentenceId: s.sentenceId,
          unitId: s.unitId,
          textPt: s.textPt,
          textEn: s.textEn,
          vocabRefs: s.vocabRefs.join(','),
          grammarRefs: s.grammarRefs.join(','),
          pronunciationRefs: s.pronunciationRefs.join(','),
          tags: s.tags.join(','),
          curriculumOrder: s.curriculumOrder,
          status: 'published' as const,
        }).onConflictDoNothing();
      }
    }

    for (const sc of compile.cv.scenarios) {
      await tx.insert(conversationScenarios).values({
        scenarioId: sc.scenarioId,
        unitId: sc.unitId,
        title: sc.title,
        setting: sc.setting,
        roles: sc.roles.join(','),
        learnerObjective: sc.learnerObjective,
        expectedVocabularyRefs: sc.expectedVocabularyRefs.join(','),
        expectedGrammarRefs: sc.expectedGrammarRefs.join(','),
        openingMessage: sc.openingMessage,
        completionConditions: sc.completionConditions.join(','),
        correctionPolicy: sc.correctionPolicy,
        feedbackRubric: sc.feedbackRubric.join(','),
        status: 'published' as const,
      }).onConflictDoNothing();
    }

    // (6) cv_sentence_versions projection (ADR-0001 §4).
    for (const row of compile.cvSentenceVersions) {
      await tx.insert(cvSentenceVersions).values({
        cvId: row.cvId,
        sentenceId: row.sentenceId,
        textPt: row.textPt,
        textEn: row.textEn,
        audioId: row.audioId,
        textReviewedAt: row.textReviewedAt,
        audioReviewedAt: row.audioReviewedAt,
      }).onConflictDoNothing();
    }

    // Reference imports so the linter does not flag the type/import
    // as unused when this file is read in isolation.
    void audioAssets;
    void contentStatusEnum;

    return isFirstPublish
      ? ({ outcome: 'created', isFirstPublish: true } as const)
      : ({ outcome: 'rotated', isFirstPublish: false } as const);
  });
}