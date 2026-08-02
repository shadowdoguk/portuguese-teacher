// Unit-progress schemas — shared by @pt/api and @pt/web.
//
// Per CONTEXT.md "Unit Progress" and SPEC §12.4, the six-stage
// loop is captured in `unit_progress(user_id, unit_id, stage,
// status)`. Stage completion is the only status Phase B writes —
// "skipped" and "in_progress" are deferred. Reads from the API
// return the union of completed stages for a unit.

import { z } from 'zod';

/** The six stages of the practice loop (CONTEXT.md "Six-Stage Loop"). */
export const unitStageSchema = z.enum([
  'learn',
  'notice',
  'shadow',
  'recall',
  'apply',
  'communicate',
]);

export type UnitStage = z.infer<typeof unitStageSchema>;

/** Status enum — only "complete" is writable in Phase B. */
export const unitProgressStatusSchema = z.enum(['complete']);
export type UnitProgressStatus = z.infer<typeof unitProgressStatusSchema>;

/** Body for `POST /api/unit-progress/:unitId/:stage`. */
export const unitProgressWriteSchema = z.object({
  status: z.literal('complete'),
});

export type UnitProgressWrite = z.infer<typeof unitProgressWriteSchema>;

/** Response shape — the row written, with timestamps. */
export const unitProgressSchema = z.object({
  userId: z.string().regex(/^usr_[a-z0-9]+$/),
  unitId: z.string().regex(/^unit_[a-z0-9_]+$/),
  stage: unitStageSchema,
  status: unitProgressStatusSchema,
  completedAt: z.string().datetime(),
});

export type UnitProgress = z.infer<typeof unitProgressSchema>;

/** Aggregate response — every (stage, status) row for a unit. */
export const unitProgressListResponseSchema = z.object({
  unitId: z.string().regex(/^unit_[a-z0-9_]+$/),
  rows: z.array(unitProgressSchema),
});
