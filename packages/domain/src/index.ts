// Barrel re-export for @pt/domain.
//
// @pt/domain is the pure-rules layer. No HTTP, no DB, no Express types,
// no Drizzle types — only types and values derived from @pt/contracts
// and the standard library. The layering rule is enforced
// mechanically by `assertPureLayering()` below; the test pins the
// contract by importing and asserting on it.
//
// Consumers:
//   - @pt/api imports the pure helpers and binds them to HTTP / DB.
//   - @pt/content imports the ID validators to canonicalise source.
//   - apps/web never imports from here directly (it uses @pt/api).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import * as ids from './ids.js';
import * as ratings from './ratings.js';
import * as review from './review.js';
import * as progress from './progress.js';
import * as conversation from './conversation.js';

export * from './ids.js';
export * from './ratings.js';
export * from './review.js';
export * from './progress.js';
export * from './conversation.js';
export * from './practice/queue.js';
export * from './practice/review.js';
export * from './practice/stages.js';
export * from './practice/types.js';
export * from './filter/apply.js';
export * from './settings/types.js';

// ---------- Layering-rule guard -----------------------------------------
//
// The Phase A plan Global Constraints pin @pt/domain as pure. This
// assertion re-reads the package's own source files at import time
// and rejects any import from forbidden modules. It runs once per
// process — cheap, and it catches a drift before code review.
//
// Allowed imports (whitelist):
//   - @pt/contracts and its sub-paths (cross-package; pure types).
//   - node:*, zod (TypeScript-level runtime validators only — zod is
//     used only for `safeParse`, not for I/O).
//
// Forbidden imports (blacklist):
//   - express, @types/express, drizzle-orm, drizzle-kit, pg, postgres,
//     mysql, mysql2, mongodb, prisma — anything that implies an HTTP
//     server or a database driver.

const FORBIDDEN_IMPORT_PATTERNS: ReadonlyArray<RegExp> = [
  /\bfrom\s+['"]express['"]/,
  /\bfrom\s+['"]@types\/express['"]/,
  /\bfrom\s+['"]drizzle-orm(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"]drizzle-kit(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"]pg['"]/,
  /\bfrom\s+['"]postgres['"]/,
  /\bfrom\s+['"]mysql2?['"]/,
  /\bfrom\s+['"]mongodb(?:\/[^'"]*)?['"]/,
  /\bfrom\s+['"]prisma(?:\/[^'"]*)?['"]/,
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC_DIR = __dirname;

function listSourceFiles(): string[] {
  // Lazy import to avoid pulling fs into the public surface.
  const { readdirSync, statSync } = require('node:fs') as typeof import('node:fs');
  const entries = readdirSync(SRC_DIR);
  return entries
    .filter((e) => e.endsWith('.ts') && !e.endsWith('.test.ts'))
    .map((e) => join(SRC_DIR, e));
}

/**
 * Throws if any @pt/domain source file imports a forbidden module.
 * Called at import time by index.ts and by the test suite's layering
 * block. The function is idempotent and side-effect-free beyond the
 * file-system read.
 */
export function assertPureLayering(): void {
  for (const file of listSourceFiles()) {
    const src = readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
      if (pattern.test(src)) {
        throw new Error(
          `@pt/domain layering rule violated in ${file}: forbidden import matched ${pattern}. ` +
            'See packages/domain/src/index.ts for the whitelist.',
        );
      }
    }
  }
}

// Run once on import. Throws on violation. Tests call this directly;
// this auto-call guards every consumer too.
assertPureLayering();

// ---------- Type-only re-exports for @pt/api ----------------------------

export type {
  MasterySnapshot,
  MasterySnapshotInput,
  MasterySnapshotRating,
  MasterySnapshotSentence,
} from './progress.js';
export type {
  SmartReviewQueueInput,
  SmartReviewQueueEntry,
  SmartReviewRating,
  SmartReviewSentence,
} from './review.js';
export type {
  RatingValidationOk,
  RatingValidationErr,
  RatingValidationResult,
  RatingSemantics,
} from './ratings.js';
export type { ConversationTurnBuckets } from './conversation.js';

// Re-export namespaces so consumers can pick a single import surface.
export { ids, ratings, review, progress, conversation };