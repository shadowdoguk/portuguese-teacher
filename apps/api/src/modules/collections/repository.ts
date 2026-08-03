// Collections repository — DB-shaped helpers for the collections routes.
//
// Per CONTEXT.md "Collections": a Collection is a per-Learner named,
// ordered set of sentence references. Practising a sentence inside a
// Collection routes through the same `(user_id, sentence_id, mode)`
// ratings table — ratings are global, not per-collection.
//
// Two tables drive the surface:
//   * `collections(id, user_id, name, created_at)` — header.
//   * `collection_items(collection_id, sentence_id, order_index,
//     added_at)` — membership rows.
//
// The membership PK is `(collection_id, sentence_id)`, so an
// INSERT … ON CONFLICT DO NOTHING on the same pair is a no-op and
// clients can retry "add sentence" without duplicating rows.
//
// Text shown in the detail view comes from `sentences.text_pt` and
// `sentences.text_en` (the *current* sentence text) joined to the
// membership row. The CV-scoped `cv_sentence_versions.text_pt` is
// intentionally not consulted — the collection detail is a list
// view, not a practice view, so the curated sentence text is the
// right source of truth.

import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db as defaultDb, type Database } from '../../db/index.js';
import {
  collectionItems,
  collections,
  sentences,
  type CollectionRow,
} from '../../db/schema.js';

// ---------- ID generation ----------------------------------------------

/** Generate a stable `col_<slug>` collection id. The slug is a
 *  16-char hex prefix; collisions are vanishingly improbable for a
 *  per-user set, but the PK constraint surfaces any with a clean
 *  error rather than silent overwrite. */
export function makeCollectionId(): string {
  return `col_${randomUUID().slice(0, 16)}`;
}

// ---------- Wire ↔ Row conversion --------------------------------------

export interface CollectionWire {
  id: string;
  name: string;
  sentenceCount: number;
  createdAt: string;
}

export interface CollectionItemWire {
  orderIndex: number;
  sentenceId: string;
  textPt: string;
  textEn: string;
}

export interface CollectionDetailWire extends CollectionWire {
  items: ReadonlyArray<CollectionItemWire>;
}

function rowToWire(row: CollectionRow, sentenceCount: number): CollectionWire {
  return {
    id: row.id,
    name: row.name,
    sentenceCount,
    createdAt: row.createdAt.toISOString(),
  };
}

// ---------- Reads -------------------------------------------------------

/**
 * List every collection the user owns, each annotated with its
 * current sentence count. Returns an array of wire-shape entries
 * ordered by `created_at DESC` (newest first).
 */
