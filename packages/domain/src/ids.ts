// ID primitives — pure regex-based validators and a normalisation
// helper. All consumers should use these rather than re-declaring
// regexes; @pt/contracts owns the canonical regexes in its Zod
// schemas, and these mirror them verbatim (the test pins the
// agreement via @pt/contracts re-import).

import {
  cvIdSchema,
  unitIdSchema,
  sentenceIdSchema,
} from '@pt/contracts';

export { cvIdSchema, unitIdSchema, sentenceIdSchema };

const SENTENCE_ID_RE = /^sen_[a-z0-9][a-z0-9_]*$/;
const UNIT_ID_RE = /^unit_[a-z0-9][a-z0-9_]*$/;
const CV_ID_RE = /^cv_[0-9a-f]{16}$/;

/**
 * Normalise a learner-supplied sentence id: trim whitespace, lowercase.
 * Returns null if the input is empty or fails the canonical regex after
 * normalisation. This is the only place in @pt/domain that mutates an id
 * shape; everywhere else accepts canonical ids only.
 */
export function normalizeSentenceId(input: string): string | null {
  if (typeof input !== 'string' || input.length === 0) return null;
  const trimmed = input.trim().toLowerCase();
  if (!SENTENCE_ID_RE.test(trimmed)) return null;
  return trimmed;
}

/** Strict validator — does not mutate input. */
export function isValidSentenceId(input: string): boolean {
  return SENTENCE_ID_RE.test(input);
}

export function isValidUnitId(input: string): boolean {
  return UNIT_ID_RE.test(input);
}

export function isValidCvId(input: string): boolean {
  return CV_ID_RE.test(input);
}

// Pinning note: the regexes above MUST agree with the Zod schemas
// re-exported at the top of this file. The Zod schemas are the
// single source of truth (CONTEXT.md "Curriculum Repository"
//
// The previous implementation reflected into `z.ZodString._def.checks`
// to detect drift. Zod 4 strips check fields from `_def` at runtime
// (`{ "type": "string", "checks": [{}] }`), so the reflection
// approach no longer works. The schema tests in `@pt/contracts`
// are the new drift-detection surface.