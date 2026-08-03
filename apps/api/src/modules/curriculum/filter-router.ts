// Filter router — `/api/curriculum/sentences`.
//
// Phase B Task 7 surface: one route, GET /sentences (search by
// `filter` + `match` + optional `unit_id`). Lives behind
// `requireAuth` + `userIdFromAuthShim` in `apps/api/src/index.ts`
// so the handler can call `req.userIdFromAuth()`.

import { Router } from 'express';
import { searchSentences } from './filter.js';

export const curriculumFilterRouter = Router();

curriculumFilterRouter.get('/sentences', searchSentences);

export default curriculumFilterRouter;