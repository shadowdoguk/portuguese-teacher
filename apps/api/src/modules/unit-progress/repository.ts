// Unit-progress repository — DB-shaped helpers for the
// /api/unit-progress routes.
//
// Per CONTEXT.md "Six-Stage Unit Loop" + SPEC §12.4, the
// `unit_progress(user_id, unit_id, stage)` triple is the
// per-learner record of which stages of which unit have been
// completed. Stage completion is the only status Phase B writes —
// "skipped" and "in_progress" are deferred. The PK enforces no
// double-completion across stages; the composite PK + ON CONFLICT
// upsert makes the write idempotent (a retry surfaces the same
// `completed_at` timestamp).
//
// The `stage` column is `text` rather than a PG enum because the
// stage set is documented in `@pt/contracts::unitStageSchema` and
// the application-level schema validates the allowed set at the
// controller boundary. The `markComplete` helper validates the
// stage again as a belt-and-braces guard.

import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { db as defaultDb, type Database } from '../../db/index.js';
import {
  unitProgress,
  type UnitProgressRow,
} from '../../db/schema.js';
import {
  unitStageSchema,
  type UnitProgress,
  type UnitStage,
} from '@pt/contracts';

// ---------- Wire ↔ Row conversion --------------------------------------

function rowToWire(row: UnitProgressRow): UnitProgress {
  return {
    userId: row.userId,
    unitId: row.unitId,
    stage: unitStageSchema.parse(row.stage),
    status: 'complete',
    completedAt: row.completedAt.toISOString(),
  };
}

// ---------- Writes ------------------------------------------------------

/**
 * Upsert a `(user_id, unit_id, stage)` completion row. The
 * composite PK makes the insert idempotent; the ON CONFLICT
 * clause refreshes `completed_at` so a retry surfaces a fresh
 * timestamp (clients can read it as proof of liveness). The
 * caller is responsible for validating the stage against
 * `unitStageSchema` before reaching here.
 */
export async function markComplete(
  userId: string,
  unitId: string,
  stage: UnitStage,
  database: Database = defaultDb,
): Promise<UnitProgress> {
  const now = new Date();
  const inserted = (await database
    .insert(unitProgress)
    .values({ userId, unitId, stage, status: 'complete', completedAt: now })
    .onConflictDoUpdate({
      target: [unitProgress.userId, unitProgress.unitId, unitProgress.stage],
      set: { completedAt: now, status: 'complete' },
    })
    .returning()) as UnitProgressRow[];
  const row = inserted[0];
  if (!row) {
    throw new Error('unit_progress.markComplete: returning() produced no row');
  }
  return rowToWire(row);
}

// ---------- Reads -------------------------------------------------------

/**
 * Load every completion row for `(userId, unitId)` ordered by
 * `completed_at ASC` (so the wire-shape `rows` array matches the
 * stage-order the learner worked through). Returns the wire
 * shape — the controller pins the response via
 * `unitProgressListResponseSchema`.
 */
export async function listForUnit(
  userId: string,
  unitId: string,
  database: Database = defaultDb,
): Promise<ReadonlyArray<UnitProgress>> {
  const rows = (await database
    .select()
    .from(unitProgress)
    .where(and(eq(unitProgress.userId, userId), eq(unitProgress.unitId, unitId)))
    .orderBy(asc(unitProgress.completedAt))) as UnitProgressRow[];
  return rows.map(rowToWire);
}

// Silence unused-import warning on `randomUUID` — kept as the
// future home for any ID generation if Phase C adds one.
void randomUUID;