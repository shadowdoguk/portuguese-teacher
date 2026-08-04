// userIdFromAuthShim — extracted from apps/api/src/index.ts.
//
// Express middleware that copies `res.locals.auth.userId` onto the
// request object as `req.userIdFromAuth()`. Sits immediately after
// `requireAuth` in the curriculum + practice route chains so route
// handlers don't have to reach into `res.locals`.
//
// The shim was previously inlined in `apps/api/src/index.ts`. It
// was extracted here (Phase B Task 3) so test files can import the
// shim without pulling in the full `createApp()` bootstrap — the
// bootstrap triggers `env.ts`, which throws on missing
// `DATABASE_URL` / `AUTH_ALLOWED_ORIGINS`. Tests don't need the
// full app; they only need the middleware chain.
//
// `index.ts` re-exports both the function and the `Request` module
// augmentation so existing imports keep working.

import type { Request, Response, NextFunction } from 'express';
import type { AuthedLocals } from './requireAuth.js';

export function userIdFromAuthShim(req: Request, res: Response, next: NextFunction): void {
  const locals = res.locals as { auth?: AuthedLocals };
  const userId = locals.auth?.userId;
  req.userIdFromAuth = () => userId;
  next();
}

declare module 'express-serve-static-core' {
  interface Request {
    userIdFromAuth(): string | undefined;
  }
}
