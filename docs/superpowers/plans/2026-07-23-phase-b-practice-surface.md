# Phase B — Practice Surface on Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the web-only practice surface for `a1-introductions` — Listen & Repeat (Shadow), Active Recall, Smart Review, filter, collections, settings, and a six-stage unit navigation — with audio playback reserved for Phase C and AI role-play reserved for Phase D.

**Architecture:** Phase B adds Zod contract schemas, four pure `@pt/domain` helpers, six Express route modules, and eight React routes on top of Phase A's foundation. The Practice module owns ratings + queue + review endpoints; the Settings module owns `PATCH /api/me/settings`; the Collections module owns CRUD endpoints; the Unit-Progress module owns a single stage-completion endpoint. The web app consumes these via `@tanstack/react-query` and renders the six-stage loop through `react-router` 7's nested routes. Audio "coming soon" empty states are wired through a single `<AudioComingSoon />` component so Phase C can replace them with one search-and-replace.

**Tech Stack:** Inherited from the parent Phase A plan. New dependencies this plan adds: `react-router 7.18.1` (already in Phase A), `MediaRecorder` from the browser (no `package.json` change), and the `@tanstack/react-query` 5 cache hooks that Phase A ships in `apps/web`.

## Global Constraints

Inherited from the parent Phase A plan and the Phase A ADR-incorporation plan:

- pnpm 10.0.0, Node ≥ 20.0.0.
- All workspaces are ESM (`"type": "module"`); new TypeScript files use `import`/`export`.
- The `@pt/contracts` package is consumed only via exports — never imported from `apps/api/src/db/` or `apps/web/src/`. The `@pt/domain` package is pure (no Drizzle, no Express types).
- Auth: `requireAuth()` per ADR-0002; cookies are the Phase B transport (Android bearer is Phase C). Authenticated mutating routes bucket by `auth_sessions.id` per `CONTEXT.md` "Rate Limit".
- Error envelope is `{ error: { code, message, correlationId } }`; the `errorCodeSchema` extended by this plan adds `practice_queue_empty`, `collection_name_required`, `collection_not_found`, `unit_not_found`, `stage_unknown`, `unit_progress_invalid_status`.
- Tests run against the dedicated `pt_a1_test` Postgres database selected via `TEST_DATABASE_URL` when `NODE_ENV=test`. Test helper truncates every table inside one connection — never `DROP DATABASE` on a live pool.
- Cache-Control per `CONTEXT.md` "Cache-Control Discipline" and amendment plan Task A6: `Cache-Control: private, max-age=60` + `ETag` on `/api/practice/queue`, `/api/practice/review`, `/api/collections/:id`; `Cache-Control: no-store` on `/api/practice/ratings`, `/api/collections*` mutations, `/api/me/settings`, `/api/unit-progress/*`.
- Settings columns: `audioSpeed` (0.5–2.0), `repetitions` (1–5), `pauseMs` (one of 0/500/1000/1500/2000/2500/3000/4000/5000/7000), `textSize` (small/default/large/extraLarge), `sortOrder` (curriculum/easyToHard/hardToEasy), `loop` (bool). Default row on first `GET` if missing.
- ESLint `no-restricted-imports` rejects `legacy/` paths (introduced in amendment plan Task A1).
- Audio is the Phase C deliverable. Microphone `MediaRecorder` is the Phase B local-only mechanism; no upload, no retention.
- Commit steps are review-only. No commit fires without explicit user authorization.

**Pre-requisite.** Tasks assume Phase A + the Phase A amendment plan (Tasks A1–A7) have merged to `main` and are present on the working branch. No Phase B task code lands before Task 0 (`chore/archive-legacy`) + Tasks 1–4 + Tasks 8–9 of the parent Phase A plan, plus amendment Tasks A1–A7, are on `main`.

---

## File Map (Phase B additions)

| File | Responsibility |
|---|---|
| `packages/contracts/src/practice.ts` (Create) | Zod schemas for `practiceItemSchema`, `ratingWriteSchema`, `practiceQueueQuerySchema`, `practiceQueueResponseSchema`, `reviewQueueResponseSchema`. |
| `packages/contracts/src/settings.ts` (Create) | Zod schema for the per-Learner settings shape (`audioSpeed`, `repetitions`, `pauseMs`, `textSize`, `sortOrder`, `loop`) and the partial-update body. |
| `packages/contracts/src/collections.ts` (Create) | Zod schemas for `collectionSchema`, `collectionItemSchema`, `createCollectionBodySchema`. |
| `packages/contracts/src/unitProgress.ts` (Create) | Zod schema for `unitProgressWriteSchema` (`{ status: 'complete' }`). |
| `packages/contracts/src/filter.ts` (Create) | Zod schema for `filterExpressionSchema` (comma-separated terms, ≤ 200 chars) and `matchModeSchema` (`'or' | 'all'`). |
| `packages/contracts/src/errors.ts` (modify) | Add `practice_queue_empty`, `collection_name_required`, `collection_not_found`, `unit_not_found`, `stage_unknown`, `unit_progress_invalid_status` to `errorCodeSchema`. |
| `packages/contracts/src/index.ts` (modify) | Re-export the new schemas. |
| `packages/domain/src/practice/queue.ts` (Create) | `buildPracticeQueue(unit, mode, settings, filter?)` pure helper. |
| `packages/domain/src/practice/review.ts` (Create) | `buildReviewQueue(userRatings, sentences, mode, limit)` pure helper. |
| `packages/domain/src/practice/stages.ts` (Create) | `STAGE_ORDER` enum + `nextStageRecommendation(unit, completedStages)` pure helper. |
| `packages/domain/src/filter/apply.ts` (Create) | `applyFilter(sentences, expr, matchAll)` pure helper. |
| `packages/domain/src/index.ts` (modify) | Re-export the new helpers. |
| `apps/api/src/modules/practice/routes.ts` (Create) | Mounts `POST /api/practice/ratings`, `GET /api/practice/queue`, `GET /api/practice/review`. |
| `apps/api/src/modules/practice/controller.ts` (Create) | Request → domain call → DB write/read → response, throws `error_envelope` on `4xx`. |
| `apps/api/src/modules/practice/repository.ts` (Create) | Drizzle queries for `practice_ratings` (PK-aware upsert with `client_mutation_id`), practice queue, and review queue. |
| `apps/api/src/modules/settings/routes.ts` (Create) | Mounts `GET /api/me/settings` and `PATCH /api/me/settings`. |
| `apps/api/src/modules/settings/controller.ts` (Create) | Settings read/write. Default row on first `GET`. |
| `apps/api/src/modules/settings/repository.ts` (Create) | Drizzle single-row get + upsert for `user_settings`. |
| `apps/api/src/modules/collections/routes.ts` (Create) | Mounts the six collection routes. |
| `apps/api/src/modules/collections/controller.ts` (Create) | Collection CRUD + item add/remove. Idempotent add. |
| `apps/api/src/modules/collections/repository.ts` (Create) | Drizzle queries for `collections`, `collection_items` (idempotent insert on `(collection_id, sentence_id)`). |
| `apps/api/src/modules/unit-progress/routes.ts` (Create) | Mounts `POST /api/unit-progress/:unitId/:stage`. |
| `apps/api/src/modules/unit-progress/controller.ts` (Create) | Validates stage enum, idempotent upsert. |
| `apps/api/src/modules/unit-progress/repository.ts` (Create) | Drizzle upsert into `unit_progress` keyed `(user_id, unit_id, stage)`. |
| `apps/api/src/modules/curriculum/{filter,routes}.ts` (Create) | `GET /api/curriculum/sentences?filter=...&match=...` text-search endpoint delegating to `@pt/domain::applyFilter`. |
| `apps/api/src/index.ts` (modify) | Mount the four new modules under `/api/practice`, `/api/me/settings`, `/api/collections`, `/api/unit-progress`, plus the new curriculum filter router. |
| `apps/web/src/routes/Unit.tsx` (Create) | Six-stage recommendation page with `nextStageRecommendation` navigation. |
| `apps/web/src/routes/Learn.tsx` (Create) | Static reader; "Mark read" affordance calls `/api/unit-progress/:unitId/learn`. |
| `apps/web/src/routes/Notice.tsx` (Create) | Static reader; "Mark read" affordance. |
| `apps/web/src/routes/Shadow.tsx` (Create) | Render `<AudioComingSoon />`, microphone record + playback, 1–5 self-rating via `POST /api/practice/ratings`. |
| `apps/web/src/routes/Recall.tsx` (Create) | English prompt, reveal, 1–5 self-rating. |
| `apps/web/src/routes/Apply.tsx` (Create) | Language Island reader. |
| `apps/web/src/routes/Communicate.tsx` (Create) | Phase D stub. |
| `apps/web/src/routes/Review.tsx` (Create) | Smart Review queue landing. |
| `apps/web/src/routes/Filter.tsx` (Create) | Filter form + results. |
| `apps/web/src/routes/Collections.tsx` (Create) | List + create collection. |
| `apps/web/src/routes/CollectionDetail.tsx` (Create) | Single collection detail + add/remove + practice. |
| `apps/web/src/routes/Settings.tsx` (Create) | Per-Learner settings form. |
| `apps/web/src/components/AudioComingSoon.tsx` (Create) | Single component carrying the "Phase C will play reviewed pt-PT audio here" message; Phase C replaces its body. |
| `apps/web/src/components/MicRecorder.tsx` (Create) | Wraps `MediaRecorder`; emits a `Blob` on stop and discards it on unmount. |
| `apps/web/src/components/StarRating.tsx` (Create) | 1–5 star rating input used by Shadow, Recall, Review, CollectionDetail. |
| `apps/web/src/hooks/useSettings.ts` (Create) | React Query hook that fetches `/api/me/settings`. Used by Shadow and Settings pages. |
| `apps/web/src/main.tsx` (modify) | Register the eight new routes under `/`. |
| `tests/e2e/phase-b-smoke.spec.ts` (Create) | Playwright e2e covering §13.3 acceptance criteria for the practice surface. |

---

## Tasks

Nine ordered tasks. Each lands on its own review-only commit. Task 10 (verification) is an aggregate and ships no commit.

### Task 1: Contracts (Zod schemas + error envelope additions)

**Files:**

- Create: `packages/contracts/src/practice.ts`
- Create: `packages/contracts/src/settings.ts`
- Create: `packages/contracts/src/collections.ts`
- Create: `packages/contracts/src/unitProgress.ts`
- Create: `packages/contracts/src/filter.ts`
- Modify: `packages/contracts/src/errors.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/__tests__/phase-b-schemas.test.ts` (Create)

**Interfaces:**

- Consumes: nothing from earlier Phase B tasks.
- Produces: Zod-validated shapes for each new endpoint's request body / query / response.

- [ ] **Step 1: Write the failing schema test**

