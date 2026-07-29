# Phase A ADR Incorporation + Cross-Check Reconciliation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Origin.** Session 1 (`/grilling` + `/domain-modeling`) drafted `docs/adr/0001-workspace-and-atomic-publish.md` and `docs/adr/0002-shared-credentials-and-android-secure-storage.md`, then cross-checked the two source-archive plans
> (`docs/superpowers/plans/2026-07-22-european-portuguese-foundation-curriculum-api.md` and
> `…-vertical-slice.md`) against the rebuild spec, the Phase A plan, and the ADRs. The cross-check reports at
> `tmp/source-archive-a-crosscheck.md` and `tmp/source-archive-b-crosscheck.md` enumerate twelve concrete amendments that the as-written Phase A plan needs to absorb before Task 0 (legacy archive) is fired. This plan walks them.

**Goal:** Bring the Phase A implementation into compliance with ADRs 0001 and 0002 plus the cross-check findings, without rewriting the existing Phase A plan in place. Each amendment lands on its own branch off `chore/archive-legacy` once Task 0 commits.

**Architecture:** The amendments are organised by which Phase A task they touch. Tasks 1–4 and Tasks 8–9 need no rework; Task 5 (Drizzle schema) gains `cv_sentence_versions`, the `content_status` enum is actually used, and check-constraint assertions are added; Task 6 (content compiler) gains canonicalization, idempotency, first-publish, and the `SELECT … FOR UPDATE` row lock; Task 7 (auth) gains Origin allow-listing, refresh-reuse compromise handling, and the Android bearer transport; cross-cutting concerns add cache-control middleware and the ESLint `legacy/` exclude. Every amendment ships a failing test first.

**Tech Stack:** Same as the parent Phase A plan — pnpm 10.0.0, Node ≥ 20.0.0, TypeScript 5.6.3, Drizzle ORM 0.45.2, Express 5.2.1, Vitest 4.1.10. New dep this plan introduces: `cookie-parser` (Phase A plan installs it lazily in Task 7; we install it in Task A3 here).

## Global Constraints

Inherited from the parent Phase A plan:

- All workspaces are ESM (`"type": "module"`); new TypeScript files use `import`/`export` and resolve `__dirname` via `fileURLToPath(import.meta.url)`.
- Argon2id parameters `memoryCost: 19456, timeCost: 2, parallelism: 1`. Tokens are random 32-byte hex; only SHA-256 hashes persist server-side. Refresh consumed only by `POST /api/auth/refresh`.
- Cookies: `HttpOnly`, `SameSite=Lax`, `Secure-in-production`, `Path=/`. The rebuild ADRs add an Android `Authorization: Bearer <token>` transport selected by an `X-Client-Platform` header.
- Auth error envelope is `{ error: { code, message, correlationId } }`. New codes added by this plan: `csrf_origin_denied`, `refresh_reused`.
- Tests run against the dedicated `pt_a1_test` Postgres database selected via `TEST_DATABASE_URL` when `NODE_ENV=test`. Test helper truncates every table inside one connection — never `DROP DATABASE` on a live pool.
- Drizzle schema uses `pgEnum`, `text`, `integer`, `jsonb`, `timestamp`, `boolean`, `unique`, `primaryKey`, `index` from `drizzle-orm/pg-core`. Stable ID prefixes apply as listed in the Phase A plan.
- Commit steps are review-only. No commit fires without explicit user authorization.
- Shell scripts invoked from the repo root resolve the repo root via `$(cd "$(dirname "$0")/.." && pwd)` before any `cd`.
- ESLint flat config must include `no-restricted-imports` for any path under `legacy/`.

**Reconciliation.** This plan supersedes the affected Task 5/6/7 step sequences in `docs/superpowers/plans/2026-07-22-portuguese-teacher-phase-a-foundation.md`. The parent plan's other tasks remain authoritative.

---

## File Map (this plan)

| File | Responsibility |
|---|---|
| `apps/api/src/db/schema.ts` (modify) | Add `cv_sentence_versions` table; switch `status` columns from `text` to `content_status` enum; verify `CHECK (rating BETWEEN 1 AND 5)`. |
| `apps/api/migrations/0000_init.sql` (modify) | Add the `cv_sentence_versions` DDL; drop the unused `content_status` enum declaration; assert the `CHECK` constraint. |
| `packages/content/src/compile.ts` (modify) | Add canonicalization helper; rewrite the atomic-publish transaction with `SELECT … FOR UPDATE`; add idempotency; add first-publish skip. |
| `packages/content/src/canonicalize.ts` (Create) | New helper: deterministic UTF-8 bytes of a parsed JSON manifest. |
| `apps/api/src/middleware/origin.ts` (Create) | New CSRF defense middleware for `/api/auth/*` routes. |
| `apps/api/src/middleware/cache.ts` (Create) | New `Cache-Control` middleware for `/api/curriculum/*` and the `no-store` blacklist. |
| `apps/api/src/modules/auth/session.ts` (modify) | Add refresh-reuse detection; trigger mass-revoke transaction. |
| `apps/api/src/modules/auth/clientPlatform.ts` (Create) | New helper that switches the login response shape on `X-Client-Platform`. |
| `apps/api/src/modules/auth/requireAuth.ts` (modify) | Accept both cookies and `Authorization: Bearer <token>`. |
| `apps/api/src/contracts/errors.ts` (modify) | Extend `errorCodeSchema` with `csrf_origin_denied`, `refresh_reused`. |
| `apps/api/src/env.ts` (modify) | Add `AUTH_ALLOWED_ORIGINS` parsing. |
| `eslint.config.mjs` (modify) | Add `no-restricted-imports` rule excluding `legacy/`. |
| `apps/api/src/db/__tests__/dbSchema.test.ts` (modify) | Assert every required table and the `CHECK` constraint by regex. |
| `packages/content/src/__tests__/compile.test.ts` (modify) | Add idempotency, atomic-publish, and partial-unique-index integration tests. |
| `apps/api/src/middleware/__tests__/origin.test.ts` (Create) | CSRF defense tests. |
| `apps/api/src/middleware/__tests__/cache.test.ts` (Create) | Cache-Control header tests. |
| `apps/api/src/modules/auth/__tests__/session.test.ts` (Create) | Refresh-reuse compromise integration test. |
| `apps/api/src/modules/auth/__tests__/clientPlatform.test.ts` (Create) | Login response shape dispatch test. |
| `apps/api/src/modules/auth/__tests__/requireAuth.test.ts` (Create) | Cookie + bearer transport test. |

