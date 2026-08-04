// Collections controller — request → Zod parse → repository → response.
//
// Per CONTEXT.md "Collections" + "Error Envelope", every 4xx/5xx
// response carries `{ error: { code, message, correlationId } }`.
// The `correlationId` is generated locally so the route works
// without request-scoped middleware injecting one.
//
// Cache-Control (CONTEXT.md "Cache-Control Discipline"):
//   * `GET /api/collections` — `no-store` (authenticated read).
//   * `GET /api/collections/:id` — `private, max-age=60` + an ETag
//     derived from the collection id (browser caches can re-use
//     304 when the membership is unchanged).
//   * Every other route (POST, DELETE) — `no-store`.
//
// The controller is transport-only: it parses with the
// `@pt/contracts::collections` Zod schemas and delegates I/O to
// the repository. The repo returns `null` on ownership mismatch;
// the controller maps that to `404 collection_not_found`.

import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import {
  addItemBodySchema,
  collectionDetailResponseSchema,
  collectionListResponseSchema,
  createCollectionBodySchema,
  errorEnvelopeSchema,
  type ErrorCode,
} from '@pt/contracts';
import {
  addItem,
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  removeItem as removeItemFromCollection,
} from './repository.js';

const NO_STORE = 'no-store' as const;
const PRIVATE_MAX_AGE_60 = 'private, max-age=60' as const;

/**
 * Express 5 types `req.params[name]` as `string | string[] | undefined`.
 * The router mounts `/:id` and `/:sentenceId` as scalar segments, so
 * the runtime value is always a `string` (or undefined when the
 * upstream middleware short-circuits). This helper narrows the type
 * for the controller body; downstream code that needs an empty
 * collection id surfaces a 404 from the repository.
 */
function paramString(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

// ---------- handlers ----------------------------------------------------

export async function list(req: Request, res: Response): Promise<void> {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }
  const items = await listCollections(userId);
  res.setHeader('Cache-Control', NO_STORE);
  res.status(200).json({ items });
}

export async function create(req: Request, res: Response): Promise<void> {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }
  const parsed = createCollectionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    // Per CONTEXT.md "Collections" + the Phase B plan, an empty /
    // missing name surfaces as `collection_name_required`. The Zod
    // issue path on `name` is the trigger; for any other
    // validation error (e.g. wrong body shape) we fall through to
    // `validation_failed`.
    const nameIssue = parsed.error.issues.find((i) => i.path[0] === 'name');
    if (nameIssue) {
      sendError(res, 400, 'collection_name_required', nameIssue.message);
      return;
    }
    sendError(
      res,
      400,
      'validation_failed',
      parsed.error.issues.map((i) => i.message).join('; '),
    );
    return;
  }
  const row = await createCollection(userId, parsed.data.name);
  res.setHeader('Cache-Control', NO_STORE);
  res.status(200).json(row);
}

export async function detail(req: Request, res: Response): Promise<void> {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }
  const col = await getCollection(userId, paramString(req.params.id));
  if (!col) {
    sendError(res, 404, 'collection_not_found', 'no such collection');
    return;
  }
  const validated = collectionDetailResponseSchema.safeParse({ collection: col });
  if (!validated.success) {
    sendError(res, 500, 'internal', 'collection detail response shape invalid');
    return;
  }
  res.setHeader('Cache-Control', PRIVATE_MAX_AGE_60);
  res.setHeader('ETag', `"${col.id}"`);
  res.status(200).json(validated.data);
}

export async function add(req: Request, res: Response): Promise<void> {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }
  const parsed = addItemBodySchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(
      res,
      400,
      'validation_failed',
      parsed.error.issues.map((i) => i.message).join('; '),
    );
    return;
  }
  const col = await addItem(userId, paramString(req.params.id), parsed.data.sentenceId, parsed.data.orderIndex);
  if (!col) {
    sendError(res, 404, 'collection_not_found', 'no such collection');
    return;
  }
  res.setHeader('Cache-Control', NO_STORE);
  res.status(200).json(col);
}

export async function removeItem(req: Request, res: Response): Promise<void> {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }
  const ok = await removeItemFromCollection(
    userId,
    paramString(req.params.id),
    paramString(req.params.sentenceId),
  );
  if (!ok) {
    sendError(res, 404, 'collection_not_found', 'no such collection');
    return;
  }
  res.setHeader('Cache-Control', NO_STORE);
  res.status(204).end();
}

export async function destroy(req: Request, res: Response): Promise<void> {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }
  const ok = await deleteCollection(userId, paramString(req.params.id));
  if (!ok) {
    sendError(res, 404, 'collection_not_found', 'no such collection');
    return;
  }
  res.setHeader('Cache-Control', NO_STORE);
  res.status(204).end();
}

// ---------- list (response-shape re-validation) ----------------------

/** Same as `list` but re-validates the response shape against the
 *  `@pt/contracts` schema. Kept as a named export for symmetry
 *  with `detail` and as a hook for future test coverage; the
 *  router mounts the slimmer `list` for now to keep the
 *  pre-DB test surface minimal. */
export async function listStrict(req: Request, res: Response): Promise<void> {
  const userId = req.userIdFromAuth();
  if (!userId) {
    sendError(res, 401, 'unauthorized', 'Authentication required');
    return;
  }
  const items = await listCollections(userId);
  const validated = collectionListResponseSchema.safeParse({ items });
  if (!validated.success) {
    sendError(res, 500, 'internal', 'collection list response shape invalid');
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