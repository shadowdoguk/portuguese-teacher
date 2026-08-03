// @pt/api bootstrap — Express 5.2.1 app composition.
//
// Mounts (in order):
//   1. cookie-parser — required by requireAuth (cookie path) and the
//      auth router's refresh/logout/session handlers.
//   2. originAllowList (amendment A4) — 403 csrf_origin_denied on
//      foreign Origin for state-changing /api/auth/* routes.
//   3. cacheControl (amendment A6) — Cache-Control: private,
//      max-age=60 on /api/curriculum/*; no-store on auth/rating/
//      session/event routes.
//   4. /api/health — readiness probe.
//   5. /api/auth — signup/login/refresh/logout/session routes.
//
// Phase C adds the audio synthesis route + the conversation routes;
// Phase B's curriculum/practice/queue/review endpoints land in Task 8
// on top of this commit.

import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import { NODE_ENV, isProduction } from './env.js';
import { originAllowList } from './middleware/origin.js';
import { cacheControl } from './middleware/cache.js';
import { requireAuth } from './middleware/requireAuth.js';
import { userIdFromAuthShim } from './middleware/userIdShim.js';
import authRouter from './modules/auth/router.js';
import collectionsRouter from './modules/collections/router.js';
import curriculumRouter from './modules/curriculum/router.js';
import { curriculumFilterRouter } from './modules/curriculum/filter-router.js';
import practiceRouter from './modules/practice/router.js';
import settingsRouter from './modules/settings/router.js';
import { unitProgressRouter } from './modules/unit-progress/router.js';
import { healthHandler } from './health.js';

// Re-export the userId shim from its dedicated module so existing
// imports of `userIdFromAuthShim` from this entry-point keep
// working. The shim itself lives in `./middleware/userIdShim.ts`
// (extracted in Phase B Task 3) so test files can import it
// without pulling in the full `createApp()` bootstrap.
export { userIdFromAuthShim } from './middleware/userIdShim.js';

export function createApp(): Express {
  const app = express();

  // Behind a load balancer / reverse proxy: trust the first hop so
  // req.ip / X-Forwarded-* are correct. Phase A only sets this in
  // production (one hop expected); dev keeps it off to avoid
  // noisy prototype-time headers.
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());
  app.use(originAllowList);
  app.use(cacheControl);

  app.get('/api/health', healthHandler);
  app.use('/api/auth', authRouter);

  // Authenticated routes mount behind requireAuth (Task 7). The
  // userIdFromAuth shim copies res.locals.auth.userId onto the
  // request object so the curriculum + practice + settings routers
  // can read it without re-implementing the cookie-vs-bearer
  // resolution.
  // Authenticated routes mount behind requireAuth (Task 7). The
  // userIdFromAuth shim copies res.locals.auth.userId onto the
  // request object so the curriculum + practice + settings +
  // collections routers can read it without re-implementing the
  // cookie-vs-bearer resolution.
  //
  // The curriculum filter router (Phase B Task 7) lives on a
  // separate `Router` so the GET /api/curriculum/sentences
  // surface doesn't have to share `router.ts`'s narrower URL
  // param regexes. Mounted on the same `/api/curriculum` path so
  // the public surface is unchanged.
  app.use('/api/curriculum', requireAuth, userIdFromAuthShim, curriculumRouter);
  app.use('/api/curriculum', requireAuth, userIdFromAuthShim, curriculumFilterRouter);
  app.use('/api/practice', requireAuth, userIdFromAuthShim, practiceRouter);
  app.use('/api/me/settings', requireAuth, userIdFromAuthShim, settingsRouter);
  app.use('/api/collections', requireAuth, userIdFromAuthShim, collectionsRouter);
  // Phase B Task 8: per-Learner six-stage loop (POST mark +
  // GET list). Both routes are authenticated, both emit
  // `Cache-Control: no-store` (the controller sets it
  // explicitly; the cacheControl middleware's "any non-GET →
  // no-store" rule covers the POST path as a belt-and-braces).
  app.use('/api/unit-progress', requireAuth, userIdFromAuthShim, unitProgressRouter);

  // 404 for unknown /api routes — return the canonical envelope.
  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: 'not_found',
        message: 'Route not found',
        correlationId: cryptoCorrelationId(),
      },
    });
  });

  return app;
}

/** Convenience: bind and listen. Used by the dev script in package.json. */
export async function startServer(port = Number(process.env.PORT ?? 4000)): Promise<void> {
  const app = createApp();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[pt/api] listening on :${port} (NODE_ENV=${NODE_ENV})`);
  });
}

function cryptoCorrelationId(): string {
  // Lazy import to keep this module's load path pure.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { randomUUID } = require('node:crypto') as typeof import('node:crypto');
  return randomUUID();
}

// Run when this file is the entry script.
const isEntrypoint =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(`/${process.argv[1]}`);
if (isEntrypoint) {
  void startServer();
}