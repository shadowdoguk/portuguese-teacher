// Drizzle client for @pt/api.
//
// Wires the postgres-js driver against `DATABASE_URL` from `env.ts`
// and exposes a typed `db` object whose query surface derives from
// the schema in `./schema.ts`. Used by every repo in
// `apps/api/src/modules/*` once they land in Task 7+.

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '../env.js';
import * as schema from './schema.js';

const client = postgres(DATABASE_URL, {
  // Phase A defaults — pool sizing tuned per rebuild spec §11.2 once
  // load tests ship. Conservative for now: max 4 connections, idle
  // timeout 30s, prepares statements to amortise parse cost.
  max: 4,
  idle_timeout: 30,
  prepare: true,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;

export { schema };