// Error envelope schemas — shared by @pt/api and @pt/web.
//
// Shape is the contract codified in CONTEXT.md "Error Envelope":
//   { error: { code, message, correlationId } }
// 4xx codes are user-actionable; 5xx codes reference the correlation
// ID for ops. Stack traces never leave the server.
//
// errorCodeSchema is the union of every code Phase A emits. The
// amendment plan's A4 step is the canonical source for the
// auth-cluster additions (csrf_origin_denied, refresh_reused) and
// A3's idempotent-publish code (not_publishable).

import { z } from 'zod';

export const errorCodeSchema = z.enum([
  // Phase A baseline codes
  'validation_failed',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'internal',
  // Amendment Task A4 — auth cluster (CSRF + refresh compromise)
  'csrf_origin_denied',
  'refresh_reused',
  // Amendment Task A3 — atomic publish
  'not_publishable',
  // Phase B — practice surface (Task 1)
  'practice_queue_empty',
  'collection_name_required',
  'collection_not_found',
  'unit_not_found',
  'stage_unknown',
  'unit_progress_invalid_status',
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string().min(1),
    correlationId: z.string().uuid(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export function parseErrorEnvelope(input: unknown): ErrorEnvelope {
  return errorEnvelopeSchema.parse(input);
}
