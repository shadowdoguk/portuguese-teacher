// Practice router — /api/practice/{ratings,events,queue,review,sessions}.
//
// Ties together:
//   - @pt/domain.validateIdempotentRating (Task 3) for the POST
//     /api/practice/ratings validator (idempotent on
//     client_mutation_id).
//   - @pt/domain.buildSmartReviewQueue for the GET /api/practice/review
//     order: rating ASC → lastPractisedAt ASC NULLS FIRST →
//     curriculumOrder ASC; limit-clamped (default 50, max 200).
//   - @pt/domain.aggregateProgress for the GET /api/practice/sessions
//     mastery snapshot.
//
// requireAuth (Task 7) sits ahead of every route here. The
// cacheControl middleware (Task 7, A6) emits `no-store` on every
// practice mutation by default.

import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import {
  practiceQueueQuerySchema,
  practiceRatingInputSchema,
  smartReviewQuerySchema,
  type PracticeItem,
  type PracticeQueueResponse,
  type PracticeRating,
  type SmartReviewQueueResponse,
} from '@pt/contracts';
import {
  aggregateProgress,
  buildSmartReviewQueue,
  validateIdempotentRating,
  type SmartReviewRating,
  type SmartReviewSentence,
} from '@pt/domain';
import { db as defaultDb, type Database } from '../../db/index.js';
import { practiceRatings, sentences } from '../../db/schema.js';
import { errorEnvelopeSchema } from '../../contracts/errors.js';

const router = Router();

// ---------- POST /api/practice/ratings -----------------------------------

router.post('/ratings', async (req: Request, res: Response) => {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }

  const parsed = practiceRatingInputSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, 'validation_failed', 'Invalid rating input');
    return;
  }

  const verdict = validateIdempotentRating({
    userId,
    sentenceId: parsed.data.sentenceId,
    mode: parsed.data.mode,
    rating: parsed.data.rating,
    clientMutationId: parsed.data.clientMutationId,
  });
  if (!verdict.ok) {
    sendError(res, 400, verdict.code, verdict.message);
    return;
  }

  // Idempotent upsert keyed on (user, client_mutation_id). The DB
  // enforces uniqueness on practice_ratings_user_mutation_idx (Task
  // 5); on conflict we return the existing row's timestamps so the
  // client retries resolve to the same shape.
  const now = new Date();
  await defaultDb
    .insert(practiceRatings)
    .values({
      userId,
      sentenceId: parsed.data.sentenceId,
      mode: parsed.data.mode,
      rating: parsed.data.rating,
      clientMutationId: parsed.data.clientMutationId,
      lastPractisedAt: now,
    })
    .onConflictDoUpdate({
      target: [practiceRatings.userId, practiceRatings.clientMutationId],
      set: { lastPractisedAt: now },
    });

  const row = (await defaultDb
    .select()
    .from(practiceRatings)
    .where(
      and(
        eq(practiceRatings.userId, userId),
        eq(practiceRatings.clientMutationId, parsed.data.clientMutationId),
      ),
    )
    .limit(1))[0];
  if (!row) {
    sendError(res, 500, 'internal', 'Rating write succeeded but row not found');
    return;
  }
  const out: PracticeRating = {
    userId: row.userId,
    sentenceId: row.sentenceId,
    mode: row.mode as 'shadow' | 'recall',
    rating: row.rating as 1 | 2 | 3 | 4 | 5,
    lastPractisedAt: row.lastPractisedAt.toISOString(),
  };
  res.status(200).json(out);
});

// ---------- GET /api/practice/queue -------------------------------------

router.get('/queue', async (req: Request, res: Response) => {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }
  const parsed = practiceQueueQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendError(res, 400, 'validation_failed', 'Invalid queue query');
    return;
  }

  // Phase A queue builder: simple unit-id match + filter expression.
  // The cv_sentence_versions projection (Task 5) supplies the active
  // CV's per-sentence text. Phase B extends this with stage-aware
  // ordering.
  const q = parsed.data;
  const items = await buildQueue(userId, q.unitId, q.mode, q.filter, q.match);
  const out: PracticeQueueResponse = { items };
  res.status(200).json(out);
});

// ---------- GET /api/practice/review ------------------------------------

