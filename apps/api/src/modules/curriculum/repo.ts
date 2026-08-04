// Curriculum repository — DB-backed reads for the curriculum router.
//
// Pure shape transforms: Drizzle row → @pt/contracts payload.
// Every function is read-only; applyPublish (in @pt/content) owns
// the write path. Status columns on every row use the content_status
// enum (amendment A2); only 'published' rows surface on learner
// endpoints.

import { and, asc, eq } from 'drizzle-orm';
import { db as defaultDb, type Database } from '../../db/index.js';
import {
  conversationScenarios,
  curriculumVersions,
  cvSentenceVersions,
  islands,
  sentences,
  units,
} from '../../db/schema.js';
import {
  curriculumResponseSchema,
  levelResponseSchema,
  unitDetailSchema,
  type ConversationScenario,
  type ConversationSession,
  type ConversationTurn,
  type CurriculumResponse,
  type LevelResponse,
  type UnitDetail,
  type UnitSummary,
} from '@pt/contracts';

export async function listLevels(db: Database = defaultDb): Promise<CurriculumResponse> {
  const rows = await db
    .select()
    .from(curriculumVersions)
    .where(eq(curriculumVersions.active, 1))
    .orderBy(asc(curriculumVersions.id));

  const levels: CurriculumResponse['levels'] = [];
  for (const cv of rows) {
    const level = cv.id.startsWith('cv_a1') ? 'a1' : cv.id.startsWith('cv_a2') ? 'a2' : null;
    if (!level) continue;
    const unitsRows = await db
      .select()
      .from(units)
      .where(and(eq(units.level, level), eq(units.status, 'published')))
      .orderBy(asc(units.curriculumOrder));
    levels.push({
      level,
      activeCvId: cv.id,
      units: unitsRows.map(toUnitSummary),
    });
  }

  return curriculumResponseSchema.parse({ levels });
}

export async function getLevel(level: 'a1' | 'a2', db: Database = defaultDb): Promise<LevelResponse | null> {
  // The Phase A Drizzle 0.45.2 surface no longer exposes
  // `.startsWith()` on `PgColumn` (the API drifted away from
  // string-prefix matching). We rely on the post-filter on the
  // full active-CV set below; the abandoned first call below is
  // kept as `void` so the file's surface area doesn't change.
  const all = await db.select().from(curriculumVersions).where(eq(curriculumVersions.active, 1));
  const cv = all.find((r) => r.id.startsWith(`cv_${level}`));
  if (!cv) return null;

  const unitsRows = await db
    .select()
    .from(units)
    .where(and(eq(units.level, level), eq(units.status, 'published')))
    .orderBy(asc(units.curriculumOrder));
  return levelResponseSchema.parse({
    level,
    activeCvId: cv.id,
    units: unitsRows.map(toUnitSummary),
  });
}

export async function getUnitDetail(unitId: string, db: Database = defaultDb): Promise<UnitDetail | null> {
  const unitRows = await db.select().from(units).where(eq(units.unitId, unitId)).limit(1);
  const unit = unitRows[0];
  if (!unit || unit.status !== 'published') return null;

  const sentenceRows = await db
    .select()
    .from(sentences)
    .where(eq(sentences.unitId, unitId))
    .orderBy(asc(sentences.curriculumOrder));
  const islandRows = await db
    .select()
    .from(islands)
    .where(eq(islands.unitId, unitId))
    .orderBy(asc(islands.curriculumOrder));
  const scenarioRows = await db
    .select()
    .from(conversationScenarios)
    .where(eq(conversationScenarios.unitId, unitId));

  return unitDetailSchema.parse({
    unitId: unit.unitId,
    level: unit.level,
    title: unit.title,
    summary: unit.summary,
    sentenceCount: sentenceRows.length,
    islandCount: islandRows.length,
    sentences: sentenceRows.map(toSentence),
    islands: islandRows.map(toIsland),
    scenarios: scenarioRows.map((s) => s.scenarioId),
  });
}

/**
 * Look up the cv_sentence_versions projection (ADR-0001 §4) for an
 * active CV. Used by the practice queue builder when it materialises
 * the per-(cv, sentence) text from the active row.
 */
export async function getCvSentenceVersions(
  cvId: string,
  db: Database = defaultDb,
): Promise<Array<{ cvId: string; sentenceId: string; textPt: string; textEn: string; audioId: string | null }>> {
  const rows = await db
    .select()
    .from(cvSentenceVersions)
    .where(eq(cvSentenceVersions.cvId, cvId));
  return rows.map((r) => ({
    cvId: r.cvId,
    sentenceId: r.sentenceId,
    textPt: r.textPt,
    textEn: r.textEn,
    audioId: r.audioId,
  }));
}

// ---------- Shape transforms (private) -----------------------------------

function toUnitSummary(u: typeof units.$inferSelect): UnitSummary {
  return {
    unitId: u.unitId,
    level: u.level as 'a1' | 'a2',
    title: u.title,
    summary: u.summary,
    sentenceCount: 0, // populated by the route from a count(*) — kept as 0 here for the summary path
    islandCount: 0,
  };
}

function toSentence(s: typeof sentences.$inferSelect): import('@pt/contracts').Sentence {
  return {
    sentenceId: s.sentenceId,
    textPt: s.textPt,
    textEn: s.textEn,
    vocabRefs: splitCsv(s.vocabRefs),
    grammarRefs: splitCsv(s.grammarRefs),
    pronunciationRefs: splitCsv(s.pronunciationRefs),
    islandRefs: splitCsv(s.tags).filter((t) => t.startsWith('isl_')),
    tags: splitCsv(s.tags).filter((t) => !t.startsWith('isl_')),
    curriculumOrder: s.curriculumOrder,
    status: s.status,
  };
}

function toIsland(i: typeof islands.$inferSelect): import('@pt/contracts').Island {
  // The schema's island record only stores the island row; sentenceIds
  // are derived from the parent unit's sentences tagged to this island.
  // Phase A keeps this simple — the API returns an empty list and the
  // detail router expands it. Future iterations materialise the join.
  return {
    islandId: i.islandId,
    title: i.title,
    sentenceIds: [],
  };
}

function splitCsv(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

// ---------- Re-exports for downstream callers ----------------------------

export type { ConversationScenario, ConversationSession, ConversationTurn };