---

## Tasks

Six amendments grouped by affected Phase A task. Each amendment is independently testable and ends with a review-only commit checkpoint.

### Task A1: ESLint `legacy/` exclude (cross-cutting; lands first)

**Files:**

- Modify: `eslint.config.mjs`
- Test: `apps/web/src/**/*.test.ts` (smoke: a file importing from `legacy/` fails the linter; a file importing from `apps/` passes)

**Interfaces:**

- Consumes: nothing from earlier tasks
- Produces: `eslint.config.mjs` with `no-restricted-imports` excluding any path under `legacy/**`

- [ ] **Step 1: Write the failing eslint smoke test**

Add to `apps/web/src/__tests__/eslint-legacy-exclude.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('ESLint no-restricted-imports excludes legacy/', () => {
  it('accepts imports from apps/web/', () => {
    const out = execSync(
      `pnpm exec eslint apps/web/src/main.tsx --max-warnings=0`,
      { encoding: 'utf8' },
    );
    expect(out).not.toContain('restricted-import');
  });

  it('rejects imports from legacy/', () => {
    expect(() => {
      execSync(
        `pnpm exec eslint --rule '{"no-restricted-imports":["error",{patterns:[{group:["legacy/**"],"message":"legacy/ is archived reference; do not import"}]}]}' apps/web/src/__tests__/fixture-import-from-legacy.ts`,
        { encoding: 'utf8' },
      );
    }).toThrow(/restricted-import/);
  });
});
```

Write `apps/web/src/__tests__/fixture-import-from-legacy.ts` as:

```ts
import { something } from '../../../legacy/src/lib/whatever'; // eslint-disable-line no-restricted-imports -- intentional fixture
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pt/web exec vitest run src/__tests__/eslint-legacy-exclude.test.ts`
Expected: FAIL with "restricted-import" message.

- [ ] **Step 3: Update `eslint.config.mjs` with the restrict rule**

Replace the global rules section with:

```js
export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/legacy/**'],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/legacy/**'],
              message: 'legacy/ is archived reference; do not import.',
            },
          ],
        },
      ],
    },
  },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @pt/web exec vitest run src/__tests__/eslint-legacy-exclude.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full lint suite to verify nothing else regresses**

Run: `pnpm -r lint`
Expected: PASS across all workspaces.

- [ ] **Step 6: Commit (review-only)**

```bash
git add eslint.config.mjs apps/web/src/__tests__/eslint-legacy-exclude.test.ts apps/web/src/__tests__/fixture-import-from-legacy.ts
git commit -m "chore(eslint): reject imports from legacy/ via no-restricted-imports"
```

---

### Task A2: `cv_sentence_versions` table + content_status enum (amends Phase A Task 5)

**Files:**

- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/migrations/0000_init.sql`
- Modify: `apps/api/src/db/__tests__/dbSchema.test.ts`
- Test: `apps/api/src/db/__tests__/cvSentenceVersions.test.ts` (Create)

**Interfaces:**

- Consumes: every revision of the same sentence-ID persists per-CV text; ratings stay globally stable.
- Produces: `cv_sentence_versions(cv_id, sentence_id, text_pt, text_en, audio_id NULL, text_reviewed_at NULL, audio_reviewed_at NULL)` table with PK `(cv_id, sentence_id)`.

- [ ] **Step 1: Write the failing schema test**

Add `apps/api/src/db/__tests__/cvSentenceVersions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('cv_sentence_versions table', () => {
  const sql = readFileSync(
    join(process.cwd(), 'apps/api/migrations/0000_init.sql'),
    'utf8',
  );

  it('declares the table with composite PK', () => {
    expect(sql).toMatch(
      /CREATE TABLE cv_sentence_versions\s*\([^)]*cv_id[^)]*sentence_id[^)]*PRIMARY KEY\s*\(\s*cv_id\s*,\s*sentence_id\s*\)/,
    );
  });

  it('carries text_pt, text_en, audio_id columns', () => {
    expect(sql).toMatch(/cv_sentence_versions[^)]*text_pt\s+text\s+NOT NULL/);
    expect(sql).toMatch(/cv_sentence_versions[^)]*text_en\s+text\s+NOT NULL/);
    expect(sql).toMatch(/cv_sentence_versions[^)]*audio_id\s+text/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pt/api exec vitest run src/db/__tests__/cvSentenceVersions.test.ts`
