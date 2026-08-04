// Six-stage unit loop — pure helper.
//
// Per CONTEXT.md "Six-Stage Loop" + rebuild spec §12.4:
//   - Stages in order: learn, notice, shadow, recall, apply, communicate.
//   - "Next stage" is the lowest stage the learner has not yet
//     completed. Null when every stage is complete.
//
// The `unit_progress` table (Phase B) stores the per-learner
// `(unit_id, stage, status)` rows; this helper is the pure
// recommendation rule. The API layer joins the DB rows into an
// array and calls `nextStageRecommendation`.

export const STAGE_ORDER = [
  'learn',
  'notice',
  'shadow',
  'recall',
  'apply',
  'communicate',
] as const;

export type Stage = (typeof STAGE_ORDER)[number];

export function nextStageRecommendation(opts: {
  completedStages: ReadonlyArray<Stage>;
}): Stage | null {
  const completed = new Set(opts.completedStages);
  for (const stage of STAGE_ORDER) {
    if (!completed.has(stage)) return stage;
  }
  return null;
}