export async function listCollections(
  userId: string,
  database: Database = defaultDb,
): Promise<ReadonlyArray<CollectionWire>> {
  const rows = (await database
    .select({
      id: collections.id,
      name: collections.name,
      createdAt: collections.createdAt,
      sentenceCount: sql<number>`COUNT(${collectionItems.sentenceId})::int`,
    })
    .from(collections)
    .leftJoin(collectionItems, eq(collectionItems.collectionId, collections.id))
    .where(eq(collections.userId, userId))
    .groupBy(collections.id)
    .orderBy(desc(collections.createdAt))) as Array<{
    id: string;
    name: string;
    createdAt: Date;
    sentenceCount: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sentenceCount: Number(r.sentenceCount ?? 0),
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Load a single collection (header + items). Returns `null` if no
 * matching collection is owned by the user. Items are joined to
 * `sentences` for `text_pt` / `text_en` and ordered by
 * `order_index ASC`.
 */
export async function getCollection(
  userId: string,
  id: string,
  database: Database = defaultDb,
): Promise<CollectionDetailWire | null> {
  const head = (await database
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .limit(1)) as CollectionRow[];
  const row = head[0];
  if (!row) return null;

  const items = (await database
    .select({
      orderIndex: collectionItems.orderIndex,
      sentenceId: collectionItems.sentenceId,
      textPt: sentences.textPt,
      textEn: sentences.textEn,
    })
    .from(collectionItems)
    .innerJoin(sentences, eq(sentences.sentenceId, collectionItems.sentenceId))
    .where(eq(collectionItems.collectionId, id))
    .orderBy(asc(collectionItems.orderIndex))) as Array<{
    orderIndex: number;
    sentenceId: string;
    textPt: string;
    textEn: string;
  }>;

  return {
    ...rowToWire(row, items.length),
    items: items.map((i) => ({
      orderIndex: i.orderIndex,
      sentenceId: i.sentenceId,
      textPt: i.textPt,
      textEn: i.textEn,
    })),
  };
}

// ---------- Writes ------------------------------------------------------

/**
 * Insert a new collection header row and return its wire shape.
 * The first `collection_items` row is added separately via
 * `addItem` so the create / add paths are decoupled.
 */
export async function createCollection(
  userId: string,
  name: string,
  database: Database = defaultDb,
): Promise<CollectionWire> {
  const id = makeCollectionId();
  const inserted = (await database
    .insert(collections)
    .values({ id, userId, name })
    .returning()) as CollectionRow[];
  const row = inserted[0];
  if (!row) {
    throw new Error('collections.createCollection: returning() produced no row');
  }
  return rowToWire(row, 0);
}

/**
 * Append a sentence to a collection. `orderIndex` is optional —
 * when omitted the next available index is computed
 * (max + 1, or 0 for the first row). The membership PK makes the
 * insert idempotent: a duplicate `(collection_id, sentence_id)`
 * pair is silently skipped, so retrying a client request never
 * creates two rows.
 *
 * Returns the refreshed detail view, or `null` if no matching
 * collection is owned by the user (404 in the controller).
 */
export async function addItem(
  userId: string,
  collectionId: string,
  sentenceId: string,
  orderIndex?: number,
  database: Database = defaultDb,
): Promise<CollectionDetailWire | null> {
  // Ownership check first — same pattern as the plan snippet.
  const head = (await database
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1)) as Array<{ id: string }>;
  if (head.length === 0) return null;

  let nextOrder = orderIndex;
  if (nextOrder === undefined) {
    const next = (await database
      .select({ next: sql<number>`COALESCE(MAX(${collectionItems.orderIndex}) + 1, 0)::int` })
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, collectionId))) as Array<{ next: number }>;
    nextOrder = Number(next[0]?.next ?? 0);
  }

  await database
    .insert(collectionItems)
    .values({ collectionId, sentenceId, orderIndex: nextOrder })
    .onConflictDoNothing();

  return getCollection(userId, collectionId, database);
}

/**
 * Remove a sentence from a collection. No-op if the row doesn't
 * exist. Returns `true` if the collection is owned by the user,
 * `false` otherwise (404 in the controller).
 */
export async function removeItem(
  userId: string,
  collectionId: string,
  sentenceId: string,
  database: Database = defaultDb,
): Promise<boolean> {
  const head = (await database
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1)) as Array<{ id: string }>;
  if (head.length === 0) return false;

  await database
    .delete(collectionItems)
    .where(
      and(
        eq(collectionItems.collectionId, collectionId),
        eq(collectionItems.sentenceId, sentenceId),
      ),
    );
  return true;
}

/**
 * Delete a collection and all its items in one transaction.
 * Returns `true` if the collection was owned by the user,
 * `false` otherwise (404 in the controller). The `ON DELETE
 * CASCADE` on `collection_items.collection_id` removes the items
 * automatically; we issue the explicit `DELETE FROM collections`
 * so the controller can short-circuit on missing ownership
 * without first deleting the items.
 */
export async function deleteCollection(
  userId: string,
  id: string,
  database: Database = defaultDb,
): Promise<boolean> {
  const head = (await database
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .limit(1)) as Array<{ id: string }>;
  if (head.length === 0) return false;

  await database.delete(collections).where(eq(collections.id, id));
  return true;
}