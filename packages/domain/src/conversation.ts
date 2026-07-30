// Conversation turn-bucket helpers — pure re-ordering of typed turns.
//
// Phase A only needs the turn-bucket shape so that:
//   - The @pt/content "structured summary" call (Phase D) can compute
//     learner/teacher counts without an adapter round-trip.
//   - The conversation summary builder (Phase D) can re-use the
//     bucketed turns directly.
//
// Phase A does NOT compute narrative text, rubric scores, or any
// provider-specific summary; those land with Phase D's adapter
// implementation.

import type { ConversationTurn } from '@pt/contracts';

export interface ConversationTurnBuckets {
  readonly learner: ReadonlyArray<ConversationTurn>;
  readonly teacher: ReadonlyArray<ConversationTurn>;
  readonly system: ReadonlyArray<ConversationTurn>;
}

/**
 * Pure: same turns → same buckets. Order within a bucket is preserved
 * from the input array (chronological, assuming the input is already
 * in `createdAt ASC` order from the API).
 */
export function bucketTurnsByRole(
  turns: ReadonlyArray<ConversationTurn>,
): ConversationTurnBuckets {
  const learner: ConversationTurn[] = [];
  const teacher: ConversationTurn[] = [];
  const system: ConversationTurn[] = [];

  for (const turn of turns) {
    switch (turn.role) {
      case 'learner':
        learner.push(turn);
        break;
      case 'teacher':
        teacher.push(turn);
        break;
      case 'system':
        system.push(turn);
        break;
    }
  }

  return { learner, teacher, system };
}