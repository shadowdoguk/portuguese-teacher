// Unit-progress controller — request → Zod parse → repository → response.
//
// Per CONTEXT.md "Six-Stage Unit Loop", the only writable status
// in Phase B is `'complete'`. The controller validates the
// `:stage` URL param against `unitStageSchema` (a 400 with
// `stage_unknown` if it doesn't match) and the body against
// `unitProgressWriteSchema` (a 400 with
// `unit_progress_invalid_status` on shape mismatch).
//
// Two routes:
//   - POST /api/unit-progress/:unitId/:stage  → mark complete
//   - GET  /api/unit-progress/:unitId         → list every
//                                              completion row for
//                                              the unit
//
// Both carry `Cache-Control: no-store` (authenticated mutation
// + authenticated read of learner-scoped state).
//
// The `paramString` helper narrows Express 5's
// `string | string[] | undefined` `req.params` shape (same
// pattern the collections controller uses).

import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import {
  errorEnvelopeSchema,
  unitProgressListResponseSchema,
  unitProgressWriteSchema,
  unitStageSchema,
  type ErrorCode,
  type UnitProgress,
  type UnitStage,
} from '@pt/contracts';
import { listForUnit, markComplete } from './repository.js';

const NO_STORE = 'no-store' as const;

/**
 * Express 5 types `req.params[name]` as `string | string[] | undefined`.
 * The router mounts `/:unitId` and `/:stage` as scalar segments, so
 * the runtime value is always a `string` (or undefined when the
 * upstream middleware short-circuits). This helper narrows the
 * type for the controller body; downstream code that needs an
 * empty segment surfaces a 400 from the Zod schema.
 */
function paramString(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

// ---------- POST /api/unit-progress/:unitId/:stage -----------------------

export async function mark(req: Request, res: Response): Promise<void> {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }

  const stageParsed = unitStageSchema.safeParse(paramString(req.params.stage));
  if (!stageParsed.success) {
    sendError(
      res,
      400,
      'stage_unknown',
      `stage must be one of {learn, notice, shadow, recall, apply, communicate}`,
    );
    return;
  }
  const stage: UnitStage = stageParsed.data;

  const bodyParsed = unitProgressWriteSchema.safeParse(req.body ?? {});
  if (!bodyParsed.success) {
    sendError(
      res,
      400,
      'unit_progress_invalid_status',
      bodyParsed.error.issues.map((i) => i.message).join('; '),
    );
    return;
  }

  const unitId = paramString(req.params.unitId);
  const row = await markComplete(userId, unitId, stage);
  res.setHeader('Cache-Control', NO_STORE);
  res.status(200).json(row);
}

// ---------- GET /api/unit-progress/:unitId ------------------------------

export async function list(req: Request, res: Response): Promise<void> {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }

  const unitId = paramString(req.params.unitId);
  const rows = await listForUnit(userId, unitId);
  const validated = unitProgressListResponseSchema.safeParse({ unitId, rows });
  if (!validated.success) {
    sendError(res, 500, 'internal', 'unit_progress list response shape invalid');
    return;
  }
  res.setHeader('Cache-Control', NO_STORE);
  res.status(200).json(validated.data);
}

// ---------- error envelope --------------------------------------------

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