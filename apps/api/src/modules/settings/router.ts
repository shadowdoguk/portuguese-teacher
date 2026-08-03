// Settings router — /api/me/settings.
//
// Phase B Task 4 surface: `GET /` and `PATCH /`. The router mounts
// behind `requireAuth` + `userIdFromAuthShim` in
// `apps/api/src/index.ts` so the handlers can call
// `req.userIdFromAuth()` and read `res.locals.auth`.
//
// Per CONTEXT.md "Settings", the only client-local state is device
// permission grants, ephemeral UI flags, and on-device recordings;
// every settings column is server-side per-Learner. The cache
// middleware (Task A6) attaches `Cache-Control: no-store` to the
// settings path; the controller also sets it explicitly on the 200
// path so the wire contract is self-evident from this file alone.

import { Router } from 'express';
import { getSettings, patchThisSettings } from './controller.js';

export const settingsRouter = Router();

settingsRouter.get('/', getSettings);
settingsRouter.patch('/', patchThisSettings);

export default settingsRouter;