```ts
// packages/contracts/src/__tests__/phase-b-schemas.test.ts
import { describe, it, expect } from 'vitest';
import {
  practiceItemSchema,
  ratingWriteSchema,
  practiceQueueQuerySchema,
  settingsSchema,
  partialSettingsSchema,
  collectionSchema,
  createCollectionBodySchema,
  unitProgressWriteSchema,
  filterExpressionSchema,
  matchModeSchema,
} from '../index.js';

describe('Phase B contracts', () => {
  it('validates a rating write', () => {
    const result = ratingWriteSchema.parse({
      clientMutationId: 'cm_1',
      sentenceId: 'sen_a1_int_greet_001',
      mode: 'shadow',
      rating: 4,
    });
    expect(result.rating).toBe(4);
  });
  it('rejects a rating outside 1..5', () => {
    expect(() =>
      ratingWriteSchema.parse({
        clientMutationId: 'cm_1',
        sentenceId: 'sen_a1_int_greet_001',
        mode: 'shadow',
        rating: 7,
      }),
    ).toThrow();
  });
  it('validates settings columns', () => {
    const result = settingsSchema.parse({
      audioSpeed: 0.85, repetitions: 2, pauseMs: 1500, textSize: 'large', sortOrder: 'curriculum', loop: false,
    });
    expect(result.audioSpeed).toBe(0.85);
  });
  it('rejects invalid pauseMs', () => {
    expect(() =>
      settingsSchema.parse({
        audioSpeed: 0.85, repetitions: 2, pauseMs: 1234, textSize: 'large', sortOrder: 'curriculum', loop: false,
      }),
    ).toThrow();
  });
  it('validates a create-collection body', () => {
    expect(createCollectionBodySchema.parse({ name: 'My list' }).name).toBe('My list');
  });
  it('rejects an empty collection name', () => {
    expect(() => createCollectionBodySchema.parse({ name: '' })).toThrow();
  });
  it('validates a unit-progress write', () => {
    expect(unitProgressWriteSchema.parse({ status: 'complete' }).status).toBe('complete');
  });
  it('rejects an unknown status', () => {
    expect(() => unitProgressWriteSchema.parse({ status: 'skipped' })).toThrow();
  });
  it('rejects an overlong filter expression', () => {
    expect(() => filterExpressionSchema.parse('a'.repeat(201))).toThrow();
  });
  it('accepts matchMode or|all', () => {
    expect(matchModeSchema.parse('or')).toBe('or');
    expect(matchModeSchema.parse('all')).toBe('all');
    expect(() => matchModeSchema.parse('xor')).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pt/contracts exec vitest run src/__tests__/phase-b-schemas.test.ts`
Expected: FAIL with "Cannot find module" errors.

- [ ] **Step 3: Create `packages/contracts/src/practice.ts`**

```ts
import { z } from 'zod';

export const practiceItemSchema = z.object({
  sentenceId: z.string().regex(/^sen_[a-z0-9_]+$/),
  textPt: z.string().min(1),
  textEn: z.string().min(1),
  audioId: z.string().nullable(),
  unitId: z.string(),
  orderIndex: z.number().int().nonnegative(),
});

export const ratingModeSchema = z.enum(['shadow', 'recall']);

export const ratingWriteSchema = z.object({
  clientMutationId: z.string().regex(/^cm_[A-Za-z0-9_-]+$/),
  sentenceId: z.string().regex(/^sen_[a-z0-9_]+$/),
  mode: ratingModeSchema,
  rating: z.number().int().min(1).max(5),
});

export const practiceQueueQuerySchema = z.object({
  unitId: z.string().regex(/^unit_[a-z0-9_]+$/),
  mode: ratingModeSchema,
  filter: z.string().max(200).optional(),
  match: z.enum(['or', 'all']).default('or').optional(),
});

export const practiceQueueResponseSchema = z.object({ items: z.array(practiceItemSchema) });
export const reviewQueueResponseSchema = z.object({ items: z.array(practiceItemSchema.extend({ rating: z.number().int().min(1).max(5) })) });
```

- [ ] **Step 4: Create `packages/contracts/src/settings.ts`**

```ts
import { z } from 'zod';

export const settingsSchema = z.object({
  audioSpeed: z.number().min(0.5).max(2.0),
  repetitions: z.number().int().min(1).max(5),
  pauseMs: z.union([
    z.literal(0),
    z.literal(500),
    z.literal(1000),
    z.literal(1500),
    z.literal(2000),
    z.literal(2500),
    z.literal(3000),
    z.literal(4000),
    z.literal(5000),
    z.literal(7000),
  ]),
  textSize: z.enum(['small', 'default', 'large', 'extraLarge']),
  sortOrder: z.enum(['curriculum', 'easyToHard', 'hardToEasy']),
  loop: z.boolean(),
});

export const partialSettingsSchema = settingsSchema.partial();
```

- [ ] **Step 5: Create `packages/contracts/src/collections.ts`**

```ts
import { z } from 'zod';

export const collectionSchema = z.object({
  id: z.string().regex(/^col_[a-z0-9_]+$/),
  name: z.string().min(1).max(80),
  sentenceCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export const collectionItemSchema = z.object({
  orderIndex: z.number().int().nonnegative(),
  sentenceId: z.string().regex(/^sen_[a-z0-9_]+$/),
  textPt: z.string().min(1),
  textEn: z.string().min(1),
});

export const collectionDetailSchema = collectionSchema.extend({ items: z.array(collectionItemSchema) });

export const createCollectionBodySchema = z.object({ name: z.string().min(1).max(80) });

export const addItemBodySchema = z.object({
  sentenceId: z.string().regex(/^sen_[a-z0-9_]+$/),
  orderIndex: z.number().int().nonnegative().optional(),
});
```

- [ ] **Step 6: Create `packages/contracts/src/unitProgress.ts`**

```ts
import { z } from 'zod';

export const unitStageSchema = z.enum(['learn', 'notice', 'shadow', 'recall', 'apply', 'communicate']);

export const unitProgressWriteSchema = z.object({
  status: z.literal('complete'),
});
```

- [ ] **Step 7: Create `packages/contracts/src/filter.ts`**

```ts
import { z } from 'zod';

export const filterExpressionSchema = z.string().min(0).max(200);
export const matchModeSchema = z.enum(['or', 'all']);
```

- [ ] **Step 8: Extend `packages/contracts/src/errors.ts`**

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
  'practice_queue_empty',
  'collection_name_required',
  'collection_not_found',
  'unit_not_found',
  'stage_unknown',
  'unit_progress_invalid_status',
  'internal',
]);
```

- [ ] **Step 9: Modify `packages/contracts/src/index.ts`**

Add re-exports:

```ts
export * from './practice.js';
export * from './settings.js';
export * from './collections.js';
export * from './unitProgress.js';
export * from './filter.js';
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `pnpm --filter @pt/contracts exec vitest run src/__tests__/phase-b-schemas.test.ts`
Expected: PASS.

- [ ] **Step 11: Commit (review-only)**

```bash
git add packages/contracts/src
git commit -m "feat(contracts): practice, settings, collections, unitProgress, filter schemas + error codes"
```

---

### Task 2: Domain helpers (pure logic)

**Files:**

- Create: `packages/domain/src/practice/queue.ts`
- Create: `packages/domain/src/practice/review.ts`
- Create: `packages/domain/src/practice/stages.ts`
- Create: `packages/domain/src/filter/apply.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `packages/domain/src/__tests__/phase-b-domain.test.ts` (Create)

**Interfaces:**

- Consumes: nothing from earlier Phase B tasks; pure types only.
- Produces: four pure helpers `buildPracticeQueue`, `buildReviewQueue`, `applyFilter`, `nextStageRecommendation`; `STAGE_ORDER` enum export.

- [ ] **Step 1: Write the failing domain test**

```ts
// packages/domain/src/__tests__/phase-b-domain.test.ts
import { describe, it, expect } from 'vitest';
import {
  buildPracticeQueue,
  buildReviewQueue,
  applyFilter,
  nextStageRecommendation,
  STAGE_ORDER,
} from '../index.js';

const sampleSentences = [
  { sentenceId: 'sen_1', textPt: 'Olá.', textEn: 'Hello.', unitId: 'unit_a1', orderIndex: 0, audioId: null },
  { sentenceId: 'sen_2', textPt: 'Como vai?', textEn: 'How are you?', unitId: 'unit_a1', orderIndex: 1, audioId: null },
  { sentenceId: 'sen_3', textPt: 'Olá, tudo bem?', textEn: 'Hello, how are you?', unitId: 'unit_a1', orderIndex: 2, audioId: null },
];

describe('buildPracticeQueue', () => {
  it('returns the unit\'s sentences in curriculum order', () => {
    const out = buildPracticeQueue(sampleSentences, { mode: 'shadow', sortOrder: 'curriculum' });
    expect(out.map((s) => s.sentenceId)).toEqual(['sen_1', 'sen_2', 'sen_3']);
  });
  it('reverses in hardToEasy', () => {
    const out = buildPracticeQueue(sampleSentences, { mode: 'shadow', sortOrder: 'hardToEasy' });
    expect(out.map((s) => s.sentenceId)).toEqual(['sen_3', 'sen_2', 'sen_1']);
  });
});

describe('buildReviewQueue', () => {
  it('excludes ratings of 5 and unrated rows', () => {
    const ratings = new Map([
      ['sen_1', { mode: 'shadow', rating: 2, lastPractisedAt: new Date('2026-01-01T00:00:00Z') }],
      ['sen_2', { mode: 'shadow', rating: 5, lastPractisedAt: new Date('2026-01-02T00:00:00Z') }],
      ['sen_3', { mode: 'shadow', rating: null, lastPractisedAt: null }],
    ]);
    const out = buildReviewQueue(ratings, sampleSentences, 'shadow', 50);
    expect(out.map((s) => s.sentenceId)).toEqual(['sen_1']);
  });
  it('orders by rating, then oldest last_practised_at', () => {
    const ratings = new Map([
      ['sen_1', { mode: 'shadow', rating: 3, lastPractisedAt: new Date('2026-01-01T00:00:00Z') }],
      ['sen_2', { mode: 'shadow', rating: 2, lastPractisedAt: new Date('2026-01-04T00:00:00Z') }],
      ['sen_3', { mode: 'shadow', rating: 2, lastPractisedAt: new Date('2026-01-02T00:00:00Z') }],
    ]);
    const out = buildReviewQueue(ratings, sampleSentences, 'shadow', 50);
    expect(out.map((s) => s.sentenceId)).toEqual(['sen_3', 'sen_2', 'sen_1']);
  });
});

describe('applyFilter', () => {
  it('OR default matches any term across text/translation/refs/tags', () => {
    const out = applyFilter(sampleSentences, ['dar', 'como'], false);
    expect(out.map((s) => s.sentenceId)).toEqual(['sen_2']);
  });
  it('AND matches terms present in the same sentence', () => {
    const out = applyFilter(sampleSentences, ['Olá', 'tudo'], true);
    expect(out.map((s) => s.sentenceId)).toEqual(['sen_3']);
  });
});

