// Settings repository — DB-shaped helpers for the settings routes.
//
// Per CONTEXT.md "Settings", every settings column is server-side
// per-Learner; the only client-local state is device permission
// grants, ephemeral UI flags, and on-device recordings. The
// repository is the only module that imports `db` and `db/schema`
// for the settings table; the controller is transport-only.
//
// `user_settings` is keyed by `user_id` (PK + FK to `auth_users`),
// so the row materialises on first GET. We expose two helpers:
//   - `loadSettings(userId)` — returns the row, materialising
//     defaults on first read.
//   - `patchSettings(userId, patch)` — merges the patch into the
//     current row and writes it back; the row is created on first
//     PATCH so a fresh learner never sees a 404.
//
// `audio_speed` is stored as basis points (integer, 50–200 = 0.5–
// 2.0×) to match the `audio_assets.speed` convention; the
// controller translates to/from the float range on the wire.

import { eq } from 'drizzle-orm';
import { db as defaultDb, type Database } from '../../db/index.js';
import { userSettings, type UserSettingsRow } from '../../db/schema.js';
import type { Settings } from '@pt/contracts';

// ---------- Defaults ----------------------------------------------------

/** Wire-shape defaults — what the API returns on first access. */
export const SETTINGS_DEFAULTS: Settings = Object.freeze({
  audioSpeed: 1.0,
  repetitions: 2,
  pauseMs: 1000,
  textSize: 'default',
  sortOrder: 'curriculum',
  loop: false,
});

/** DB-shape defaults (basis points, integer booleans) — what the
 *  row INSERTs with on first materialisation. */
const ROW_DEFAULTS = Object.freeze({
  audioSpeed: 100, // basis points: 100 = 1.0×
  repetitions: 2,
  pauseMs: 1000,
  textSize: 'default',
  sortOrder: 'curriculum',
  loop: 0,
});

// ---------- Wire ↔ Row conversion --------------------------------------

export interface SettingsWire {
  audioSpeed: number;
  repetitions: number;
  pauseMs: number;
  textSize: Settings['textSize'];
  sortOrder: Settings['sortOrder'];
  loop: boolean;
}

function rowToWire(row: UserSettingsRow): SettingsWire {
  return {
    audioSpeed: row.audioSpeed / 100, // basis points → float
    repetitions: row.repetitions,
    pauseMs: row.pauseMs,
    textSize: row.textSize as Settings['textSize'],
    sortOrder: row.sortOrder as Settings['sortOrder'],
    loop: row.loop === 1,
  };
}

function wireToRow(wire: SettingsWire): {
  audioSpeed: number;
  repetitions: number;
  pauseMs: number;
  textSize: string;
  sortOrder: string;
  loop: number;
} {
  return {
    audioSpeed: Math.round(wire.audioSpeed * 100),
    repetitions: wire.repetitions,
    pauseMs: wire.pauseMs,
    textSize: wire.textSize,
    sortOrder: wire.sortOrder,
    loop: wire.loop ? 1 : 0,
  };
}

// ---------- Reads -------------------------------------------------------

/**
 * Load the settings row for `userId`, materialising defaults on
 * first access. Returns the wire shape so the controller doesn't
 * need to know about basis-points / integer-boolean conventions.
 */
export async function loadSettings(
  userId: string,
  database: Database = defaultDb,
): Promise<SettingsWire> {
  const rows = await database
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  const row = rows[0];
  if (row) return rowToWire(row);

  // First-access materialisation: insert the default row.
  await database.insert(userSettings).values({
    userId,
    audioSpeed: ROW_DEFAULTS.audioSpeed,
    repetitions: ROW_DEFAULTS.repetitions,
    pauseMs: ROW_DEFAULTS.pauseMs,
    textSize: ROW_DEFAULTS.textSize,
    sortOrder: ROW_DEFAULTS.sortOrder,
    loop: ROW_DEFAULTS.loop,
  });
  return { ...SETTINGS_DEFAULTS };
}

// ---------- Writes ------------------------------------------------------

/**
 * Merge `patch` into the current row and write it back. The current
 * row is materialised if missing (a fresh learner can PATCH before
 * a GET). The function returns the *merged* wire shape so the
 * controller can echo it back without re-reading.
 *
 * `patch` is intentionally typed `Partial<SettingsWire>` — the
 * controller has already validated the patch with
 * `partialSettingsSchema`, so any field present here is a valid
 * `Settings` value. `exactOptionalPropertyTypes` in
 * `tsconfig.base.json` means the field-types must accept
 * `undefined`, so we re-shape with explicit undefined-tolerant
 * types instead of using `Partial` directly.
 */
export async function patchSettings(
  userId: string,
  patch: {
    audioSpeed?: number | undefined;
    repetitions?: number | undefined;
    pauseMs?: number | undefined;
    textSize?: Settings['textSize'] | undefined;
    sortOrder?: Settings['sortOrder'] | undefined;
    loop?: boolean | undefined;
  },
  database: Database = defaultDb,
): Promise<SettingsWire> {
  const current = await loadSettings(userId, database);
  const merged: SettingsWire = {
    ...current,
    audioSpeed: patch.audioSpeed ?? current.audioSpeed,
    repetitions: patch.repetitions ?? current.repetitions,
    pauseMs: patch.pauseMs ?? current.pauseMs,
    textSize: patch.textSize ?? current.textSize,
    sortOrder: patch.sortOrder ?? current.sortOrder,
    loop: patch.loop ?? current.loop,
  };
  const rowValues = wireToRow(merged);

  // INSERT ... ON CONFLICT (user_id) DO UPDATE — keeps the patch
  // idempotent across concurrent writes from multiple tabs.
  await database
    .insert(userSettings)
    .values({
      userId,
      ...rowValues,
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        ...rowValues,
        updatedAt: new Date(),
      },
    });

  return merged;
}

// Silence the unused-import lint warning on UserSettingsRow — keep
// the type re-export for downstream code that wants the raw shape.
void (null as unknown as UserSettingsRow | undefined);