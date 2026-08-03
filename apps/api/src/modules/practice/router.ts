// Practice router — /api/practice/{ratings,queue,review}.
//
// Phase B shrinks the Phase A surface from five routes
// (`ratings`, `events`, `queue`, `review`, `sessions`) to three.
// `events` and `sessions` are out of scope here:
//   - `events` was a Phase A placeholder for the Phase C
//     structured-event shape; it returns 204 today.
//   - `sessions` was the `aggregateProgress` snapshot route; Phase
//     B's unit-progress routes (Task 8) replace it.
//
// `requireAuth` and `userIdFromAuthShim` are mounted in
// `apps/api/src/index.ts` ahead of this router so the handlers can
// call `req.userIdFromAuth()` and read `res.locals.auth`.

import { Router } from 'express';
import { queue, rate, review } from './controller.js';

export const practiceRouter = Router();

practiceRouter.post('/ratings', rate);
practiceRouter.get('/queue', queue);
practiceRouter.get('/review', review);

export default practiceRouter;