describe('nextStageRecommendation', () => {
  it('returns the lowest incomplete stage', () => {
    expect(nextStageRecommendation({ completedStages: ['learn', 'notice'] })).toBe('shadow');
  });
  it('returns null when every stage is complete', () => {
    expect(nextStageRecommendation({ completedStages: STAGE_ORDER })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pt/domain exec vitest run src/__tests__/phase-b-domain.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Create `packages/domain/src/practice/queue.ts`**

```ts
import { applyFilter } from '../filter/apply.js';
import type { PracticeItem } from './types.js';
import type { SortOrder } from '../settings/types.js';

export function buildPracticeQueue(
  sentences: ReadonlyArray<PracticeItem>,
  opts: { mode: 'shadow' | 'recall'; sortOrder: SortOrder; filter?: ReadonlyArray<string>; matchAll?: boolean },
): ReadonlyArray<PracticeItem> {
  const filtered = opts.filter ? applyFilter(sentences, opts.filter, opts.matchAll ?? false) : sentences;
  const sorted = [...filtered];
  if (opts.sortOrder === 'curriculum') sorted.sort((a, b) => a.orderIndex - b.orderIndex);
  if (opts.sortOrder === 'easyToHard') sorted.sort((a, b) => a.orderIndex - b.orderIndex);
  if (opts.sortOrder === 'hardToEasy') sorted.sort((a, b) => b.orderIndex - a.orderIndex);
  return sorted;
}
```

- [ ] **Step 4: Create `packages/domain/src/practice/review.ts`**

```ts
import type { PracticeItem } from './types.js';

export type ReviewRating = { mode: 'shadow' | 'recall'; rating: number | null; lastPractisedAt: Date | null };

export function buildReviewQueue(
  ratings: ReadonlyMap<string, ReviewRating>,
  sentences: ReadonlyArray<PracticeItem>,
  mode: 'shadow' | 'recall',
  limit: number,
): ReadonlyArray<PracticeItem> {
  const candidates = sentences
    .map((s) => {
      const r = ratings.get(s.sentenceId);
      return r && r.mode === mode && r.rating !== null && r.rating >= 1 && r.rating <= 4 ? { sentence: s, rating: r.rating, last: r.lastPractisedAt } : null;
    })
    .filter((x): x is { sentence: PracticeItem; rating: number; last: Date | null } => x !== null);
  candidates.sort((a, b) => {
    if (a.rating !== b.rating) return a.rating - b.rating;
    if (a.last === null && b.last === null) return a.sentence.orderIndex - b.sentence.orderIndex;
    if (a.last === null) return -1;
    if (b.last === null) return 1;
    return a.last.getTime() - b.last.getTime();
  });
  return candidates.slice(0, limit).map((c) => c.sentence);
}
```

- [ ] **Step 5: Create `packages/domain/src/practice/stages.ts`**

```ts
export const STAGE_ORDER = ['learn', 'notice', 'shadow', 'recall', 'apply', 'communicate'] as const;
export type Stage = (typeof STAGE_ORDER)[number];

export function nextStageRecommendation(opts: { completedStages: ReadonlyArray<Stage> }): Stage | null {
  const completed = new Set(opts.completedStages);
  for (const stage of STAGE_ORDER) if (!completed.has(stage)) return stage;
  return null;
}
```

- [ ] **Step 6: Create `packages/domain/src/filter/apply.ts`**

```ts
import type { PracticeItem } from '../practice/types.js';

export function applyFilter(sentences: ReadonlyArray<PracticeItem>, terms: ReadonlyArray<string>, matchAll: boolean): ReadonlyArray<PracticeItem> {
  const normalised = terms.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (normalised.length === 0) return sentences;
  return sentences.filter((s) => {
    const haystack = [
      s.textPt,
      s.textEn,
    ].join(' ').toLowerCase();
    if (matchAll) return normalised.every((t) => haystack.includes(t));
    return normalised.some((t) => haystack.includes(t));
  });
}
```

- [ ] **Step 7: Create `packages/domain/src/practice/types.ts`**

```ts
import type { SortOrder } from '../settings/types.js';

export type PracticeItem = {
  sentenceId: string;
  textPt: string;
  textEn: string;
  audioId: string | null;
  unitId: string;
  orderIndex: number;
};

export type PracticeMode = 'shadow' | 'recall';

export type PracticeQueueOptions = {
  mode: PracticeMode;
  sortOrder: SortOrder;
  filter?: ReadonlyArray<string>;
  matchAll?: boolean;
};
```

- [ ] **Step 8: Create `packages/domain/src/settings/types.ts`** if it doesn't already exist from Phase A

```ts
export type SortOrder = 'curriculum' | 'easyToHard' | 'hardToEasy';
```

- [ ] **Step 9: Modify `packages/domain/src/index.ts`**

```ts
export * from './practice/queue.js';
export * from './practice/review.js';
export * from './practice/stages.js';
export * from './practice/types.js';
export * from './filter/apply.js';
export * from './settings/types.js';
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `pnpm --filter @pt/domain exec vitest run src/__tests__/phase-b-domain.test.ts`
Expected: PASS.

- [ ] **Step 11: Commit (review-only)**

```bash
git add packages/domain/src
git commit -m "feat(domain): practice queue/review/stages + filter helpers"
```

---

### Task 3: Practice API (ratings + queue + review)

**Files:**

- Create: `apps/api/src/modules/practice/routes.ts`
- Create: `apps/api/src/modules/practice/controller.ts`
- Create: `apps/api/src/modules/practice/repository.ts`
- Create: `apps/api/src/modules/practice/__tests__/practice.test.ts`
- Modify: `apps/api/src/index.ts`

**Interfaces:**

- Consumes: `practice_ratings` table (Phase A schema), `cv_sentence_versions` projection, `settingsSchema` from `@pt/contracts`, `practiceItemSchema` from `@pt/contracts`.
- Produces: `POST /api/practice/ratings` (idempotent via `client_mutation_id`), `GET /api/practice/queue`, `GET /api/practice/review`.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/api/src/modules/practice/__tests__/practice.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../db/client.js';
import request from 'supertest';
import express from 'express';
import { createApp } from '../../../index.js';

const UNIT = 'unit_a1_int';
const USER = 'usr_seed';

async function seedFixtures() {
  await db.execute(require('drizzle-orm').sql`INSERT INTO users (user_id, email, password_hash) VALUES (${USER}, 'a@b', 'x') ON CONFLICT DO NOTHING`);
  await db.execute(require('drizzle-orm').sql`INSERT INTO auth_sessions (session_id, user_id, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at) VALUES ('sess_seed', ${USER}, 'h_acc', 'h_ref', now() + interval '15 minutes', now() + interval '30 days') ON CONFLICT DO NOTHING`);
}

describe('practice api', () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(async () => {
    await db.execute(require('drizzle-orm').sql`TRUNCATE TABLE practice_ratings, cv_sentence_versions, sentences, units, curriculum_versions, auth_sessions, users RESTART IDENTITY CASCADE`);
    await seedFixtures();
    app = createApp();
  });

  it('POST /api/practice/ratings is idempotent on clientMutationId', async () => {
    const body = { clientMutationId: 'cm_1', sentenceId: 'sen_a1_1', mode: 'shadow', rating: 4 };
    const first = await request(app).post('/api/practice/ratings').set('Cookie', 'ptp_access=t').send(body);
    expect(first.status).toBe(200);
    const second = await request(app).post('/api/practice/ratings').set('Cookie', 'ptp_access=t').send(body);
    expect(second.status).toBe(200);
    const rows = await db.execute(require('drizzle-orm').sql`SELECT count(*)::int AS n FROM practice_ratings`);
    expect((rows as any)[0].n).toBe(1);
  });

  it('GET /api/practice/queue returns the unit sentences', async () => {
    await db.execute(require('drizzle-orm').sql`INSERT INTO curriculum_versions (id, level, version, source_checksum, active) VALUES ('cv_a1_1', 'a1', 1, 'deadbeef', true)`);
    await db.execute(require('drizzle-orm').sql`INSERT INTO units (unit_id, level, slug, title, summary, order_index) VALUES (${UNIT}, 'a1', 'introductions', 'Introductions', 'Greet.', 0)`);
    await db.execute(require('drizzle-orm').sql`INSERT INTO sentences (sentence_id, default_text_pt, default_text_en, order_index) VALUES ('sen_a1_1', 'Olá.', 'Hello.', 0)`);
    await db.execute(require('drizzle-orm').sql`INSERT INTO cv_sentence_versions (cv_id, sentence_id, text_pt, text_en) VALUES ('cv_a1_1', 'sen_a1_1', 'Olá.', 'Hello.')`);
    const res = await request(app).get(`/api/practice/queue?unit_id=${UNIT}&mode=shadow`).set('Cookie', 'ptp_access=t');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pt/api exec vitest run src/modules/practice/__tests__/practice.test.ts`
Expected: FAIL on module / route mount.

- [ ] **Step 3: Create `apps/api/src/modules/practice/repository.ts`**

```ts
import { db } from '../../db/client.js';
import { practiceRatings } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';

export async function upsertRating(input: { userId: string; sentenceId: string; mode: 'shadow' | 'recall'; rating: number; clientMutationId: string }) {
  return db.transaction(async (tx) => {
    const [row] = await tx.execute(sql`
      INSERT INTO practice_ratings (user_id, sentence_id, mode, rating, last_practised_at)
      VALUES (${input.userId}, ${input.sentenceId}, ${input.mode}, ${input.rating}, now())
      ON CONFLICT (user_id, sentence_id, mode) DO UPDATE SET rating = EXCLUDED.rating, last_practised_at = EXCLUDED.last_practised_at
      RETURNING user_id, sentence_id, mode, rating, last_practised_at
    `);
    return row as any;
  });
}

export async function loadSentencesForUnit(unitId: string, cvId: string) {
  const rows = await db.execute(sql`
    SELECT s.sentence_id, csv.text_pt, csv.text_en, csv.audio_id, u.unit_id, s.order_index
    FROM sentences s
    JOIN cv_sentence_versions csv ON csv.sentence_id = s.sentence_id AND csv.cv_id = ${cvId}
    JOIN units u ON u.unit_id = ${unitId}
    WHERE u.unit_id = ${unitId}
    ORDER BY s.order_index ASC
  `);
  return rows as any[];
}
```

- [ ] **Step 4: Create `apps/api/src/modules/practice/controller.ts`**

```ts
import { Response, Request } from 'express';
import { ratingWriteSchema, practiceQueueQuerySchema, practiceQueueResponseSchema } from '@pt/contracts/practice';
import { buildPracticeQueue, buildReviewQueue } from '@pt/domain';
import { upsertRating, loadSentencesForUnit } from './repository.js';
import { db } from '../../db/client.js';
import { sql } from 'drizzle-orm';

export async function rate(req: Request, res: Response) {
  const parsed = ratingWriteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_failed', message: parsed.error.message, correlationId: res.locals.correlationId } });
    return;
  }
  const userId = res.locals.userId as string;
  const row = await upsertRating({ ...parsed.data, userId });
  res.status(200).json({ sentenceId: row.sentence_id, mode: row.mode, rating: row.rating, lastPractisedAt: row.last_practised_at });
}

export async function queue(req: Request, res: Response) {
  const parsed = practiceQueueQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_failed', message: parsed.error.message, correlationId: res.locals.correlationId } });
    return;
  }
  const cvRow = (await db.execute(sql`SELECT id FROM curriculum_versions WHERE level='a1' AND active=true LIMIT 1`)) as any[];
  const cvId = cvRow[0]?.id as string;
  const sentences = await loadSentencesForUnit(parsed.data.unitId, cvId);
  const queue = buildPracticeQueue(sentences, { mode: parsed.data.mode, sortOrder: 'curriculum' });
  const items = queue.map((q) => ({ sentenceId: q.sentenceId, textPt: q.textPt, textEn: q.textEn, audioId: q.audioId, unitId: q.unitId, orderIndex: q.orderIndex }));
  const response = practiceQueueResponseSchema.safeParse({ items });
  if (!response.success) {
    res.status(500).json({ error: { code: 'internal', message: 'queue response shape invalid', correlationId: res.locals.correlationId } });
    return;
  }
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.setHeader('ETag', `"${cvId}"`);
  res.status(200).json(response.data);
}

export async function review(req: Request, res: Response) {
  const userId = res.locals.userId as string;
  const mode = (req.query.mode === 'recall' ? 'recall' : 'shadow') as 'shadow' | 'recall';
  const limit = Math.min(parseInt((req.query.limit as string) ?? '50', 10), 200);
  const cvRow = (await db.execute(sql`SELECT id FROM curriculum_versions WHERE level='a1' AND active=true LIMIT 1`)) as any[];
  const cvId = cvRow[0]?.id as string;
  const sentences = await loadSentencesForUnit('unit_a1_int', cvId);
  const ratingsRows = (await db.execute(sql`SELECT sentence_id, mode, rating, last_practised_at FROM practice_ratings WHERE user_id = ${userId} AND mode = ${mode}`)) as any[];
  const ratings = new Map<string, { mode: 'shadow' | 'recall'; rating: number | null; lastPractisedAt: Date | null }>();
  for (const r of ratingsRows) {
    ratings.set(r.sentence_id, { mode: r.mode, rating: r.rating, lastPractisedAt: r.last_practised_at });
  }
  const queue = buildReviewQueue(ratings, sentences, mode, limit);
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.setHeader('ETag', `"${cvId}"`);
  res.status(200).json({ items: queue });
}
```

- [ ] **Step 5: Create `apps/api/src/modules/practice/routes.ts`**

```ts
import { Router } from 'express';
import { requireAuth } from '../auth/requireAuth.js';
import { rate, queue, review } from './controller.js';

export const practiceRouter = Router();
practiceRouter.use(requireAuth);
practiceRouter.post('/ratings', rate);
practiceRouter.get('/queue', queue);
practiceRouter.get('/review', review);
```

- [ ] **Step 6: Modify `apps/api/src/index.ts`** to mount the router

```ts
import { practiceRouter } from './modules/practice/routes.js';
// ...
app.use('/api/practice', practiceRouter);
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm --filter @pt/api exec vitest run src/modules/practice/__tests__/practice.test.ts`
Expected: PASS for both tests.

- [ ] **Step 8: Commit (review-only)**

```bash
git add apps/api/src/modules/practice apps/api/src/index.ts
git commit -m "feat(api): practice ratings + queue + review endpoints"
```

---

### Task 4: Settings API + Settings page

**Files:**

- Create: `apps/api/src/modules/settings/{routes,controller,repository}.ts`
- Create: `apps/api/src/modules/settings/__tests__/settings.test.ts`
- Modify: `apps/api/src/index.ts`
- Create: `apps/web/src/routes/Settings.tsx`
- Create: `apps/web/src/routes/__tests__/Settings.test.tsx`

**Interfaces:**

- Consumes: `user_settings` table (Phase A schema), `settingsSchema` / `partialSettingsSchema` from `@pt/contracts`.
- Produces: `GET /api/me/settings`, `PATCH /api/me/settings`; `SettingsPage` React route.

- [ ] **Step 1: Write the failing API test**

```ts
// apps/api/src/modules/settings/__tests__/settings.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../db/client.js';
import request from 'supertest';
import { createApp } from '../../../index.js';

describe('settings api', () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(async () => {
    await db.execute(require('drizzle-orm').sql`TRUNCATE TABLE user_settings, auth_sessions, users RESTART IDENTITY CASCADE`);
    await db.execute(require('drizzle-orm').sql`INSERT INTO users (user_id, email, password_hash) VALUES ('usr_seed', 'a@b', 'x')`);
    await db.execute(require('drizzle-orm').sql`INSERT INTO auth_sessions (session_id, user_id, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at) VALUES ('sess_seed', 'usr_seed', 'h_acc', 'h_ref', now() + interval '15 minutes', now() + interval '30 days')`);
    app = createApp();
  });
  it('GET returns defaults on first access', async () => {
    const res = await request(app).get('/api/me/settings').set('Cookie', 'ptp_access=t');
    expect(res.status).toBe(200);
    expect(res.body.audioSpeed).toBe(1.0);
    expect(res.body.repetitions).toBe(2);
    expect(res.body.loop).toBe(false);
  });
  it('PATCH writes a partial update', async () => {
    const res = await request(app).patch('/api/me/settings').set('Cookie', 'ptp_access=t').send({ audioSpeed: 0.75, loop: true });
    expect(res.status).toBe(200);
    expect(res.body.audioSpeed).toBe(0.75);
    expect(res.body.loop).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pt/api exec vitest run src/modules/settings/__tests__/settings.test.ts`
Expected: FAIL on module / route mount.

- [ ] **Step 3: Create `apps/api/src/modules/settings/repository.ts`**

```ts
import { db } from '../../db/client.js';
import { sql } from 'drizzle-orm';

const DEFAULTS = {
  audioSpeed: 1.0, repetitions: 2, pauseMs: 1000, textSize: 'default', sortOrder: 'curriculum', loop: false,
} as const;

export async function getOrCreateSettings(userId: string) {
  const [row] = (await db.execute(sql`SELECT audio_speed, repetitions, pause_ms, text_size, sort_order, loop FROM user_settings WHERE user_id = ${userId}`)) as any[];
  if (row) {
    return {
      audioSpeed: row.audio_speed,
      repetitions: row.repetitions,
      pauseMs: row.pause_ms,
      textSize: row.text_size,
      sortOrder: row.sort_order,
      loop: row.loop,
    };
  }
  await db.execute(sql`INSERT INTO user_settings (user_id, audio_speed, repetitions, pause_ms, text_size, sort_order, loop) VALUES (${userId}, ${DEFAULTS.audioSpeed}, ${DEFAULTS.repetitions}, ${DEFAULTS.pauseMs}, ${DEFAULTS.textSize}, ${DEFAULTS.sortOrder}, ${DEFAULTS.loop})`);
  return { ...DEFAULTS };
}

export async function patchSettings(userId: string, patch: Record<string, unknown>) {
  const current = await getOrCreateSettings(userId);
  const merged = { ...current, ...patch };
  await db.execute(sql`UPDATE user_settings SET audio_speed = ${merged.audioSpeed}, repetitions = ${merged.repetitions}, pause_ms = ${merged.pauseMs}, text_size = ${merged.textSize}, sort_order = ${merged.sortOrder}, loop = ${merged.loop} WHERE user_id = ${userId}`);
  return merged;
}
```

- [ ] **Step 4: Create `apps/api/src/modules/settings/controller.ts`**

```ts
import { Response } from 'express';
import { settingsSchema, partialSettingsSchema } from '@pt/contracts/settings';
import { getOrCreateSettings, patchSettings } from './repository.js';

export async function getSettings(_req: unknown, res: Response) {
  const userId = res.locals.userId as string;
  const settings = await getOrCreateSettings(userId);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(settings);
}

export async function patchThisSettings(req: any, res: Response) {
  const parsed = partialSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_failed', message: parsed.error.message, correlationId: res.locals.correlationId } });
    return;
  }
  const userId = res.locals.userId as string;
  const next = await patchSettings(userId, parsed.data);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(next);
}
```

- [ ] **Step 5: Create `apps/api/src/modules/settings/routes.ts`**

```ts
import { Router } from 'express';
import { requireAuth } from '../auth/requireAuth.js';
import { getSettings, patchThisSettings } from './controller.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);
settingsRouter.get('/', getSettings);
settingsRouter.patch('/', patchThisSettings);
```

- [ ] **Step 6: Modify `apps/api/src/index.ts`** to mount the router

```ts
import { settingsRouter } from './modules/settings/routes.js';
app.use('/api/me/settings', settingsRouter);
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm --filter @pt/api exec vitest run src/modules/settings/__tests__/settings.test.ts`
Expected: PASS.

- [ ] **Step 8: Create `apps/web/src/routes/Settings.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const DEFAULTS = { audioSpeed: 1.0, repetitions: 2, pauseMs: 1000, textSize: 'default', sortOrder: 'curriculum', loop: false } as const;

export default function SettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: async () => (await fetch('/api/me/settings', { credentials: 'include' })).json() });
  const [local, setLocal] = useState<typeof DEFAULTS | null>(null);
  useEffect(() => { if (settings.data) setLocal(settings.data); }, [settings.data]);
  const mutation = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const res = await fetch('/api/me/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch), credentials: 'include' });
      if (!res.ok) throw new Error('settings save failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
  if (!local) return <p>Loading…</p>;
  return (
    <main>
      <h1>Settings</h1>
      <label>Audio speed <input type="number" step="0.05" min="0.5" max="2.0" value={local.audioSpeed} onChange={(e) => setLocal({ ...local, audioSpeed: parseFloat(e.target.value) })} /></label>
      <label>Repetitions <input type="number" min="1" max="5" value={local.repetitions} onChange={(e) => setLocal({ ...local, repetitions: parseInt(e.target.value, 10) })} /></label>
      <label>Pause (ms)
        <select value={local.pauseMs} onChange={(e) => setLocal({ ...local, pauseMs: parseInt(e.target.value, 10) })}>
          {[0, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7000].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label>Text size
        <select value={local.textSize} onChange={(e) => setLocal({ ...local, textSize: e.target.value as any })}>
          {['small', 'default', 'large', 'extraLarge'].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label>Sort order
        <select value={local.sortOrder} onChange={(e) => setLocal({ ...local, sortOrder: e.target.value as any })}>
          {['curriculum', 'easyToHard', 'hardToEasy'].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label>Loop <input type="checkbox" checked={local.loop} onChange={(e) => setLocal({ ...local, loop: e.target.checked })} /></label>
      <button disabled={mutation.isPending} onClick={() => mutation.mutate(local)}>Save</button>
      {mutation.isError && <p role="alert">Save failed.</p>}
    </main>
  );
}
```

- [ ] **Step 9: Write the web Settings test**

```tsx
// apps/web/src/routes/__tests__/Settings.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsPage from '../Settings';

const fetchMock = vi.fn();
(globalThis as any).fetch = fetchMock;

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ audioSpeed: 1.0, repetitions: 2, pauseMs: 1000, textSize: 'default', sortOrder: 'curriculum', loop: false }) });
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ audioSpeed: 0.75, repetitions: 2, pauseMs: 1000, textSize: 'default', sortOrder: 'curriculum', loop: true }) });
});

describe('SettingsPage', () => {
  it('renders the audio speed input with the loaded value', async () => {
    render(<QueryClientProvider client={new QueryClient()}><SettingsPage /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());
  });
  it('PATCH /api/me/settings on save', async () => {
    render(<QueryClientProvider client={new QueryClient()}><SettingsPage /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());
    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '0.75' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/me/settings', expect.objectContaining({ method: 'PATCH' })));
  });
});
```

- [ ] **Step 10: Run the web test to verify it passes**

Run: `pnpm --filter @pt/web exec vitest run src/routes/__tests__/Settings.test.tsx`
Expected: PASS.

- [ ] **Step 11: Commit (review-only)**

```bash
git add apps/api/src/modules/settings apps/web/src/routes/Settings.tsx apps/web/src/routes/__tests__/Settings.test.tsx apps/api/src/index.ts
git commit -m "feat(settings): API + Settings page (per-Learner sync)"
```

---

### Task 5: Collections API

**Files:**

- Create: `apps/api/src/modules/collections/{routes,controller,repository}.ts`
- Create: `apps/api/src/modules/collections/__tests__/collections.test.ts`
- Modify: `apps/api/src/index.ts`

**Interfaces:**

- Consumes: `collections`, `collection_items`, and `practice_ratings` tables; `collectionSchema`, `createCollectionBodySchema`, `addItemBodySchema` from `@pt/contracts`.
- Produces: `GET/POST /api/collections`, `GET /api/collections/:id`, `POST /api/collections/:id/items`, `DELETE /api/collections/:id/items/:sentenceId`, `DELETE /api/collections/:id`.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/api/src/modules/collections/__tests__/collections.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../db/client.js';
import request from 'supertest';
import { createApp } from '../../../index.js';

describe('collections api', () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(async () => {
    await db.execute(require('drizzle-orm').sql`TRUNCATE TABLE collection_items, collections, practice_ratings, auth_sessions, users RESTART IDENTITY CASCADE`);
    await db.execute(require('drizzle-orm').sql`INSERT INTO users (user_id, email, password_hash) VALUES ('usr_seed', 'a@b', 'x')`);
    await db.execute(require('drizzle-orm').sql`INSERT INTO auth_sessions (session_id, user_id, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at) VALUES ('sess_seed', 'usr_seed', 'h_acc', 'h_ref', now() + interval '15 minutes', now() + interval '30 days')`);
    app = createApp();
  });
  it('POST /api/collections creates a collection', async () => {
    const res = await request(app).post('/api/collections').set('Cookie', 'ptp_access=t').send({ name: 'My list' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('My list');
  });
  it('rejects an empty collection name', async () => {
    const res = await request(app).post('/api/collections').set('Cookie', 'ptp_access=t').send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('collection_name_required');
  });
  it('idempotent add does not duplicate the row', async () => {
    await request(app).post('/api/collections').set('Cookie', 'ptp_access=t').send({ name: 'L' });
    const col = await request(app).get('/api/collections').set('Cookie', 'ptp_access=t');
    const id = col.body.items[0].id;
    const first = await request(app).post(`/api/collections/${id}/items`).set('Cookie', 'ptp_access=t').send({ sentenceId: 'sen_a1_1' });
    const second = await request(app).post(`/api/collections/${id}/items`).set('Cookie', 'ptp_access=t').send({ sentenceId: 'sen_a1_1' });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const items = (await request(app).get(`/api/collections/${id}`).set('Cookie', 'ptp_access=t')).body.items;
    expect(items.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pt/api exec vitest run src/modules/collections/__tests__/collections.test.ts`
Expected: FAIL with missing module.

- [ ] **Step 3: Create `apps/api/src/modules/collections/repository.ts`**

```ts
import { db } from '../../db/client.js';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

function slugId(prefix: string, id: string) { return `${prefix}_${id}`; }

export async function createCollection(userId: string, name: string) {
  const id = slugId('col', randomUUID().slice(0, 12));
  await db.execute(sql`INSERT INTO collections (id, user_id, name, created_at) VALUES (${id}, ${userId}, ${name}, now())`);
  return { id, name, sentenceCount: 0, createdAt: new Date().toISOString() };
}

export async function listCollections(userId: string) {
  const rows = (await db.execute(sql`
    SELECT c.id, c.name, c.created_at, COUNT(ci.sentence_id) AS sentence_count
    FROM collections c
    LEFT JOIN collection_items ci ON ci.collection_id = c.id
    WHERE c.user_id = ${userId}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `)) as any[];
  return rows.map((r) => ({ id: r.id, name: r.name, sentenceCount: parseInt(r.sentence_count, 10), createdAt: r.created_at }));
}

export async function getCollection(userId: string, id: string) {
  const head = (await db.execute(sql`SELECT id, name, created_at FROM collections WHERE id = ${id} AND user_id = ${userId}`)) as any[];
  if (head.length === 0) return null;
  const items = (await db.execute(sql`
    SELECT ci.order_index, ci.sentence_id, s.default_text_pt, s.default_text_en
    FROM collection_items ci
    JOIN sentences s ON s.sentence_id = ci.sentence_id
    WHERE ci.collection_id = ${id}
    ORDER BY ci.order_index ASC
  `)) as any[];
  return { id: head[0].id, name: head[0].name, sentenceCount: items.length, createdAt: head[0].created_at, items: items.map((i) => ({ orderIndex: i.order_index, sentenceId: i.sentence_id, textPt: i.default_text_pt, textEn: i.default_text_en })) };
}

export async function addItem(userId: string, collectionId: string, sentenceId: string, orderIndex?: number) {
  const head = (await db.execute(sql`SELECT id FROM collections WHERE id = ${collectionId} AND user_id = ${userId}`)) as any[];
  if (head.length === 0) return null;
  const ix = orderIndex ?? ((await db.execute(sql`SELECT COALESCE(MAX(order_index)+1, 0) AS next FROM collection_items WHERE collection_id = ${collectionId}`)) as any[])[0].next;
  await db.execute(sql`INSERT INTO collection_items (collection_id, sentence_id, order_index) VALUES (${collectionId}, ${sentenceId}, ${ix}) ON CONFLICT DO NOTHING`);
  return getCollection(userId, collectionId);
}

export async function removeItem(userId: string, collectionId: string, sentenceId: string) {
  const head = (await db.execute(sql`SELECT id FROM collections WHERE id = ${collectionId} AND user_id = ${userId}`)) as any[];
  if (head.length === 0) return null;
  await db.execute(sql`DELETE FROM collection_items WHERE collection_id = ${collectionId} AND sentence_id = ${sentenceId}`);
}

export async function deleteCollection(userId: string, id: string) {
  const head = (await db.execute(sql`SELECT id FROM collections WHERE id = ${id} AND user_id = ${userId}`)) as any[];
  if (head.length === 0) return null;
  await db.execute(sql`DELETE FROM collection_items WHERE collection_id = ${id}`);
  await db.execute(sql`DELETE FROM collections WHERE id = ${id}`);
}
```

- [ ] **Step 4: Create `apps/api/src/modules/collections/controller.ts`**

```ts
import { Response } from 'express';
import { createCollectionBodySchema, addItemBodySchema } from '@pt/contracts/collections';
import { createCollection, listCollections, getCollection, addItem, removeItem, deleteCollection } from './repository.js';

export async function list(_req: unknown, res: Response) {
  const userId = res.locals.userId as string;
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ items: await listCollections(userId) });
}

export async function create(req: any, res: Response) {
  const parsed = createCollectionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'collection_name_required', message: 'name must be 1..80 chars', correlationId: res.locals.correlationId } });
    return;
  }
  const userId = res.locals.userId as string;
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(await createCollection(userId, parsed.data.name));
}

export async function detail(req: any, res: Response) {
  const userId = res.locals.userId as string;
  const col = await getCollection(userId, req.params.id);
  if (!col) {
    res.status(404).json({ error: { code: 'collection_not_found', message: 'no such collection', correlationId: res.locals.correlationId } });
    return;
  }
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.setHeader('ETag', `"${col.id}"`);
  res.status(200).json(col);
}

export async function add(req: any, res: Response) {
  const parsed = addItemBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'validation_failed', message: parsed.error.message, correlationId: res.locals.correlationId } });
    return;
  }
  const userId = res.locals.userId as string;
  const col = await addItem(userId, req.params.id, parsed.data.sentenceId, parsed.data.orderIndex);
  if (!col) {
    res.status(404).json({ error: { code: 'collection_not_found', message: 'no such collection', correlationId: res.locals.correlationId } });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(col);
}

export async function removeItem(req: any, res: Response) {
  const userId = res.locals.userId as string;
  await removeItem(userId, req.params.id, req.params.sentenceId);
  res.setHeader('Cache-Control', 'no-store');
  res.status(204).end();
}

export async function destroy(req: any, res: Response) {
  const userId = res.locals.userId as string;
  await deleteCollection(userId, req.params.id);
  res.setHeader('Cache-Control', 'no-store');
  res.status(204).end();
}
```

- [ ] **Step 5: Create `apps/api/src/modules/collections/routes.ts`**

```ts
import { Router } from 'express';
import { requireAuth } from '../auth/requireAuth.js';
import { list, create, detail, add, removeItem, destroy } from './controller.js';

export const collectionsRouter = Router();
collectionsRouter.use(requireAuth);
collectionsRouter.get('/', list);
collectionsRouter.post('/', create);
collectionsRouter.get('/:id', detail);
collectionsRouter.post('/:id/items', add);
collectionsRouter.delete('/:id/items/:sentenceId', removeItem);
collectionsRouter.delete('/:id', destroy);
```

- [ ] **Step 6: Modify `apps/api/src/index.ts`**

```ts
import { collectionsRouter } from './modules/collections/routes.js';
app.use('/api/collections', collectionsRouter);
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm --filter @pt/api exec vitest run src/modules/collections/__tests__/collections.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit (review-only)**

```bash
git add apps/api/src/modules/collections apps/api/src/index.ts
git commit -m "feat(collections): API (CRUD + idempotent item add)"
```

---

### Task 6: Collections pages

**Files:**

- Create: `apps/web/src/routes/Collections.tsx`
- Create: `apps/web/src/routes/CollectionDetail.tsx`
- Create: `apps/web/src/components/StarRating.tsx`
- Create: `apps/web/src/routes/__tests__/Collections.test.tsx`
- Create: `apps/web/src/routes/__tests__/CollectionDetail.test.tsx`
- Modify: `apps/web/src/main.tsx`

**Interfaces:**

- Consumes: collection API routes from Task 5.
- Produces: `CollectionsPage` (list + create), `CollectionDetailPage` (sentence add/remove + practice).

- [ ] **Step 1: Create `apps/web/src/components/StarRating.tsx`**

```tsx
import { useState } from 'react';

export function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div role="radiogroup" aria-label="Rating" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHovered(n)}
          onClick={() => onChange(n)}
          style={{ background: (hovered !== null ? n <= hovered : n <= value) ? 'gold' : 'transparent' }}
        >★</button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/routes/Collections.tsx`**

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export default function CollectionsPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['collections'], queryFn: async () => (await fetch('/api/collections', { credentials: 'include' })).json() });
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/collections', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }), credentials: 'include' });
      if (!res.ok) throw new Error('create failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  });
  return (
    <main>
      <h1>Collections</h1>
      <ul aria-label="Collections">
        {list.data?.items.map((c: any) => (
          <li key={c.id}><a href={`/collections/${c.id}`}>{c.name}</a> ({c.sentenceCount})</li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
        <label>New collection name <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required /></label>
        <button type="submit" disabled={create.isPending || name.trim().length === 0}>Create</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Create `apps/web/src/routes/CollectionDetail.tsx`**

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

export default function CollectionDetailPage() {
  const qc = useQueryClient();
  const { id } = useParams();
  const detail = useQuery({
    queryKey: ['collection', id],
    queryFn: async () => (await fetch(`/api/collections/${id}`, { credentials: 'include' })).json(),
    enabled: !!id,
  });
  const remove = useMutation({
    mutationFn: async (sentenceId: string) => {
      const res = await fetch(`/api/collections/${id}/items/${sentenceId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('remove failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collection', id] }),
  });
  return (
    <main>
      <h1>{detail.data?.name ?? 'Loading…'}</h1>
      <ul>
        {detail.data?.items.map((i: any) => (
          <li key={i.sentenceId}>
            <strong>{i.textPt}</strong> — {i.textEn}
            <button aria-label={`Remove ${i.textPt}`} onClick={() => remove.mutate(i.sentenceId)}>Remove</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: Write the failing web tests**

```tsx
// apps/web/src/routes/__tests__/Collections.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CollectionsPage from '../Collections';

const fetchMock = vi.fn();
(globalThis as any).fetch = fetchMock;

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: 'col_1', name: 'My list', sentenceCount: 2, createdAt: '2026-07-23T00:00:00Z' }] }) });
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'col_2', name: 'New', sentenceCount: 0, createdAt: '2026-07-23T00:00:01Z' }) });
});

