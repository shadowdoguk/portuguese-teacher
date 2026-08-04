// Settings controller — request → Zod parse → repository → response.
//
// The controller is transport-only: it parses with
// `settingsSchema` / `partialSettingsSchema` from `@pt/contracts`,
// calls the repository for I/O, and validates the response shape
// with `settingsSchema` so the wire contract stays pinned. Errors
// emit the canonical envelope (CONTEXT.md "Error Envelope"):
// `{ error: { code, message, correlationId } }`. The
// `correlationId` is generated here so the 4xx path carries one
// even when the route fires before the request-scoped middleware
// chain sets `res.locals.correlationId`.
//
// Per CONTEXT.md "Cache-Control Discipline", settings endpoints
// send `Cache-Control: no-store` — they read or mutate
// authenticated state. The settings path is added to the
// `NO_STORE_PREFIXES` list in `apps/api/src/middleware/cache.ts`
// in the same Task 4 commit so the middleware also emits the
// header on the GET 401 path (belt-and-braces; the controller
// also sets it on the 200 path).

import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import {
  errorEnvelopeSchema,
  partialSettingsSchema,
  settingsSchema,
  type ErrorCode,
  type Settings,
} from '@pt/contracts';
import { loadSettings, patchSettings } from './repository.js';

const NO_STORE = 'no-store' as const;

// ---------- handlers ----------------------------------------------------

export async function getSettings(req: Request, res: Response): Promise<void> {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }

  const settings = await loadSettings(userId);
  // The wire-shape is already aligned with `settingsSchema` by the
  // repository, but we re-validate to pin the contract.
  const validated = settingsSchema.safeParse(settings);
  if (!validated.success) {
    sendError(res, 500, 'internal', 'settings response shape invalid');
    return;
  }
  res.setHeader('Cache-Control', NO_STORE);
  res.status(200).json(validated.data satisfies Settings);
}

export async function patchThisSettings(req: Request, res: Response): Promise<void> {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }

  const parsed = partialSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(
      res,
      400,
      'validation_failed',
      parsed.error.issues.map((i) => i.message).join('; '),
    );
    return;
  }

  const next = await patchSettings(userId, parsed.data);
  const validated = settingsSchema.safeParse(next);
  if (!validated.success) {
    sendError(res, 500, 'internal', 'settings response shape invalid');
    return;
  }
  res.setHeader('Cache-Control', NO_STORE);
  res.status(200).json(validated.data satisfies Settings);
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