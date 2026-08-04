// Drizzle client for @pt/api.
//
// Wires the postgres-js driver against `DATABASE_URL` from `env.ts`
// and exposes a typed `db` object whose query surface derives from
// the schema in `./schema.ts`. Used by every repo in
// `apps/api/src/modules/*` once they land in Task 7+.
//
// Phase B Task 3 lazy-init: the original implementation opened the
// postgres pool at module-load time. That broke the pre-DB test
// surface (any test that imports Express middleware transitively
// imports this file). The fix wraps `db` and `pool` in lazy getters
// so the connection is opened on first query. Production semantics
// are unchanged — every production code path that touches `db` still
// throws on missing `DATABASE_URL`, just at the call site rather
// than at boot.

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getDatabaseUrl } from '../env.js';
import * as schema from './schema.js';

type Schema = typeof schema;
type DbInstance = PostgresJsDatabase<Schema>;

let _client: ReturnType<typeof postgres> | undefined;
let _db: DbInstance | undefined;

function getPool(): ReturnType<typeof postgres> {
  if (_client === undefined) {
    _client = postgres(getDatabaseUrl(), {
      // Phase A defaults — pool sizing tuned per rebuild spec §11.2 once
      // load tests ship. Conservative for now: max 4 connections, idle
      // timeout 30s, prepares statements to amortise parse cost.
      max: 4,
      idle_timeout: 30,
      prepare: true,
    });
  }
  return _client;
}

function getDb(): DbInstance {
  if (_db === undefined) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

/**
 * Lazy `db` Proxy — every property access forwards to the lazily-
 * constructed Drizzle instance. Tests that import the practice
 * router without a live DB never trigger the pool open.
 */
export const db: DbInstance = new Proxy({} as DbInstance, {
  get(_target, prop): unknown {
    const instance = getDb();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop as string];
    if (typeof value === 'function') return value.bind(instance);
    return value;
  },
});

export type Database = typeof db;

export { schema };