describe('CollectionsPage', () => {
  it('lists existing collections', async () => {
    render(<QueryClientProvider client={new QueryClient()}><CollectionsPage /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByText('My list')).toBeInTheDocument());
  });
});

// apps/web/src/routes/__tests__/CollectionDetail.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CollectionDetailPage from '../CollectionDetail';

const fetchMock = vi.fn();
(globalThis as any).fetch = fetchMock;

beforeEach(() => {
  fetchMock.mockReset();
});

it('renders sentences with a Remove button', async () => {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'col_1', name: 'L', sentenceCount: 1, items: [{ orderIndex: 0, sentenceId: 'sen_1', textPt: 'Olá.', textEn: 'Hello.' }] }) });
  fetchMock.mockResolvedValue({ ok: true, status: 204 });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/collections/col_1']}>
        <Routes><Route path="/collections/:id" element={<CollectionDetailPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText('Olá.')).toBeInTheDocument());
  fireEvent.click(screen.getByLabelText(/^Remove/));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/collections/col_1/items/sen_1', expect.objectContaining({ method: 'DELETE' })));
});
```

- [ ] **Step 5: Run the web tests to verify they pass**

Run: `pnpm --filter @pt/web exec vitest run src/routes/__tests__/Collections.test.tsx src/routes/__tests__/CollectionDetail.test.tsx`
Expected: PASS.

- [ ] **Step 6: Modify `apps/web/src/main.tsx`** to mount the new routes

```tsx
import CollectionsPage from './routes/Collections.js';
import CollectionDetailPage from './routes/CollectionDetail.js';