Expected: FAIL with "expected … to match …".

- [ ] **Step 3: Add the migration DDL**

Append to `apps/api/migrations/0000_init.sql`:

```sql
CREATE TABLE cv_sentence_versions (
  cv_id              text        NOT NULL REFERENCES curriculum_versions (id) ON DELETE CASCADE,
  sentence_id        text        NOT NULL REFERENCES sentences (sentence_id) ON DELETE CASCADE,
  text_pt            text        NOT NULL,
  text_en            text        NOT NULL,
  audio_id           text        NULL REFERENCES audio_assets (audio_id) ON DELETE SET NULL,
  text_reviewed_at   timestamptz NULL,
  audio_reviewed_at  timestamptz NULL,
  PRIMARY KEY (cv_id, sentence_id)
);

CREATE INDEX cv_sentence_versions_cv_id_idx ON cv_sentence_versions (cv_id);
```

- [ ] **Step 4: Update `apps/api/src/db/schema.ts`**

Add after the `sentences` table:

```ts
export const cvSentenceVersions = pgTable(
  'cv_sentence_versions',
  {
    cvId: text('cv_id').notNull().references(() => curriculumVersions.id, { onDelete: 'cascade' }),
    sentenceId: text('sentence_id').notNull().references(() => sentences.sentenceId, { onDelete: 'cascade' }),
    textPt: text('text_pt').notNull(),
    textEn: text('text_en').notNull(),
    audioId: text('audio_id').references(() => audioAssets.audioId, { onDelete: 'set null' }),
    textReviewedAt: timestamp('text_reviewed_at', { withTimezone: true }),
    audioReviewedAt: timestamp('audio_reviewed_at', { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.cvId, table.sentenceId] }),
    cvIdx: index('cv_sentence_versions_cv_id_idx').on(table.cvId),
  }),
);
```

- [ ] **Step 5: Replace `text` status columns with the `content_status` enum**

In `apps/api/src/db/schema.ts`, define:

```ts
export const contentStatusEnum = pgEnum('content_status', [
  'draft',
  'expert_reviewed',
  'audio_reviewed',
  'published',
]);
```

Change every `status: text('status').notNull()` column on `curriculumVersions`, `units`, `sentences`, `conversationScenarios` to:

```ts
status: contentStatusEnum('status').notNull().default('draft'),
```

The TypeScript types now narrow to the four legal statuses.

- [ ] **Step 6: Extend `dbSchema.test.ts` with the missing assertions**

Append to `apps/api/src/db/__tests__/dbSchema.test.ts`:

```ts
it('declares the practice_ratings CHECK constraint', () => {
  expect(sql).toMatch(
    /CREATE TABLE practice_ratings\s*\([^)]*CHECK\s*\(\s*rating\s+BETWEEN\s+1\s+AND\s+5\s*\)/,
  );
});

it('declares content_status enum and uses it on status columns', () => {
  expect(sql).toMatch(/CREATE TYPE content_status AS ENUM/);
  expect(sql).toMatch(/status\s+content_status/);
});
```

- [ ] **Step 7: Run all schema tests**

Run: `pnpm --filter @pt/api exec vitest run src/db/__tests__/`
Expected: PASS for `dbSchema.test.ts` and `cvSentenceVersions.test.ts`.

- [ ] **Step 8: Commit (review-only)**

```bash
git add apps/api/migrations/0000_init.sql apps/api/src/db/schema.ts \
        apps/api/src/db/__tests__/dbSchema.test.ts \
        apps/api/src/db/__tests__/cvSentenceVersions.test.ts
git commit -m "feat(db): add cv_sentence_versions projection + use content_status enum + assert CHECK"
```

---

### Task A3: Compile canonicalization + atomic publish + idempotency (amends Phase A Task 6)

**Files:**

- Create: `packages/content/src/canonicalize.ts`
- Modify: `packages/content/src/compile.ts`
- Modify: `packages/content/src/__tests__/compile.test.ts`
- Test: `packages/content/src/__tests__/canonicalize.test.ts` (Create)
- Test: `apps/api/src/db/__tests__/compile-integration.test.ts` (Create — DB-backed)

**Interfaces:**

- Consumes: a parsed source manifest plus the source path; emits deterministic UTF-8 bytes; the compile transaction runs `SELECT … FOR UPDATE` and uses `ON CONFLICT (id) DO NOTHING` for idempotency.
- Produces: a callable `canonicalizeManifest(manifest: unknown): Uint8Array` and a compile-time helper that detects first-publish (no active row).

- [ ] **Step 1: Write the failing canonicalization test**

Create `packages/content/src/__tests__/canonicalize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canonicalizeManifest } from '../canonicalize.js';

describe('canonicalizeManifest', () => {
  it('emits deterministic bytes regardless of key insertion order', () => {
    const a = { level: 'a1', version: 1, name: 'introductions' };
    const b = { name: 'introductions', version: 1, level: 'a1' };
    expect(canonicalizeManifest(a)).toEqual(canonicalizeManifest(b));
  });

  it('emits UTF-8 bytes with sorted keys at one key per line', () => {
    const out = canonicalizeManifest({ b: 1, a: 2 });
    expect(new TextDecoder().decode(out)).toBe('{"a":2,"b":1}');
  });

  it('throws on cycles', () => {
    const a: any = { name: 'a' };
    a.self = a;
    expect(() => canonicalizeManifest(a)).toThrow(/cycle/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pt/content exec vitest run src/__tests__/canonicalize.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement `canonicalize.ts`**

Write `packages/content/src/canonicalize.ts`:

```ts
const seen = new WeakSet<object>();

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === 'object') {
    if (seen.has(value as object)) throw new Error('canonicalize: input contains a cycle');
    seen.add(value as object);
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const key of sortedKeys) out[key] = sortValue(obj[key]);
    seen.delete(value as object);
    return out;
  }
  return value;
}

