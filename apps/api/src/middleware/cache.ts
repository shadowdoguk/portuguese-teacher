// Cache-Control middleware (amendment Task A6).
//
// Every response from the curriculum routes carries
// `Cache-Control: private, max-age=60` (learner-scoped; private
// because personalised mastery can affect the visible state) plus
// an ETag derived from the active CV id when the route attaches
// `res.locals.cvId`. Auth/rating/session/event routes carry
// `Cache-Control: no-store` because they read or mutate
// authenticated state.
//
// ETag-on-curriculum is wired in Task 8 once the curriculum
// router attaches `res.locals.cvId`; for now the middleware just
// sets the Cache-Control header.

import type { Request, Response, NextFunction } from 'express';

const CURRICULUM_PREFIX = '/api/curriculum/';
const NO_STORE_PREFIXES: ReadonlyArray<string> = [
  '/api/auth/',
  '/api/me/',
  '/api/practice/ratings',
  '/api/practice/events',
  '/api/practice/sessions',
  '/api/auth/session',
];

export function cacheControl(_req: Request, res: Response, next: NextFunction): void {
  const path = _req.path;
  if (NO_STORE_PREFIXES.some((p) => path.startsWith(p)) || _req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store');
  } else if (path.startsWith(CURRICULUM_PREFIX)) {
    res.setHeader('Cache-Control', 'private, max-age=60');
    // Phase A: ETag stub. Task 8 attaches `res.locals.cvId` and the
    // curriculum router emits a strong ETag from it. We attach a
    // placeholder here that the router overrides via
    // `res.setHeader('ETag', ...)`.
    if (!res.getHeader('ETag')) {
      res.setHeader('ETag', 'W/"pending"');
    }
  }
  next();
}