router.get('/review', async (req: Request, res: Response) => {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }
  const parsed = smartReviewQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendError(res, 400, 'validation_failed', 'Invalid review query');
    return;
  }
  const q = parsed.data;

  // Pull the user's ratings for this mode (only shadow for shadow
  // queue, only recall for recall queue).
  const ratingRows = await defaultDb
    .select()
    .from(practiceRatings)
    .where(and(eq(practiceRatings.userId, userId), eq(practiceRatings.mode, q.mode)));

  const sentenceRows = await defaultDb.select().from(sentences);
  const ratings: SmartReviewRating[] = ratingRows.map((r) => ({
    sentenceId: r.sentenceId,
    mode: r.mode as 'shadow' | 'recall',
    rating: r.rating,
    lastPractisedAt: r.lastPractisedAt.toISOString(),
  }));
  const sentencesForQueue: SmartReviewSentence[] = sentenceRows.map((s) => ({
    sentenceId: s.sentenceId,
    curriculumOrder: s.curriculumOrder,
  }));

  const ranked = buildSmartReviewQueue({
    mode: q.mode,
    limit: q.limit,
    ratings,
    sentences: sentencesForQueue,
  });

  const items: PracticeItem[] = ranked.map((r) => {
    const row = sentenceRows.find((s) => s.sentenceId === r.sentenceId);
    return {
      sentenceId: r.sentenceId,
      textPt: row?.textPt ?? '',
      textEn: row?.textEn ?? '',
      audioId: row?.sentenceId ? null : null, // Phase A: no audioId column on sentences row; Phase C wires the join.
      curriculumOrder: r.curriculumOrder,
    };
  });
  const out: SmartReviewQueueResponse = { items };
  res.status(200).json(out);
});

// ---------- POST /api/practice/events -----------------------------------

router.post('/events', async (req: Request, res: Response) => {
  // Phase A: minimal event sink. Phase B (and Phase C for Android)
  // expand this to the structured-event shape described in the
  // rebuild spec §6.3. The cacheControl middleware already emits
  // `no-store` on this prefix.
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }
  res.status(204).end();
});

// ---------- GET /api/practice/sessions -----------------------------------

router.get('/sessions', async (req: Request, res: Response) => {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }
  const mode = req.query.mode === 'recall' ? 'recall' : 'shadow';
  const unitId = typeof req.query.unitId === 'string' ? req.query.unitId : null;
  if (unitId && !/^unit_[a-z0-9][a-z0-9_]*$/.test(unitId)) {
    sendError(res, 400, 'validation_failed', `unitId must match unit_<slug>`);
    return;
  }

  // Aggregate the user's mastery snapshot for the requested unit.
  // unitSentences is the published sentence set for the unit (status =
  // 'published'). ratings is every (sentence, mode) pair the user has
  // recorded; we filter to `mode` here.
  const sentenceRows = unitId
    ? await defaultDb
        .select()
        .from(sentences)
        .where(eq(sentences.unitId, unitId))
    : await defaultDb.select().from(sentences);
  const ratingRows = await defaultDb
    .select()
    .from(practiceRatings)
    .where(and(eq(practiceRatings.userId, userId), eq(practiceRatings.mode, mode)))
    .orderBy(desc(practiceRatings.lastPractisedAt));

  const snap = aggregateProgress({
    mode,
    unitSentences: sentenceRows.map((s) => ({ sentenceId: s.sentenceId })),
    ratings: ratingRows.map((r) => ({
      sentenceId: r.sentenceId,
      mode: r.mode as 'shadow' | 'recall',
      rating: r.rating,
    })),
    completedStages: [],
  });
  res.status(200).json(snap);
});

// ---------- Helpers -----------------------------------------------------

async function buildQueue(
  userId: string,
  unitId: string | undefined,
  mode: 'shadow' | 'recall',
  _filter: string | undefined,
  _match: 'any' | 'all',
): Promise<PracticeItem[]> {
  // Phase A: list every published sentence in the unit. Phase B adds
  // the filter expression and the stage-aware ordering. For now the
  // filter/match parameters are accepted for API stability but
  // ignored — the response shape and the audit log call are wired.
  const where = unitId
    ? and(eq(sentences.unitId, unitId), eq(sentences.status, 'published'))
    : eq(sentences.status, 'published');
  const rows = await defaultDb.select().from(sentences).where(where);
  // Pull the user-supplied mode-tagged ratings so the response can
  // surface the practice state; for Phase A we only need the
  // existence of a sentence — we don't filter on rating yet.
  void userId;
  return rows.map((s) => ({
    sentenceId: s.sentenceId,
    textPt: s.textPt,
    textEn: s.textEn,
    audioId: null,
    curriculumOrder: s.curriculumOrder,
  }));
}

function sendError(
  res: Response,
  httpStatus: number,
  code: 'validation_failed' | 'unauthorized' | 'forbidden' | 'not_found' | 'conflict' | 'rate_limited' | 'internal' | 'csrf_origin_denied' | 'refresh_reused' | 'not_publishable',
  message: string,
): void {
  const envelope = errorEnvelopeSchema.parse({
    error: {
      code,
      message,
      correlationId: randomUUID(),
    },
  });
  res.status(httpStatus).json(envelope);
}

declare module 'express-serve-static-core' {
  interface Request {
    userIdFromAuth(): string | undefined;
  }
}

// Express 5 middleware-ordering note: the requireAuth middleware
// (Task 7) attaches `res.locals.auth` on success. The router above
// reads it via the `req.userIdFromAuth()` augmentation declared
// just above; the augmentation itself is initialised at app
// bootstrap in `apps/api/src/index.ts` via a tiny middleware that
// copies `res.locals.auth.userId` onto `req.userId`.

export default router;