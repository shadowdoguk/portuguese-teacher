// Conversation schemas — shared by @pt/api and @pt/web.
//
// Phase A defines the scenario / session / message / summary shapes
// and an in-memory `ConversationAdapter` stub (CONTEXT.md "Provider
// Adapter"). Phase D wires a real provider (MiniMax or OpenAI per the
// rebuild spec's §4 row), bounded context, and structured summary.
// Scenarios carry `status: "draft" | "published"`; only `published`
// surfaces on the learner surface (rebuild spec §5.3).

import { z } from 'zod';

// ---------- IDs ----------------------------------------------------------

// `scenarioIdSchema` is exported by `./curriculum.ts` as the single
// source of truth. We import it here so existing call sites that
// reference `scenarioIdSchema` from this module keep working without
// a duplicate export (which would collide under `export *`).
import { scenarioIdSchema } from './curriculum.js';
export { scenarioIdSchema };

/** `csess_<uuid>` Conversation Session ID. */
export const conversationSessionIdSchema = z.string().regex(/^csess_[0-9a-f-]{36}$/);

/** `cmsg_<uuid>` Conversation Message ID. */
export const conversationMessageIdSchema = z.string().regex(/^cmsg_[0-9a-f-]{36}$/);

// ---------- Scenario metadata -------------------------------------------

export const scenarioStatusSchema = z.enum(['draft', 'published']);

export const conversationScenarioSchema = z.object({
  scenarioId: scenarioIdSchema,
  unitId: z.string().regex(/^unit_[a-z0-9][a-z0-9_]*$/),
  title: z.string().min(1),
  /** Setting (e.g. "Café in Lisbon"). */
  setting: z.string().min(1),
  /** Roles (e.g. ["barista", "customer"]). */
  roles: z.array(z.string().min(1)).min(1),
  /** Learner objective (e.g. "order a coffee and a pastel de nata"). */
  learnerObjective: z.string().min(1),
  /** Expected vocabulary and grammar refs. */
  expectedVocabularyRefs: z.array(z.string()),
  expectedGrammarRefs: z.array(z.string()),
  /** Opening message the AI Teacher sends. */
  openingMessage: z.string().min(1),
  /** Completion conditions — list of phrases / heuristics. */
  completionConditions: z.array(z.string().min(1)).min(1),
  /** Correction policy (e.g. "correct only on direct ask"). */
  correctionPolicy: z.string(),
  /** Feedback rubric — list of criteria. */
  feedbackRubric: z.array(z.string().min(1)),
  status: scenarioStatusSchema,
});

export type ConversationScenario = z.infer<typeof conversationScenarioSchema>;

// ---------- Turns (typed message bus) -----------------------------------

export const conversationRoleSchema = z.enum(['learner', 'teacher', 'system']);

export const conversationTurnSchema = z.object({
  messageId: conversationMessageIdSchema,
  sessionId: conversationSessionIdSchema,
  role: conversationRoleSchema,
  /** Plain-text content. */
  content: z.string(),
  /** ISO-8601 timestamp. */
  createdAt: z.string().datetime(),
});

export type ConversationTurn = z.infer<typeof conversationTurnSchema>;

// Back-compat alias for the field naming on the wire.
export const conversationMessageSchema = conversationTurnSchema;
export type ConversationMessage = ConversationTurn;

// ---------- Summary (CONTEXT.md "Conversation Session") -----------------

export const conversationSummarySchema = z.object({
  sessionId: conversationSessionIdSchema,
  /** Aggregated counts per role. */
  learnerTurnCount: z.number().int().nonnegative(),
  teacherTurnCount: z.number().int().nonnegative(),
  /** Vocabulary the learner used during the session. */
  vocabularyUsed: z.array(z.string()),
  /** Per-criterion score 0–3, derived from the scenario's feedbackRubric. */
  rubricScores: z.array(z.object({ criterion: z.string(), score: z.number().int().min(0).max(3) })),
  /** Free-form narrative the provider emits. */
  narrative: z.string(),
});

export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

// ---------- Session -----------------------------------------------------

export const conversationSessionSchema = z.object({
  sessionId: conversationSessionIdSchema,
  userId: z.string().regex(/^usr_[a-z0-9]+$/),
  scenarioId: scenarioIdSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  summary: conversationSummarySchema.nullable(),
});

export type ConversationSession = z.infer<typeof conversationSessionSchema>;

// ---------- Adapter interface shape -------------------------------------

/**
 * Structural type for the `ConversationAdapter` port. Phase A ships an
 * in-memory stub implementing this; Phase D wires a real provider.
 *
 * The interface is Zod-described so callers can validate runtime
 * payloads before dispatch. `start`, `nextTurn`, and `summary` are
 * callable; their runtime semantics live outside @pt/contracts.
 */
export const conversationAdapterInterfaceSchema = z.object({
  /** Stable provider id — for logging / metrics only. */
  providerId: z.string(),
  /** Models the provider can serve (display-only on learner surface). */
  models: z.array(z.string()),
  start: z.function(),
  nextTurn: z.function(),
  summary: z.function(),
});

export type ConversationAdapterInterface = z.infer<typeof conversationAdapterInterfaceSchema>;
