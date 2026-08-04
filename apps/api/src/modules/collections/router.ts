// Collections router — /api/collections.
//
// Phase B Task 5 surface:
//
//   GET    /                       list user's collections
//   POST   /                       create a collection
//   GET    /:id                    collection detail (header + items)
//   POST   /:id/items              add a sentence (idempotent on PK)
//   DELETE /:id/items/:sentenceId  remove a sentence
//   DELETE /:id                    delete the collection + items
//
// The router is mounted behind `requireAuth` + `userIdFromAuthShim`
// in `apps/api/src/index.ts` so the handlers can call
// `req.userIdFromAuth()` and read `res.locals.auth`.

import { Router } from 'express';
import {
  add,
  create,
  detail,
  destroy,
  list,
  removeItem,
} from './controller.js';

export const collectionsRouter = Router();

collectionsRouter.get('/', list);
collectionsRouter.post('/', create);
collectionsRouter.get('/:id', detail);
collectionsRouter.post('/:id/items', add);
collectionsRouter.delete('/:id/items/:sentenceId', removeItem);
collectionsRouter.delete('/:id', destroy);

export default collectionsRouter;