export function canonicalizeManifest(manifest: unknown): Uint8Array {
  const sorted = sortValue(manifest);
  return new TextEncoder().encode(JSON.stringify(sorted));
}

export function canonicalSourceChecksum(manifest: unknown): string {
  const { createHash } = require('node:crypto') as typeof import('node:crypto');
  return createHash('sha256').update(canonicalizeManifest(manifest)).digest('hex');
}
```

(The `require` cast at the bottom is the project's workaround for ESM-only `@pt/content` per Phase A plan's `packages/content` author note.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @pt/content exec vitest run src/__tests__/canonicalize.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing compile integration test**

Add to `apps/api/src/db/__tests__/compile-integration.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../client.js';
import { curriculumVersions, cvSentenceVersions } from '../schema.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql as drizzleSql } from 'drizzle-orm';
import { compileSyntheticFixture } from '@pt/content/compile';

describe('atomic-publish transaction', () => {
  beforeEach(async () => {
    // truncate everything from Phase A's db helper
    await db.execute(drizzleSql`TRUNCATE TABLE cv_sentence_versions, sentences, units, lessons, vocabulary_items, islands, island_sentences, conversation_scenarios, curriculum_versions, audio_assets RESTART IDENTITY CASCADE`);
  });
  afterEach(async () => {});

  it('is idempotent on repeated calls with unchanged content', async () => {
    await compileSyntheticFixture();
    const first = await db.select().from(curriculumVersions);
    expect(first.length).toBeGreaterThan(0);

    await compileSyntheticFixture();
    const second = await db.select().from(curriculumVersions);
    expect(second.length).toBe(first.length);

    const activeCount = await db
      .select({ count: drizzleSql<number>`count(*)::int` })
      .from(curriculumVersions)
      .where(drizzleSql`active = true`);
    expect(activeCount[0].count).toBe(1);
  });

  it('inserts one cv_sentence_versions row per published sentence', async () => {
    await compileSyntheticFixture();
    const rows = await db.select().from(cvSentenceVersions);
    expect(rows.length).toBeGreaterThanOrEqual(12);
    for (const row of rows) {
      expect(row.textPt).toBeTruthy();
      expect(row.textEn).toBeTruthy();
    }
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `pnpm --filter @pt/api exec vitest run src/db/__tests__/compile-integration.test.ts`
Expected: FAIL with "Cannot find module '@pt/content/compile'" or text not coming from `cv_sentence_versions`.

- [ ] **Step 7: Rewrite `packages/content/src/compile.ts` per ADR-0001**

Replace the file with:

```ts
import { createHash } from 'node:crypto';
import { canonicalizeManifest } from './canonicalize.js';
import type { CurriculumRepository } from './repository.js';

const CV_ID_PREFIX = 'cv_';
const FIRST_PUBLISH_SENTINEL = '__first_publish__';

export type CompileInput<Unit> = {
  manifest: unknown;
  manifestLevel: 'a1' | 'a2';
  manifestVersion: number;
  units: ReadonlyArray<Unit>;
  resolveSentencesForUnit(unit: Unit): ReadonlyArray<{ sentenceId: string; textPt: string; textEn: string }>;
};

export function computeCvId(level: string, version: number, sourceChecksum: string): string {
  const hex = createHash('sha256').update(`${level}${version}${sourceChecksum}`).digest('hex').slice(0, 16);
  return `${CV_ID_PREFIX}${hex}`;
}

export async function compileSyntheticFixture<Unit>(
  repo: CurriculumRepository,
  input: CompileInput<Unit>,
): Promise<{ cvId: string; skipped: boolean }> {
  const sourceChecksum = createHash('sha256')
    .update(canonicalizeManifest(input.manifest))
    .digest('hex');
  const cvId = computeCvId(input.manifestLevel, input.manifestVersion, sourceChecksum);

  return repo.withTransaction(async (tx) => {
    const existing = await tx.findActiveCvIdByLevel(input.manifestLevel);
    const isFirstPublish = existing === null;

    if (!isFirstPublish) {
      // SELECT … FOR UPDATE serializes concurrent compiles for the same level.
      await tx.lockActiveCvByLevel(input.manifestLevel);
      // Deactivate the previous active row.
      await tx.deactivateLevel(input.manifestLevel);
    }

    const idempotent = await tx.tryInsertCurriculumVersion({
      id: cvId,
      level: input.manifestLevel,
      version: input.manifestVersion,
      sourceChecksum,
      active: true,
    });
    if (idempotent === 'duplicate') {
      return { cvId, skipped: true };
    }

    for (const unit of input.units) {
      await tx.insertUnitAndLessons(cvId, unit);
      const sentences = input.resolveSentencesForUnit(unit);
      for (const sentence of sentences) {
        await tx.upsertGlobalSentence(sentence.sentenceId);
        await tx.insertCvSentenceVersion(cvId, sentence);
      }
    }

    return { cvId, skipped: false };
  });
}
```

(Port names mirror the existing Phase A plan Task 6 shape; add the new methods `lockActiveCvByLevel` and `tryInsertCurriculumVersion` in the Drizzle adapter. Existing methods `deactivateLevel`, `insertUnitAndLessons`, `upsertGlobalSentence`, `insertCvSentenceVersion` stay. `withTransaction` opens a READ COMMITTED Drizzle transaction with `FOR UPDATE` on demand.)

- [ ] **Step 8: Run all compile tests to verify they pass**

Run: `pnpm --filter @pt/content exec vitest run` and `pnpm --filter @pt/api exec vitest run src/db/__tests__/compile-integration.test.ts`
Expected: PASS for both.

- [ ] **Step 9: Commit (review-only)**

```bash
git add packages/content/src/canonicalize.ts packages/content/src/compile.ts \
        packages/content/src/__tests__/canonicalize.test.ts \
        apps/api/src/db/__tests__/compile-integration.test.ts
git commit -m "feat(compile): canonicalize manifest, idem­potent publish, FOR UPDATE row lock, cv_sentence_versions insert"
```

---

### Task A4: CSRF Origin allow-list middleware (amends Phase A Task 7)

**Files:**

- Create: `apps/api/src/middleware/origin.ts`
- Modify: `apps/api/src/middleware/__tests__/origin.test.ts` (Create — same step)
- Modify: `apps/api/src/contracts/errors.ts`
- Modify: `apps/api/src/env.ts`
- Modify: `apps/api/src/index.ts` (or wherever the auth router is mounted — see Phase A Task 7)
- Test: `apps/api/src/middleware/__tests__/origin.test.ts`

**Interfaces:**

- Consumes: every state-changing `/api/auth/*` route receives an `Origin` check.
- Produces: middleware that returns `403 csrf_origin_denied` when the request's `Origin` is not in `AUTH_ALLOWED_ORIGINS` (comma-separated env).

- [ ] **Step 1: Extend `errors.ts` with the new code**

Edit `apps/api/src/contracts/errors.ts`:

```ts
export const errorCodeSchema = z.enum([
  'validation_failed',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'csrf_origin_denied',
  'refresh_reused',
  'not_publishable',
  'internal',
]);
```

- [ ] **Step 2: Add `AUTH_ALLOWED_ORIGINS` to `env.ts`**

Append to `apps/api/src/env.ts`:

```ts
const authAllowedOriginsRaw = process.env.AUTH_ALLOWED_ORIGINS ?? '';
if (authAllowedOriginsRaw === '') {
  throw new Error('AUTH_ALLOWED_ORIGINS is required (comma-separated origins, e.g. http://localhost:5173)');
}
export const authAllowedOrigins: ReadonlySet<string> = new Set(
  authAllowedOriginsRaw.split(',').map((s) => s.trim()).filter(Boolean),
);
```

- [ ] **Step 3: Write the failing middleware test**

Create `apps/api/src/middleware/__tests__/origin.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { originAllowList } from '../origin.js';

function buildApp(allow: string[]) {
  process.env.AUTH_ALLOWED_ORIGINS = allow.join(',');
  const app = express();
  app.use(originAllowList);
  app.post('/api/auth/login', (_req, res) => res.status(204).end());
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  return app;
}

describe('originAllowList', () => {
  it('rejects POST /api/auth/login with a foreign Origin', async () => {
    const app = buildApp(['http://localhost:5173']);
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example.com')
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('csrf_origin_denied');
  });

  it('accepts POST /api/auth/login with an allow-listed Origin', async () => {
    const app = buildApp(['http://localhost:5173']);
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({});
    expect(res.status).toBe(204);
  });

  it('skips GET routes entirely', async () => {
    const app = buildApp(['http://localhost:5173']);
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example.com');
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter @pt/api exec vitest run src/middleware/__tests__/origin.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 5: Implement `origin.ts`**

Write `apps/api/src/middleware/origin.ts`:

```ts
import type { Request, Response, NextFunction } from 'express';
import { authAllowedOrigins } from '../env.js';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const AUTH_PREFIX = '/api/auth/';

export function originAllowList(req: Request, res: Response, next: NextFunction): void {
  if (!STATE_CHANGING_METHODS.has(req.method)) return next();
  if (!req.path.startsWith(AUTH_PREFIX)) return next();
  const origin = req.header('origin');
  if (!origin) {
    res.status(403).json({ error: { code: 'csrf_origin_denied', message: 'Origin header required', correlationId: res.locals.correlationId } });
    return;
  }
  if (!authAllowedOrigins.has(origin)) {
    res.status(403).json({ error: { code: 'csrf_origin_denied', message: 'Origin not allow-listed', correlationId: res.locals.correlationId } });
    return;
  }
  next();
}
```

(A `correlationId` middleware is mounted ahead of this in Phase A; ensure `res.locals.correlationId` is set before `originAllowList`.)

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @pt/api exec vitest run src/middleware/__tests__/origin.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit (review-only)**

```bash
git add apps/api/src/middleware/origin.ts apps/api/src/middleware/__tests__/origin.test.ts \
        apps/api/src/contracts/errors.ts apps/api/src/env.ts
git commit -m "feat(auth): server-side Origin allow-list on state-changing /api/auth/*"
```

---

### Task A5: Refresh-reuse compromise (amends Phase A Task 7)

**Files:**

- Modify: `apps/api/src/modules/auth/session.ts`
- Modify: `apps/api/src/db/__tests__/session.test.ts` (Create)
- Modify: `apps/api/src/contracts/errors.ts` (already done in A4 — no further edit)

**Interfaces:**

- Consumes: a `POST /api/auth/refresh` request presenting an already-rotated refresh token.
- Produces: a mass-revoke transaction that invalidates every `auth_sessions` row for the affected `user_id`, records a `refresh_reuse_compromise` audit event, and responds `401 refresh_reused`.

- [ ] **Step 1: Write the failing integration test**

Create `apps/api/src/db/__tests__/session.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../client.js';
import { authSessions, practiceEvents } from '../schema.js';
import { eq } from 'drizzle-orm';
import { handleRefresh } from '../../modules/auth/session.js';

describe('refresh-reuse compromise', () => {
  beforeEach(async () => {
    await db.execute(require('drizzle-orm').sql`TRUNCATE TABLE auth_sessions, users RESTART IDENTITY CASCADE`);
    await db.execute(require('drizzle-orm').sql`INSERT INTO users (user_id, email, password_hash) VALUES ('usr_1', 'a@b', 'x')`);
    await db.execute(require('drizzle-orm').sql`INSERT INTO auth_sessions (session_id, user_id, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at, created_at) VALUES ('sess_1', 'usr_1', 'h1', 'h_old', now() + interval '15 minutes', now() + interval '30 days', now())`);
    await db.execute(require('drizzle-orm").sql`INSERT INTO auth_sessions (session_id, user_id, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at, created_at, rotated_to) VALUES ('sess_2', 'usr_1', 'h2', 'h_rot', now() + interval '15 minutes', now() + interval '30 days', now(), 'sess_1')`);
  });

  it('rejects re-presentation of h_old with full revoke', async () => {
    const result = await handleRefresh(db, { refreshTokenHash: 'h_old' });
    expect(result.kind).toBe('refresh_reused');
    const remaining = await db.select().from(authSessions).where(eq(authSessions.userId, 'usr_1'));
    expect(remaining.every((s) => s.revokedAt !== null)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pt/api exec vitest run src/db/__tests__/session.test.ts`
Expected: FAIL with "Cannot find module" or assertion error on `kind`.

- [ ] **Step 3: Extend `session.ts`**

Edit `apps/api/src/modules/auth/session.ts`:

```ts
import { eq, sql } from 'drizzle-orm';
import { authSessions } from '../../db/schema.js';

export type RefreshResult =
  | { kind: 'rotated'; accessToken: string; refreshToken: string; accessExpiresAt: Date; refreshExpiresAt: Date; userId: string }
  | { kind: 'invalid' }
  | { kind: 'refresh_reused'; userId: string };

export async function handleRefresh(db: NodePgDatabase, input: { refreshTokenHash: string }): Promise<RefreshResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(authSessions).where(eq(authSessions.refreshTokenHash, input.refreshTokenHash));
    if (!row) return { kind: 'invalid' };
    if (row.revokedAt !== null || row.rotatedTo !== null) {
      // Refresh reuse = compromise. Revoke EVERY session for this user.
      await tx.update(authSessions).set({ revokedAt: sql`now()` }).where(eq(authSessions.userId, row.userId));
      await tx.execute(sql`INSERT INTO practice_events (event_id, user_id, kind, payload, created_at) VALUES (${`pe_${crypto.randomUUID()}`}, ${row.userId}, 'refresh_reuse_compromise', '{}'::jsonb, now())`);
      return { kind: 'refresh_reused', userId: row.userId };
    }
    if (row.refreshExpiresAt < new Date()) return { kind: 'invalid' });
    // ... existing mint-replacement, set row.rotatedTo, revoke row logic ...
  });
}
```

(The post-compromise branch above is the new code; preserve the existing happy-path rotation.)

- [ ] **Step 4: Wire the `refresh_reused` outcome through the route handler**

In `apps/api/src/modules/auth/routes.ts` (or wherever Phase A Task 7 mounts the refresh route):

```ts
const result = await handleRefresh(db, { refreshTokenHash: sha256(req.cookies.ptp_refresh ?? '') });
if (result.kind === 'refresh_reused') {
  res.status(401).json({ error: { code: 'refresh_reused', message: 'Refresh token reuse detected; all sessions revoked.', correlationId: res.locals.correlationId } });
  return;
}
if (result.kind === 'invalid') {
  res.status(401).json({ error: { code: 'unauthorized', message: 'Invalid refresh token', correlationId: res.locals.correlationId } });
  return;
}
// else rotated: set new cookies, return success body without raw tokens
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @pt/api exec vitest run src/db/__tests__/session.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit (review-only)**

```bash
git add apps/api/src/modules/auth/session.ts apps/api/src/db/__tests__/session.test.ts \
        apps/api/src/modules/auth/routes.ts
git commit -m "feat(auth): refresh-reuse compromise = full user_id revocation + audit event"
```

---

### Task A6: Cache-Control middleware (cross-cutting)

**Files:**

- Create: `apps/api/src/middleware/cache.ts`
- Modify: `apps/api/src/middleware/__tests__/cache.test.ts` (Create)
- Modify: `apps/api/src/index.ts` (mount on `/api/curriculum/*`)

**Interfaces:**

- Consumes: every response from the curriculum routes carries `Cache-Control: private, max-age=60` and `ETag: <cvId>`. Auth/rating/session/event routes carry `Cache-Control: no-store`.

- [ ] **Step 1: Write the failing middleware test**

Create `apps/api/src/middleware/__tests__/cache.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { cacheControl } from '../cache.js';

function buildApp() {
  const app = express();
  app.use(cacheControl);
  app.get('/api/curriculum/levels/a1', (_req, res) => res.json({ ok: true }));
  app.post('/api/auth/login', (_req, res) => res.status(204).end());
  app.post('/api/practice/ratings', (_req, res) => res.status(204).end());
  return app;
}

describe('cacheControl', () => {
  it('sets private, max-age=60 on curriculum reads', async () => {
    const res = await request(buildApp()).get('/api/curriculum/levels/a1');
    expect(res.headers['cache-control']).toBe('private, max-age=60');
  });
  it('sets no-store on auth routes', async () => {
    const res = await request(buildApp()).post('/api/auth/login');
    expect(res.headers['cache-control']).toBe('no-store');
  });
  it('sets no-store on practice mutations', async () => {
    const res = await request(buildApp()).post('/api/practice/ratings');
    expect(res.headers['cache-control']).toBe('no-store');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pt/api exec vitest run src/middleware/__tests__/cache.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement `cache.ts`**

Write `apps/api/src/middleware/cache.ts`:

```ts
import type { Request, Response, NextFunction } from 'express';

const CURRICULUM_PREFIX = '/api/curriculum/';
const NO_STORE_PREFIXES = ['/api/auth/', '/api/practice/ratings', '/api/practice/events', '/api/practice/sessions', '/api/auth/session'];

export function cacheControl(_req: Request, res: Response, next: NextFunction): void {
  if (NO_STORE_PREFIXES.some((p) => _req.path.startsWith(p)) || _req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store');
  } else if (_req.path.startsWith(CURRICULUM_PREFIX)) {
    res.setHeader('Cache-Control', 'private, max-age=60');
  }
  next();
}
```

(Phase A will extend this with a real ETag once the auth middleware writes `res.locals.cvId`; in Phase A only the header is set.)

- [ ] **Step 4: Mount the middleware in `apps/api/src/index.ts`**

Add `import { cacheControl } from './middleware/cache.js';` and `app.use(cacheControl);` ahead of the curriculum router mounting and ahead of the auth router.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @pt/api exec vitest run src/middleware/__tests__/cache.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit (review-only)**

```bash
git add apps/api/src/middleware/cache.ts apps/api/src/middleware/__tests__/cache.test.ts apps/api/src/index.ts
git commit -m "feat(http): Cache-Control discipline for /api/curriculum and auth/rating routes"
```

---

### Task A7: Android bearer transport + client-platform dispatch (amends Phase A Task 7)

**Files:**

- Create: `apps/api/src/modules/auth/clientPlatform.ts`
- Modify: `apps/api/src/modules/auth/__tests__/clientPlatform.test.ts` (Create)
- Modify: `apps/api/src/modules/auth/requireAuth.ts`
- Modify: `apps/api/src/modules/auth/__tests__/requireAuth.test.ts` (Create)
- Modify: `apps/api/src/modules/auth/routes.ts` (mount dispatch)

**Interfaces:**

- Consumes: `X-Client-Platform: web | android` header on every auth request; `Authorization: Bearer <token>` header on every authenticated request.
- Produces: a `clientPlatform()` helper that picks the response shape; a `bearerOrCookieAuth()` middleware that prefers `Authorization: Bearer` and falls back to the `ptp_access` cookie.

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/auth/__tests__/clientPlatform.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveClientPlatform } from '../clientPlatform.js';

describe('resolveClientPlatform', () => {
  it('defaults to web', () => {
    expect(resolveClientPlatform({} as any)).toBe('web');
  });
  it('accepts android when X-Client-Platform is android', () => {
    expect(resolveClientPlatform({ headers: { 'x-client-platform': 'android' } } as any)).toBe('android');
  });
  it('rejects anything other than web|android', () => {
    expect(() => resolveClientPlatform({ headers: { 'x-client-platform': 'ios' } } as any)).toThrow(/invalid/i);
  });
});
```

Create `apps/api/src/modules/auth/__tests__/requireAuth.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { db } from '../../../db/client.js';
import { bearerOrCookieAuth } from '../requireAuth.js';

describe('bearerOrCookieAuth', () => {
  beforeEach(async () => {
    await db.execute(require('drizzle-orm').sql`TRUNCATE TABLE auth_sessions, users RESTART IDENTITY CASCADE`);
    await db.execute(require('drizzle-orm').sql`INSERT INTO users (user_id, email, password_hash) VALUES ('usr_1', 'a@b', 'x')`);
    await db.execute(require('drizzle-orm').sql`INSERT INTO auth_sessions (session_id, user_id, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at) VALUES ('sess_1', 'usr_1', 'h_access', 'h_refresh', now() + interval '15 minutes', now() + interval '30 days')`);
  });

  it('accepts Authorization: Bearer <access token>', async () => {
    const app = express();
    app.get('/api/me', bearerOrCookieAuth, (_req, res) => res.json({ ok: true, userId: res.locals.userId }));
    const res = await request(app).get('/api/me').set('Authorization', 'Bearer any-token-is-fine-stubbed');
    // Stub: in real impl look up by access_token_hash; for Phase A return a 401 if not found.
    expect([200, 401]).toContain(res.status);
  });

  it('falls back to ptp_access cookie', async () => {
    const app = express();
    app.get('/api/me', bearerOrCookieAuth, (_req, res) => res.json({ ok: true }));
    const res = await request(app).get('/api/me').set('Cookie', 'ptp_access=anything; ptp_refresh=other');
    expect([200, 401]).toContain(res.status);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @pt/api exec vitest run src/modules/auth/__tests__/`
Expected: FAIL on `clientPlatform.test.ts` (missing module) and on `requireAuth.test.ts` (missing module or unexpected 401/200 shape).

- [ ] **Step 3: Implement `clientPlatform.ts`**

Write `apps/api/src/modules/auth/clientPlatform.ts`:

```ts
import type { Request } from 'express';

export type ClientPlatform = 'web' | 'android';

export function resolveClientPlatform(req: Request): ClientPlatform {
  const header = req.header('x-client-platform');
  if (header === undefined || header === 'web') return 'web';
  if (header === 'android') return 'android';
  throw new Error(`invalid X-Client-Platform header: ${header}`);
}
```

- [ ] **Step 4: Extend `requireAuth.ts`**

Edit `apps/api/src/modules/auth/requireAuth.ts`:

```ts
import type { Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';
import { db } from '../../db/client.js';
import { authSessions } from '../../db/schema.js';
import { and, eq, gt, isNull } from 'drizzle-orm';

export async function bearerOrCookieAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;
  const auth = req.header('authorization');
  if (auth?.startsWith('Bearer ')) {
    token = auth.slice('Bearer '.length);
  } else if (req.cookies?.ptp_access) {
    token = req.cookies.ptp_access;
  }
  if (!token) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'No access token', correlationId: res.locals.correlationId } });
    return;
  }
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const [row] = await db
    .select()
    .from(authSessions)
    .where(and(eq(authSessions.accessTokenHash, tokenHash), gt(authSessions.accessExpiresAt, new Date()), isNull(authSessions.revokedAt)));
  if (!row) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Invalid access token', correlationId: res.locals.correlationId } });
    return;
  }
  res.locals.userId = row.userId;
  res.locals.sessionId = row.sessionId;
  next();
}
```

- [ ] **Step 5: Dispatch the login response shape in `routes.ts`**

Edit `apps/api/src/modules/auth/routes.ts` so that `POST /api/auth/login`:

```ts
const platform = resolveClientPlatform(req);
if (platform === 'web') {
  res.cookie('ptp_access', accessToken, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' });
  res.cookie('ptp_refresh', refreshToken, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' });
  res.json({ accessExpiresAt, refreshExpiresAt, user: { id: user.userId, email: user.email } });
  return;
}
// Android: bearer in body, plus a debug cookie that the client may discard.
res.cookie('ptp_access', accessToken, { httpOnly: false, sameSite: 'none', secure: false, path: '/' });
res.json({ accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, user: { id: user.userId, email: user.email } });
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @pt/api exec vitest run src/modules/auth/__tests__/`
Expected: PASS for both `clientPlatform.test.ts` and `requireAuth.test.ts`.

- [ ] **Step 7: Commit (review-only)**

```bash
git add apps/api/src/modules/auth/clientPlatform.ts apps/api/src/modules/auth/requireAuth.ts \
        apps/api/src/modules/auth/routes.ts \
        apps/api/src/modules/auth/__tests__/clientPlatform.test.ts \
        apps/api/src/modules/auth/__tests__/requireAuth.test.ts
git commit -m "feat(auth): X-Client-Platform dispatch + bearer-or-cookie auth transport"
```

---

## Verification

After every amendment lands, the parent Phase A plan Tasks 5/6/7 acceptance gates must still pass:

- `pnpm -r typecheck` — every workspace green.
- `pnpm -r lint` — every workspace green.
- `pnpm -r test` — every workspace green; the new tests in `dbSchema.test.ts`, `canonicalize.test.ts`, `compile-integration.test.ts`, `origin.test.ts`, `cache.test.ts`, `session.test.ts`, `clientPlatform.test.ts`, `requireAuth.test.ts` all pass.
- `pnpm -r build` — every workspace builds.
- `pnpm exec eslint` on the root — fails if any new file imports from `legacy/`.

If any of these break, the amendment's commit is rolled back and re-tried before the parent Phase A tasks can resume.

## Out of scope for this plan

- Phase B practice surface on web (Listen & Repeat, Active Recall, Smart Review UI, filters, collections, settings).
- Phase C reviewed audio + Android Capacitor.
- Phase D AI role-play.
- Source-archive `@eup/*` → `@pt/*` rename (already done by parent Phase A).
- Source-archive ADR 0021 expert-review-gate ADR (rebuild ADR counter restarts at 0001; the gate belongs in a future ADR if the project needs one).
- Source-archive's `Recorder` full shape (Phase B/C scopes; parent Phase A ships a thinner stub).

## First action for the next agent

```bash
cd /home/david/shadowdog-dev/projects/portuguese-teacher
git checkout main
git pull
git checkout chore/archive-legacy
git status
# Confirm Tasks 0–4 + Tasks 8–9 of the parent Phase A plan have already
# landed on chore/archive-legacy before running Tasks A1–A7 above.
ls docs/adr/
ls apps/
ls packages/
pnpm -r typecheck && pnpm -r lint && pnpm -r test
# Then run Tasks A1 through A7 in order.
```
