// Collections schemas — shared by @pt/api and @pt/web.
//
// Per CONTEXT.md "Collections", collections are per-user lists of
// sentences that route through the same ratings table as the global
// queue; ratings are global to the user, not per-collection. The
// collection itself is a name + ordered list of sentence IDs.

import { z } from 'zod';

// ---------- IDs ----------------------------------------------------------

/** `col_<slug>` Collection ID. */
export const collectionIdSchema = z.string().regex(/^col_[a-z0-9_]+$/);

// ---------- Collection (list shape) --------------------------------------

export const collectionSchema = z.object({
  id: collectionIdSchema,
  name: z.string().min(1).max(80),
  sentenceCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export type Collection = z.infer<typeof collectionSchema>;

// ---------- Collection item (detail shape) ------------------------------

export const collectionItemSchema = z.object({
  orderIndex: z.number().int().nonnegative(),
  sentenceId: z.string().regex(/^sen_[a-z0-9_]+$/),
  textPt: z.string().min(1),
  textEn: z.string().min(1),
});

export type CollectionItem = z.infer<typeof collectionItemSchema>;

/** Detail view — collection metadata + its items. */
export const collectionDetailSchema = collectionSchema.extend({
  items: z.array(collectionItemSchema),
});

export type CollectionDetail = z.infer<typeof collectionDetailSchema>;

// ---------- Request bodies ----------------------------------------------

/** Body for `POST /api/collections`. */
export const createCollectionBodySchema = z.object({
  name: z.string().min(1).max(80),
});

export type CreateCollectionBody = z.infer<typeof createCollectionBodySchema>;

/** Body for `POST /api/collections/:id/items`. `orderIndex` is optional —
 * the server pins it to (current item count) when omitted. */
export const addItemBodySchema = z.object({
  sentenceId: z.string().regex(/^sen_[a-z0-9_]+$/),
  orderIndex: z.number().int().nonnegative().optional(),
});

export type AddItemBody = z.infer<typeof addItemBodySchema>;

// ---------- Response shapes ---------------------------------------------

export const collectionDetailResponseSchema = z.object({
  collection: collectionDetailSchema,
});

export const collectionListResponseSchema = z.object({
  items: z.array(collectionSchema),
});