const router = createBrowserRouter([
  // … existing routes …
  { path: '/collections', element: <RequireAuth><CollectionsPage /></RequireAuth> },
  { path: '/collections/:id', element: <RequireAuth><CollectionDetailPage /></RequireAuth> },
]);
```

- [ ] **Step 7: Commit (review-only)**

```bash
git add apps/web/src/routes/Collections.tsx apps/web/src/routes/CollectionDetail.tsx apps/web/src/components/StarRating.tsx apps/web/src/routes/__tests__/Collections.test.tsx apps/web/src/routes/__tests__/CollectionDetail.test.tsx apps/web/src/main.tsx
git commit -m "feat(collections): web list, detail, StarRating component"
```

---

### Task 7: Practice pages (Shadow, Recall, Review, Filter)

**Files:**

- Create: `apps/web/src/routes/Shadow.tsx`
- Create: `apps/web/src/routes/Recall.tsx`
- Create: `apps/web/src/routes/Review.tsx`
- Create: `apps/web/src/routes/Filter.tsx`
- Create: `apps/web/src/components/AudioComingSoon.tsx`
- Create: `apps/web/src/components/MicRecorder.tsx`
- Create: `apps/web/src/routes/__tests__/Shadow.test.tsx`
- Create: `apps/web/src/routes/__tests__/Recall.test.tsx`
- Create: `apps/web/src/routes/__tests__/Review.test.tsx`
- Create: `apps/web/src/routes/__tests__/Filter.test.tsx`
- Modify: `apps/web/src/main.tsx`

**Interfaces:**

- Consumes: practice API routes from Task 3; `practiceItemSchema`; `AudioComingSoon` placeholder.
- Produces: Shadow, Recall, Review, and Filter pages.

- [ ] **Step 1: Create `apps/web/src/components/AudioComingSoon.tsx`**

```tsx
export default function AudioComingSoon() {
  return (
    <div role="status" aria-live="polite" style={{ border: '1px dashed #999', padding: 12 }}>
      <p><strong>Audio playback coming soon.</strong></p>
      <p>Reviewed European Portuguese audio will play here once Phase C ships. You can still record and self-rate.</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/components/MicRecorder.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';

type Props = { onStop: (blob: Blob | null) => void };

export function MicRecorder({ onStop }: Props) {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const urlRef = useRef<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(blob);
        setLastBlob(blob);
        onStop(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e: any) {
      setError(e.message ?? 'mic denied');
    }
  }

  function stop() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  function discard() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setLastBlob(null);
    onStop(null);
  }

  return (
    <div>
      {error ? <p role="alert">{error}</p> : null}
      {!recording && lastBlob === null ? <button onClick={start}>Record</button> : null}
      {recording ? <button onClick={stop}>Stop</button> : null}
      {!recording && lastBlob !== null ? (
        <>
          <audio controls src={urlRef.current ?? undefined} />
          <button onClick={discard}>Discard</button>
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/src/routes/Shadow.tsx`**

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import AudioComingSoon from '../components/AudioComingSoon';
import { MicRecorder } from '../components/MicRecorder';
import { StarRating } from '../components/StarRating';
import { useSettings } from '../hooks/useSettings';

export default function ShadowPage() {
  const { unitId } = useParams();
  const qc = useQueryClient();
  const settings = useSettings();
  const queue = useQuery({ queryKey: ['practice-queue', unitId, settings.data?.sortOrder], queryFn: async () => (await fetch(`/api/practice/queue?unit_id=${unitId}&mode=shadow`, { credentials: 'include' })).json(), enabled: !!unitId });
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const idx = 0;
  const current = queue.data?.items?.[idx] as any;
  const rate = useMutation({
    mutationFn: async (rating: number) => {
      const res = await fetch('/api/practice/ratings', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-client-mutation-id': `cm_${crypto.randomUUID()}` },
        credentials: 'include',
        body: JSON.stringify({ clientMutationId: `cm_${crypto.randomUUID()}`, sentenceId: current.sentenceId, mode: 'shadow', rating }),
      });
      if (!res.ok) throw new Error('rate failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['practice-queue', unitId, settings.data?.sortOrder] }),
  });
  if (!current) return <p>Loading…</p>;
  return (
    <main>
      <h1>Shadow — {current.textPt}</h1>
      <AudioComingSoon />
      <p>English: {current.textEn}</p>
      <MicRecorder onStop={(blob) => setRecordingBlob(blob)} />
      <p>Recorded blob present: {recordingBlob ? 'yes (local-only)' : 'no'}</p>
      <StarRating value={0} onChange={(n) => rate.mutate(n)} />
    </main>
  );
}
```

- [ ] **Step 4: Create `apps/web/src/routes/Recall.tsx`**

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { StarRating } from '../components/StarRating';

export default function RecallPage() {
  const { unitId } = useParams();
  const qc = useQueryClient();
  const queue = useQuery({ queryKey: ['practice-queue-recall', unitId], queryFn: async () => (await fetch(`/api/practice/queue?unit_id=${unitId}&mode=recall`, { credentials: 'include' })).json(), enabled: !!unitId });
  const [revealed, setRevealed] = useState(false);
  const current = queue.data?.items?.[0] as any;
  const rate = useMutation({
    mutationFn: async (rating: number) => {
      const res = await fetch('/api/practice/ratings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientMutationId: `cm_${crypto.randomUUID()}`, sentenceId: current.sentenceId, mode: 'recall', rating }),
      });
      if (!res.ok) throw new Error('rate failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['practice-queue-recall', unitId] }),
  });
  if (!current) return <p>Loading…</p>;
  return (
    <main>
      <h1>Recall</h1>
      <p>English: {current.textEn}</p>
      {!revealed ? <button onClick={() => setRevealed(true)}>Reveal</button> : <p>Portuguese: <strong>{current.textPt}</strong></p>}
      <StarRating value={0} onChange={(n) => rate.mutate(n)} />
    </main>
  );
}
```

- [ ] **Step 5: Create `apps/web/src/routes/Review.tsx`**

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StarRating } from '../components/StarRating';

export default function ReviewPage() {
  const qc = useQueryClient();
  const queue = useQuery({ queryKey: ['practice-review'], queryFn: async () => (await fetch('/api/practice/review?mode=shadow&limit=50', { credentials: 'include' })).json() });
  const [current, setCurrent] = useState<any | null>(null);
  const items = (current ? [current] : (queue.data?.items ?? [])) as any[];
  const visible = items[0] ?? null;
  const rate = useMutation({
    mutationFn: async (rating: number) => {
      const res = await fetch('/api/practice/ratings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientMutationId: `cm_${crypto.randomUUID()}`, sentenceId: visible.sentenceId, mode: 'shadow', rating }),
      });
      if (!res.ok) throw new Error('rate failed');
      qc.invalidateQueries({ queryKey: ['practice-review'] });
      setCurrent(null);
    },
  });
  return (
    <main>
      <h1>Smart Review</h1>
      {visible ? (
        <>
          <p>{visible.textPt} — {visible.textEn}</p>
          <p>Current rating: {visible.rating}</p>
          <StarRating value={visible.rating} onChange={(n) => rate.mutate(n)} />
        </>
      ) : (<p>No review items.</p>)}
    </main>
  );
}
```

- [ ] **Step 6: Create the `/api/curriculum/sentences` filter endpoint**

Phase B is the first consumer of cross-unit text search. Add a new controller that delegates to `@pt/domain::applyFilter`.

`apps/api/src/modules/curriculum/filter.ts` (Create):

```ts
import { Response } from 'express';
import { filterExpressionSchema, matchModeSchema } from '@pt/contracts/filter';
import { db } from '../../db/client.js';
import { sql } from 'drizzle-orm';
import { applyFilter, PracticeItem } from '@pt/domain';

export async function searchSentences(req: any, res: Response) {
  const exprParsed = filterExpressionSchema.safeParse(req.query.filter ?? '');
  if (!exprParsed.success) {
    res.status(400).json({ error: { code: 'validation_failed', message: exprParsed.error.message, correlationId: res.locals.correlationId } });
    return;
  }
  const matchParsed = matchModeSchema.safeParse(req.query.match ?? 'or');
  if (!matchParsed.success) {
    res.status(400).json({ error: { code: 'validation_failed', message: matchParsed.error.message, correlationId: res.locals.correlationId } });
    return;
  }
  const cvRow = (await db.execute(sql`SELECT id FROM curriculum_versions WHERE active = true LIMIT 1`)) as any[];
  const cvId = cvRow[0]?.id as string;
  const rows = (await db.execute(sql`
    SELECT s.sentence_id, csv.text_pt, csv.text_en, s.order_index, u.unit_id
    FROM sentences s
    JOIN cv_sentence_versions csv ON csv.sentence_id = s.sentence_id AND csv.cv_id = ${cvId}
    JOIN units u ON u.unit_id = s.unit_id OR s.unit_id IS NULL
    ORDER BY s.order_index ASC
    LIMIT 500
  `)) as any[];
  const practiceItems: PracticeItem[] = rows.map((r) => ({
    sentenceId: r.sentence_id, textPt: r.text_pt, textEn: r.text_en, audioId: null, unitId: r.unit_id, orderIndex: r.order_index,
  }));
  const terms = exprParsed.data.split(',').map((t) => t.trim()).filter(Boolean);
  const filtered = applyFilter(practiceItems, terms, matchParsed.data === 'all');
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.setHeader('ETag', `"${cvId}"`);
  res.status(200).json({ items: filtered });
}
```

`apps/api/src/modules/curriculum/routes.ts` (Create):

```ts
import { Router } from 'express';
import { requireAuth } from '../auth/requireAuth.js';
import { searchSentences } from './filter.js';

export const curriculumFilterRouter = Router();
curriculumFilterRouter.use(requireAuth);
curriculumFilterRouter.get('/sentences', searchSentences);
```

Modify `apps/api/src/index.ts`:

```ts
import { curriculumFilterRouter } from './modules/curriculum/routes.js';
app.use('/api/curriculum', curriculumFilterRouter);
```

- [ ] **Step 7: Create `apps/web/src/routes/Filter.tsx`**

```tsx
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export default function FilterPage() {
  const [q, setQ] = useState('');
  const [matchAll, setMatchAll] = useState(false);
  const search = useQuery({
    queryKey: ['filter', q, matchAll],
    queryFn: async () => (await fetch(`/api/curriculum/sentences?filter=${encodeURIComponent(q)}&match=${matchAll ? 'all' : 'or'}`, { credentials: 'include' })).json(),
    enabled: q.length > 0,
  });
  return (
    <main>
      <h1>Filter</h1>
      <label>Terms <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="dar, João" /></label>
      <label><input type="checkbox" checked={matchAll} onChange={(e) => setMatchAll(e.target.checked)} /> Match all</label>
      <ul>
        {(search.data?.items ?? []).map((s: any) => <li key={s.sentenceId}>{s.textPt} — {s.textEn}</li>)}
      </ul>
    </main>
  );
}
```

- [ ] **Step 8: Create `apps/web/src/hooks/useSettings.ts`**

```ts
import { useQuery } from '@tanstack/react-query';

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: async () => (await fetch('/api/me/settings', { credentials: 'include' })).json() });
}
```

- [ ] **Step 9: Write the failing web tests**

```tsx
// apps/web/src/routes/__tests__/Shadow.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ShadowPage from '../Shadow';

const fetchMock = vi.fn();
(globalThis as any).fetch = fetchMock;
fetchMock.mockResolvedValue({ ok: true, json: async () => ({ items: [{ sentenceId: 'sen_1', textPt: 'Olá.', textEn: 'Hello.', audioId: null, unitId: 'unit_a1_int', orderIndex: 0 }] }) });

it('renders the first sentence and the AudioComingSoon placeholder', async () => {
  const { container } = render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/units/unit_a1_int/shadow']}>
        <Routes><Route path="/units/:unitId/shadow" element={<ShadowPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(container.textContent).toContain('Olá.'));
  expect(container.textContent).toContain('Audio playback coming soon');
});
```

```tsx
// apps/web/src/routes/__tests__/Recall.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RecallPage from '../Recall';

const fetchMock = vi.fn();
(globalThis as any).fetch = fetchMock;
fetchMock.mockResolvedValue({ ok: true, json: async () => ({ items: [{ sentenceId: 'sen_1', textPt: 'Olá.', textEn: 'Hello.', audioId: null, unitId: 'unit_a1_int', orderIndex: 0 }] }) });

it('reveals the Portuguese only after clicking Reveal', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/units/unit_a1_int/recall']}>
        <Routes><Route path="/units/:unitId/recall" element={<RecallPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText('English: Hello.')).toBeInTheDocument());
  expect(screen.queryByText('Olá.')).toBeNull();
  screen.getByText('Reveal').click();
  expect(screen.getByText('Olá.')).toBeInTheDocument();
});
```

```tsx
// apps/web/src/routes/__tests__/Review.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReviewPage from '../Review';

const fetchMock = vi.fn();
(globalThis as any).fetch = fetchMock;

it('renders the Smart Review heading and a visible sentence', async () => {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ sentenceId: 'sen_1', textPt: 'Olá.', textEn: 'Hello.', rating: 3 }] }) });
  render(<QueryClientProvider client={new QueryClient()}><ReviewPage /></QueryClientProvider>);
  await waitFor(() => expect(screen.getByText('Smart Review')).toBeInTheDocument());
  expect(screen.getByText('Olá. — Hello.')).toBeInTheDocument();
});
```

```tsx
// apps/web/src/routes/__tests__/Filter.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FilterPage from '../Filter';

const fetchMock = vi.fn();
(globalThis as any).fetch = fetchMock;

it('renders only matching sentences after typing a term', async () => {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ sentenceId: 'sen_1', textPt: 'Como vai?', textEn: 'How are you?' }] }) });
  render(<QueryClientProvider client={new QueryClient()}><FilterPage /></QueryClientProvider>);
  await waitFor(() => expect(screen.getByLabelText('Terms')).toBeInTheDocument());
  screen.getByLabelText('Terms').focus();
  (screen.getByLabelText('Terms') as HTMLInputElement).value = 'como';
  screen.getByLabelText('Terms').dispatchEvent(new Event('change', { bubbles: true }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/curriculum/sentences'), expect.anything()));
});
```

- [ ] **Step 10: Run the web tests to verify they pass**

Run: `pnpm --filter @pt/web exec vitest run src/routes/__tests__/Shadow.test.tsx`
Expected: PASS.

- [ ] **Step 11: Modify `apps/web/src/main.tsx`**

```tsx
import ShadowPage from './routes/Shadow.js';
import RecallPage from './routes/Recall.js';
import ReviewPage from './routes/Review.js';
import FilterPage from './routes/Filter.js';

const router = createBrowserRouter([
  // … existing routes …
  { path: '/units/:unitId/shadow', element: <RequireAuth><ShadowPage /></RequireAuth> },
  { path: '/units/:unitId/recall', element: <RequireAuth><RecallPage /></RequireAuth> },
  { path: '/practice/review', element: <RequireAuth><ReviewPage /></RequireAuth> },
  { path: '/practice/filter', element: <RequireAuth><FilterPage /></RequireAuth> },
]);
```

- [ ] **Step 12: Commit (review-only)**

```bash
git add apps/api/src/modules/curriculum apps/web/src/routes/Shadow.tsx apps/web/src/routes/Recall.tsx apps/web/src/routes/Review.tsx apps/web/src/routes/Filter.tsx apps/web/src/components/AudioComingSoon.tsx apps/web/src/components/MicRecorder.tsx apps/web/src/routes/__tests__ apps/web/src/hooks/useSettings.ts apps/web/src/main.tsx
git commit -m "feat(practice): /api/curriculum/sentences filter + Shadow/Recall/Review/Filter pages with audio placeholder + MicRecorder"
```

---

### Task 8: Six-stage navigation + Unit-progress API

**Files:**

- Create: `apps/api/src/modules/unit-progress/{routes,controller,repository}.ts`
- Create: `apps/api/src/modules/unit-progress/__tests__/unit-progress.test.ts`
- Modify: `apps/api/src/index.ts`
- Create: `apps/web/src/routes/Unit.tsx`
- Create: `apps/web/src/routes/Learn.tsx`
- Create: `apps/web/src/routes/Notice.tsx`
- Create: `apps/web/src/routes/Apply.tsx`
- Create: `apps/web/src/routes/Communicate.tsx`
- Create: `apps/web/src/routes/__tests__/Unit.test.tsx`
- Modify: `apps/web/src/main.tsx`

**Interfaces:**

- Consumes: `unit_progress(user_id, unit_id, stage)` PK (Phase A schema); `nextStageRecommendation` from `@pt/domain`.
- Produces: `POST /api/unit-progress/:unitId/:stage`; Unit page with the six-stage loop; Learn/Notice/Apply/Communicate pages.

- [ ] **Step 1: Write the failing API test**

```ts
// apps/api/src/modules/unit-progress/__tests__/unit-progress.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../db/client.js';
import request from 'supertest';
import { createApp } from '../../../index.js';

describe('unit-progress api', () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(async () => {
    await db.execute(require('drizzle-orm').sql`TRUNCATE TABLE unit_progress, auth_sessions, users RESTART IDENTITY CASCADE`);
    await db.execute(require('drizzle-orm').sql`INSERT INTO users (user_id, email, password_hash) VALUES ('usr_seed', 'a@b', 'x')`);
    await db.execute(require('drizzle-orm').sql`INSERT INTO auth_sessions (session_id, user_id, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at) VALUES ('sess_seed', 'usr_seed', 'h_acc', 'h_ref', now() + interval '15 minutes', now() + interval '30 days')`);
    app = createApp();
  });
  it('writes a row for the stage', async () => {
    const res = await request(app).post('/api/unit-progress/unit_a1/learn').set('Cookie', 'ptp_access=t').send({ status: 'complete' });
    expect(res.status).toBe(200);
    expect(res.body.stage).toBe('learn');
  });
  it('rejects an unknown stage', async () => {
    const res = await request(app).post('/api/unit-progress/unit_a1/bogus').set('Cookie', 'ptp_access=t').send({ status: 'complete' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('stage_unknown');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @pt/api exec vitest run src/modules/unit-progress/__tests__/unit-progress.test.ts`
Expected: FAIL on missing module.

- [ ] **Step 3: Create `apps/api/src/modules/unit-progress/repository.ts`**

```ts
import { db } from '../../db/client.js';
import { sql } from 'drizzle-orm';

export async function markComplete(userId: string, unitId: string, stage: string) {
  await db.execute(sql`
    INSERT INTO unit_progress (user_id, unit_id, stage, completed_at)
    VALUES (${userId}, ${unitId}, ${stage}, now())
    ON CONFLICT (user_id, unit_id, stage) DO UPDATE SET completed_at = EXCLUDED.completed_at
  `);
  return { userId, unitId, stage, completedAt: new Date().toISOString() };
}

export async function listCompleted(userId: string, unitId: string) {
  const rows = (await db.execute(sql`SELECT stage FROM unit_progress WHERE user_id = ${userId} AND unit_id = ${unitId}`)) as any[];
  return rows.map((r) => r.stage);
}
```

- [ ] **Step 4: Create `apps/api/src/modules/unit-progress/controller.ts`**

```ts
import { Response } from 'express';
import { unitStageSchema, unitProgressWriteSchema } from '@pt/contracts/unitProgress';
import { markComplete, listCompleted } from './repository.js';

export async function mark(req: any, res: Response) {
  const stageParsed = unitStageSchema.safeParse(req.params.stage);
  if (!stageParsed.success) {
    res.status(400).json({ error: { code: 'stage_unknown', message: 'unknown stage', correlationId: res.locals.correlationId } });
    return;
  }
  const bodyParsed = unitProgressWriteSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: { code: 'unit_progress_invalid_status', message: bodyParsed.error.message, correlationId: res.locals.correlationId } });
    return;
  }
  const userId = res.locals.userId as string;
  const out = await markComplete(userId, req.params.unitId, stageParsed.data);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(out);
}
```

- [ ] **Step 5: Create `apps/api/src/modules/unit-progress/routes.ts`**

```ts
import { Router } from 'express';
import { requireAuth } from '../auth/requireAuth.js';
import { mark } from './controller.js';

export const unitProgressRouter = Router();
unitProgressRouter.use(requireAuth);
unitProgressRouter.post('/:unitId/:stage', mark);
```

- [ ] **Step 6: Modify `apps/api/src/index.ts`**

```ts
import { unitProgressRouter } from './modules/unit-progress/routes.js';
app.use('/api/unit-progress', unitProgressRouter);
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm --filter @pt/api exec vitest run src/modules/unit-progress/__tests__/unit-progress.test.ts`
Expected: PASS.

- [ ] **Step 8: Create `apps/web/src/routes/Unit.tsx`**

```tsx
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { nextStageRecommendation, STAGE_ORDER } from '@pt/domain';

const STAGE_LABEL = { learn: 'Learn', notice: 'Notice', shadow: 'Shadow', recall: 'Recall', apply: 'Apply', communicate: 'Communicate' } as const;
const STAGE_PATH = { learn: 'learn', notice: 'notice', shadow: 'shadow', recall: 'recall', apply: 'apply', communicate: 'communicate' } as const;

export default function UnitPage() {
  const { unitId } = useParams();
  const completed = useQuery({
    queryKey: ['unit-progress', unitId],
    queryFn: async () => (await fetch(`/api/curriculum/units/${unitId}`, { credentials: 'include' })).json().then((u) => u.progress?.completedStages ?? []),
    enabled: !!unitId,
  });
  const completedStages = (completed.data ?? []) as ReadonlyArray<string>;
  const firstIncomplete = nextStageRecommendation({ completedStages: completedStages as any });
  return (
    <main>
      <h1>Unit {unitId}</h1>
      <ol>
        {STAGE_ORDER.map((s) => (
          <li key={s}><a href={`/units/${unitId}/${STAGE_PATH[s]}`}>{STAGE_LABEL[s]}</a> {completedStages.includes(s) ? '✓' : ''}</li>
        ))}
      </ol>
      {firstIncomplete ? <a href={`/units/${unitId}/${STAGE_PATH[firstIncomplete]}`}>Continue → {STAGE_LABEL[firstIncomplete]}</a> : <p>All stages complete.</p>}
    </main>
  );
}
```

- [ ] **Step 9: Create `apps/web/src/routes/Learn.tsx`**

```tsx
import { useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';

export default function LearnPage() {
  const { unitId } = useParams();
  const mark = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/unit-progress/${unitId}/learn`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'complete' }), credentials: 'include' });
      if (!res.ok) throw new Error('mark failed');
      return res.json();
    },
  });
  return (
    <main>
      <h1>Learn</h1>
      <p>Vocabulary cards render here, sourced from <code>cv_sentence_versions</code> via the active CV.</p>
      <button onClick={() => mark.mutate()} disabled={mark.isPending}>Mark complete</button>
      <p><Link to={`/units/${unitId}/notice`}>Next: Notice →</Link></p>
    </main>
  );
}
```

- [ ] **Step 10: Create `apps/web/src/routes/Notice.tsx`** identical in shape to `Learn.tsx` but for the notice stage:

```tsx
import { useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';

export default function NoticePage() {
  const { unitId } = useParams();
  const mark = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/unit-progress/${unitId}/notice`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'complete' }), credentials: 'include' });
      if (!res.ok) throw new Error('mark failed');
      return res.json();
    },
  });
  return (
    <main>
      <h1>Notice</h1>
      <p>Grammar and pronunciation prose render here, sourced from <code>cv_sentence_versions</code> via the active CV.</p>
      <button onClick={() => mark.mutate()} disabled={mark.isPending}>Mark complete</button>
      <p><Link to={`/units/${unitId}/shadow`}>Next: Shadow →</Link></p>
    </main>
  );
}
```

- [ ] **Step 11: Create `apps/web/src/routes/Apply.tsx`** mirrors Learn's pattern; renders the unit's islands list and posts to `/api/unit-progress/:unitId/apply`. The Apply page reads the unit's `islands` via `GET /api/curriculum/units/:unitId` and renders each island's sentences via `island_sentences`. Audio is "coming soon" per Phase A's `Pre-Phase C Audio` glossary term; sentences render text-only.

```tsx
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import AudioComingSoon from '../components/AudioComingSoon';

export default function ApplyPage() {
  const { unitId } = useParams();
  const unit = useQuery({ queryKey: ['unit-detail', unitId], queryFn: async () => (await fetch(`/api/curriculum/units/${unitId}`, { credentials: 'include' })).json(), enabled: !!unitId });
  const mark = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/unit-progress/${unitId}/apply`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'complete' }), credentials: 'include' });
      if (!res.ok) throw new Error('mark failed');
      return res.json();
    },
  });
  return (
    <main>
      <h1>Apply</h1>
      {unit.data?.islands?.map((island: any) => (
        <section key={island.id}>
          <h2>{island.title}</h2>
          <p><em>{island.kind}</em></p>
          <ol>
            {island.items?.map((s: any) => <li key={s.sentenceId}><strong>{s.textPt}</strong> — {s.textEn}</li>)}
          </ol>
          <AudioComingSoon />
        </section>
      ))}
      <button onClick={() => mark.mutate()} disabled={mark.isPending}>Mark complete</button>
      <p><Link to={`/units/${unitId}/communicate`}>Next: Communicate →</Link></p>
    </main>
  );
}
```

- [ ] **Step 12: Create `apps/web/src/routes/Communicate.tsx`**

```tsx
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

