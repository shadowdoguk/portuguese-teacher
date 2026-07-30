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

/**
 * Re-export of the canonical @pt/contracts schemas for callers that
 * want runtime validation rather than the boolean predicates above.
 * The layering rule allows importing schemas (they describe shape,
 * not transport).
 */
export { cvIdSchema, unitIdSchema, sentenceIdSchema as _sentenceIdSchemaForReexport };

// Pinned: the regexes below MUST agree with the Zod schemas above.
// This assert block runs at import time in dev and test; in
// production it is stripped by tsc's `removeComments` + dead-code
// elimination. If the schemas drift, the build breaks here.
import { z } from 'zod';

const _SENTENCE_FROM_ZOD = (sentenceIdSchema as z.ZodString)._def.checks.some(
  (c: { kind: string; value?: unknown }) =>
    c.kind === 'regex' && c.value instanceof RegExp && c.value.source === SENTENCE_ID_RE.source,
);
if (!_SENTENCE_FROM_ZOD) {
  throw new Error(
    '@pt/domain ids.ts: sentenceIdSchema regex drifted from SENTENCE_ID_RE — update one of them so they match.',
  );
}

const _UNIT_FROM_ZOD = (unitIdSchema as z.ZodString)._def.checks.some(
  (c: { kind: string; value?: unknown }) =>
    c.kind === 'regex' && c.value instanceof RegExp && c.value.source === UNIT_ID_RE.source,
);
if (!_UNIT_FROM_ZOD) {
  throw new Error(
    '@pt/domain ids.ts: unitIdSchema regex drifted from UNIT_ID_RE — update one of them so they match.',
  );
}

const _CV_FROM_ZOD = (cvIdSchema as z.ZodString)._def.checks.some(
  (c: { kind: string; value?: unknown }) =>
    c.kind === 'regex' && c.value instanceof RegExp && c.value.source === CV_ID_RE.source,
);
if (!_CV_FROM_ZOD) {
  throw new Error(
    '@pt/domain ids.ts: cvIdSchema regex drifted from CV_ID_RE — update one of them so they match.',
  );
}