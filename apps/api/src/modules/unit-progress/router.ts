// Unit-progress router — /api/unit-progress/{:unitId, :unitId/:stage}.
//
// Phase B Task 8 surface:
//   GET    /:unitId                  list every completion row for the unit
//   POST   /:unitId/:stage           mark a stage complete (idempotent)
//
// The router mounts behind `requireAuth` + `userIdFromAuthShim`
// in `apps/api/src/index.ts` so the handlers can call
// `req.userIdFromAuth()` and read `res.locals.auth`.

import { Router } from 'express';
import { list, mark } from './controller.js';

export const unitProgressRouter = Router();

unitProgressRouter.get('/:unitId', list);
unitProgressRouter.post('/:unitId/:stage', mark);

export default unitProgressRouter;