export default function CommunicatePage() {
  const { unitId } = useParams();
  const unit = useQuery({ queryKey: ['unit-detail', unitId], queryFn: async () => (await fetch(`/api/curriculum/units/${unitId}`, { credentials: 'include' })).json(), enabled: !!unitId });
  const scenarios = (unit.data as any)?.scenarios ?? [];
  return (
    <main>
      <h1>Communicate</h1>
      <p>Phase D will add the AI role-play for each scenario below. The stub does not call any external provider.</p>
      <ul>
        {scenarios.map((s: any) => <li key={s.id}>{s.title} — {s.objective}</li>)}
      </ul>
    </main>
  );
}
```

- [ ] **Step 13: Write the failing Unit test**

```tsx
// apps/web/src/routes/__tests__/Unit.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UnitPage from '../Unit';

const fetchMock = vi.fn();
(globalThis as any).fetch = fetchMock;

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'unit_a1_int', progress: { completedStages: ['learn', 'notice'] } }) });
});

it('renders all six stages and a Continue link to the next incomplete one', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/units/unit_a1_int']}>
        <Routes><Route path="/units/:unitId" element={<UnitPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText('Shadow')).toBeInTheDocument());
  expect(screen.getByText(/Continue → Shadow/)).toBeInTheDocument();
});
```

- [ ] **Step 14: Run the web test to verify it passes**

Run: `pnpm --filter @pt/web exec vitest run src/routes/__tests__/Unit.test.tsx`
Expected: PASS.

- [ ] **Step 15: Modify `apps/web/src/main.tsx`**

```tsx
import UnitPage from './routes/Unit.js';
import LearnPage from './routes/Learn.js';
import NoticePage from './routes/Notice.js';
import ApplyPage from './routes/Apply.js';
import CommunicatePage from './routes/Communicate.js';

