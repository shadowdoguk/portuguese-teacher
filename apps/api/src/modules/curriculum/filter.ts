// Filter endpoint — GET /api/curriculum/sentences.
//
// Phase B Task 7. Returns sentences in the active CV, optionally
// narrowed by a comma-separated `filter` expression (the
// `applyFilter` helper from `@pt/domain`). The `match` query
// parameter selects OR (default) vs AND matching.
//
// Per CONTEXT.md "Filter":
//   * Scope is sentences in the active CV.
//   * Default matching is OR.
//   * Explicit "match=all" turns it into AND.
//   * Filter can additionally be narrowed by Unit or Collection
//     (those parameters apply as AND against the text filter —
//     Phase B Task 6 deferred the Collection param).
//
// This is a read-only endpoint — it doesn't carry any
// learner-scoped state, but it IS personalised via the
// `requireAuth` mount (the route lives behind auth in
// `index.ts` so the cache-control middleware can attach a
// learner-scoped ETag).

import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { applyFilter } from '@pt/domain';
import {
  errorEnvelopeSchema,
  filterExpressionSchema,
  matchModeSchema,
  type ErrorCode,
  type PracticeItem,
} from '@pt/contracts';
import { db as defaultDb } from '../../db/index.js';
import {
  curriculumVersions,
  cvSentenceVersions,
  sentences,
} from '../../db/schema.js';

const MAX_FILTER_RESULTS = 500;

interface CurriculumSentenceRow {
  sentenceId: string;
  textPt: string;
  textEn: string;
  unitId: string;
  orderIndex: number;
}

/**
 * Load every published sentence in the active CV, joined to its
 * `cv_sentence_versions` projection so the active text rides.
 * Phase B Task 7: filter scope is "sentences in the active CV";
 * the optional `unitId` parameter (forwarded by the Filter page
 * for a Unit-scoped search) narrows further via the
 * `practiceFilter.unitId` query string.
 */
export async function searchSentences(req: Request, res: Response): Promise<void> {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }

  const exprParsed = filterExpressionSchema.safeParse(
    typeof req.query.filter === 'string' ? req.query.filter : '',
  );
  if (!exprParsed.success) {
    sendError(
      res,
      400,
      'validation_failed',
      exprParsed.error.issues.map((i) => i.message).join('; '),
    );
    return;
  }

  const matchParsed = matchModeSchema.safeParse(
    typeof req.query.match === 'string' ? req.query.match : 'or',
  );
  if (!matchParsed.success) {
    sendError(
      res,
      400,
      'validation_failed',
      matchParsed.error.issues.map((i) => i.message).join('; '),
    );
    return;
  }

  // Load the active CV row.
  const cvRows = (await defaultDb
    .select({ id: curriculumVersions.id })
    .from(curriculumVersions)
    .where(eq(curriculumVersions.active, 1))
    .limit(1)) as Array<{ id: string }>;
  const cvId = cvRows[0]?.id;
  if (!cvId) {
    sendError(res, 500, 'internal', 'No active curriculum version found');
    return;
  }

  // Optional Unit narrowing — Phase B Task 7 accepts `unit_id`
  // as an AND-filter against the text filter. The page-side
  // omits it for the global search.
  const unitIdRaw = typeof req.query.unit_id === 'string' ? req.query.unit_id : null;
  const unitId =
    unitIdRaw && /^unit_[a-z0-9][a-z0-9_]*$/.test(unitIdRaw) ? unitIdRaw : null;
  if (unitIdRaw && !unitId) {
    sendError(res, 400, 'validation_failed', 'unit_id must match unit_<slug>');
    return;
  }

  // Join sentences → cv_sentence_versions (active text) and
  // optionally narrow by unit. The query mirrors the practice
  // router's `loadSentencesForUnit` shape but adds the unit
  // optionality.
  const rows = (await defaultDb
    .select({
      sentenceId: sentences.sentenceId,
      textPt: cvSentenceVersions.textPt,
      textEn: cvSentenceVersions.textEn,
      unitId: sentences.unitId,
      orderIndex: sentences.curriculumOrder,
    })
    .from(sentences)
    .innerJoin(
      cvSentenceVersions,
      and(
        eq(cvSentenceVersions.sentenceId, sentences.sentenceId),
        eq(cvSentenceVersions.cvId, cvId),
      ),
    )
    .where(unitId ? eq(sentences.unitId, unitId) : undefined)
    .orderBy(asc(sentences.curriculumOrder))
    .limit(MAX_FILTER_RESULTS)) as Array<CurriculumSentenceRow>;

  const items: PracticeItem[] = rows.map((r) => ({
    sentenceId: r.sentenceId,
    textPt: r.textPt,
    textEn: r.textEn,
    audioId: null,
    unitId: r.unitId,
    orderIndex: r.orderIndex,
  }));

  const terms = exprParsed.data
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const filtered = applyFilter(items, terms, matchParsed.data === 'all');

  // Cache-Control: per CONTEXT.md "Cache-Control Discipline",
  // curriculum reads carry `private, max-age=60` plus an ETag
  // derived from the active CV id.
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.setHeader('ETag', `"${cvId}"`);
  res.locals.cvId = cvId;
  res.status(200).json({ items: filtered });
}

function sendError(
  res: Response,
  httpStatus: number,
  code: ErrorCode,
  message: string,
): void {
  const envelope = errorEnvelopeSchema.parse({
    error: { code, message, correlationId: randomUUID() },
  });
  res.status(httpStatus).json(envelope);
}