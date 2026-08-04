// /api/health — readiness probe.
//
// Returns 200 OK with a JSON body indicating whether the process is
// up. Does not touch the DB (DB connectivity is checked at boot by
// `@pt/api/src/index.ts` via a startup probe; per-rebuild spec §11.3
// the `/api/health` endpoint is intentionally cheap so platform
// load-balancers can hit it without contention).

import type { Request, Response } from 'express';

export function healthHandler(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}