const router = createBrowserRouter([
  // … existing routes …
  { path: '/units/:unitId', element: <RequireAuth><UnitPage /></RequireAuth> },
  { path: '/units/:unitId/learn', element: <RequireAuth><LearnPage /></RequireAuth> },
  { path: '/units/:unitId/notice', element: <RequireAuth><NoticePage /></RequireAuth> },
  { path: '/units/:unitId/apply', element: <RequireAuth><ApplyPage /></RequireAuth> },
  { path: '/units/:unitId/communicate', element: <RequireAuth><CommunicatePage /></RequireAuth> },
]);
```

- [ ] **Step 16: Commit (review-only)**

```bash
git add apps/api/src/modules/unit-progress apps/api/src/index.ts \
        apps/web/src/routes/Unit.tsx apps/web/src/routes/Learn.tsx apps/web/src/routes/Notice.tsx \
        apps/web/src/routes/Apply.tsx apps/web/src/routes/Communicate.tsx \
        apps/web/src/routes/__tests__/Unit.test.tsx apps/web/src/main.tsx
git commit -m "feat(nav): six-stage Unit page + Learn/Notice/Apply/Communicate + unit-progress API"
```

---

### Task 9: Phase B smoke test suite

**Files:**

- Create: `tests/e2e/phase-b-smoke.spec.ts` (Playwright)
- Modify: `playwright.config.ts` (already in Phase A)

**Interfaces:**

- Consumes: every Phase B surface (Task 1–Task 8 outputs).
- Produces: a Playwright smoke suite that verifies the §13.3 acceptance criteria for the practice surface.

- [ ] **Step 1: Write the failing smoke test**

```ts
// tests/e2e/phase-b-smoke.spec.ts
import { test, expect } from '@playwright/test';

