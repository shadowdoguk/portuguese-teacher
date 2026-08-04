// Curriculum router — /api/curriculum/{levels,levels/:levelId,units/:unitId}.
//
// Wires the read-only curriculum surface. Every route emits the
// canonical envelope on failure (via the @pt/api/contracts/errors
// module). On success the route attaches `res.locals.cvId` so the
// cacheControl middleware (Task 7, A6) emits a strong ETag from
// the active CV id rather than the Phase A placeholder.
//
// requireAuth (Task 7) sits ahead of every /api/curriculum/* route
// — the cache is private, learner-scoped, and the data is only
// useful to authenticated users. The middleware ordering lives in
// `apps/api/src/index.ts`.

import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { levelSchema, type Level } from '@pt/contracts';
import { errorEnvelopeSchema } from '../../contracts/errors.js';
import { getLevel, getUnitDetail, listLevels } from './repo.js';

const router = Router();

// ---------- GET /api/curriculum/levels -----------------------------------

router.get('/levels', async (_req: Request, res: Response) => {
  const out = await listLevels();
  attachCvIdForETag(res, out.levels[0]?.activeCvId ?? null);
  res.status(200).json(out);
});

// ---------- GET /api/curriculum/levels/:levelId -------------------------

router.get('/levels/:levelId', async (req: Request, res: Response) => {
  const parsed = levelSchema.safeParse(req.params.levelId);
  if (!parsed.success) {
    sendError(res, 400, 'validation_failed', `levelId must be one of {a1, a2}; got "${String(req.params.levelId)}"`);
    return;
  }
  const level: Level = parsed.data;
  const out = await getLevel(level);
  if (!out) {
    sendError(res, 404, 'not_found', `No active curriculum version for level "${level}"`);
    return;
  }
  attachCvIdForETag(res, out.activeCvId);
  res.status(200).json(out);
});

// ---------- GET /api/curriculum/units/:unitId ---------------------------

router.get('/units/:unitId', async (req: Request, res: Response) => {
  const unitId = String(req.params.unitId);
  if (!/^unit_[a-z0-9][a-z0-9_]*$/.test(unitId)) {
    sendError(res, 400, 'validation_failed', `unitId must match unit_<slug>`);
    return;
  }
  const out = await getUnitDetail(unitId);
  if (!out) {
    sendError(res, 404, 'not_found', `Unit "${unitId}" not found or not published`);
    return;
  }
  // Attach cvId via the unit's parent CV. Phase A simply emits a
  // generic ETag here; the practice router joins the cvId when it
  // needs it for the queue / review routes.
  attachCvIdForETag(res, `unit:${out.unitId}`);
  res.status(200).json(out);
});

// ---------- Helpers -----------------------------------------------------

function attachCvIdForETag(res: Response, cvIdOrMarker: string | null): void {
  // The cacheControl middleware (Task 7, A6) reads res.locals.cvId
  // and emits a strong ETag from it. We pin the value here so a
  // real CV id (or a per-unit marker for unit detail) rides the
  // response. Phase A uses a placeholder ETag when no value is set.
  res.locals.cvId = cvIdOrMarker ?? null;
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

export default router;