async function login(page: any) {
  await page.goto('http://localhost:5173/login');
  await page.getByLabel('Email').fill('a@b');
  await page.getByLabel('Password').fill('correct-horse-battery-staple');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/');
}

test('home → unit page → shadow → rate → review queue', async ({ page }) => {
  await login(page);
  await page.getByText('a1-introductions').click();
  await page.getByRole('link', { name: /Continue → Shadow/ }).click();
  await expect(page.getByText('Audio playback coming soon.')).toBeVisible();
  await page.getByRole('radio', { name: '4 stars' }).click();
  await page.goto('http://localhost:5173/practice/review');
  await expect(page.getByRole('heading', { name: 'Smart Review' })).toBeVisible();
});

test('settings → audio speed persists across hard refresh', async ({ page }) => {
  await login(page);
  await page.goto('http://localhost:5173/settings');
  await page.getByLabel('Audio speed').fill('0.75');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.reload();
  await expect(page.getByLabel('Audio speed')).toHaveValue('0.75');
});

test('filter OR default returns sentences containing any term', async ({ page }) => {
  await login(page);
  await page.goto('http://localhost:5173/practice/filter');
  await page.getByLabel('Terms').fill('dar, João');
  await expect(page.getByRole('listitem')).toHaveCount(1);
});
```

- [ ] **Step 2: Run the smoke test against `pnpm dev`**

Run: `pnpm dev` (in a separate terminal) → `pnpm exec playwright test tests/e2e/phase-b-smoke.spec.ts`
Expected: PASS for all three scenarios.

- [ ] **Step 3: Commit (review-only)**

```bash
git add tests/e2e/phase-b-smoke.spec.ts
git commit -m "test(e2e): Phase B smoke suite covering home → shadow → review, settings persistence, filter"
```

---

### Task 10: Vertical-slice verification

**No commit; verification gate.**

- [ ] **Step 1: Full regression on `pnpm`**

Run: `pnpm -r typecheck && pnpm -r lint && pnpm -r test && pnpm -r build`
Expected: every workspace green; smoke, contract, domain, integration, and web tests all pass.

- [ ] **Step 2: Auth + Curriculum + Practice via curl**

```bash
bash scripts/dev-up.sh
curl -X POST http://localhost:8787/api/auth/login -H 'content-type: application/json' -d '{"email":"a@b","password":"correct-horse-battery-staple"}' -c /tmp/cj -b /tmp/cj
curl http://localhost:8787/api/curriculum/levels/a1 -b /tmp/cj
curl http://localhost:8787/api/practice/queue?unit_id=unit_a1_int\&mode=shadow -b /tmp/cj
```

Expected: 200 / 200 / 200 with `items[]` populated.

- [ ] **Step 3: Walk through §13.3 acceptance manually**

Open `http://localhost:5173`, log in, navigate to `a1-introductions`, click each stage, complete Smart Review, edit Settings, refresh, verify Filter OR/AND, ESLint refuses any new `legacy/` import.

- [ ] **Step 4: Update `PROGRESS.md` + `HANDOFF.md`**

Bump `**Last updated:**`. Add a Session for "Phase B implemented." Update the artefact table to include this plan and any new ADRs Phase B created.

- [ ] **Step 5: No commit fires**

If anything in Steps 1–3 fails, the matching task's commit is rolled back and re-tried before Phase B can be claimed complete.

---

## Verification

Phase B exits only when all of `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test`, `pnpm -r build`, `bash scripts/dev-up.sh`, every Task's per-task test, and the §13.3 acceptance scenarios (Task 10 Step 3) pass on the greenfield branch. `verification-before-completion` discipline applies to every green claim.

## Out of scope (this plan)

- Audio asset rows / `audio_assets` writes (Phase C).
- Capacitor 8 Android wrapper + Android bearer transport (Phase C).
- AI role-play scenarios + `ConversationAdapter` real implementations (Phase D).
- Listen & Repeat against reviewed audio (Phase C replaces the `<AudioComingSoon />` body with one `replace`).
- Public registration, multi-tenant, B1+ content (rebuild spec §15).

## First action for the next agent

```bash
cd /home/david/shadowdog-dev/projects/portuguese-teacher
git checkout main
git pull
git log --oneline -20
# Confirm Phase A + amendment plan (Tasks A1–A7) have merged.
git checkout -b feat/phase-b-practice-surface
ls packages/
ls apps/
pnpm install --frozen-lockfile
pnpm -r typecheck && pnpm -r lint && pnpm -r test && pnpm -r build
# Then run Tasks 1 through 9 in order.
```
