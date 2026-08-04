// @pt/api error code enum — local extension of @pt/contracts's
// errorCodeSchema. Per amendment Task A4 step 1, this module
// re-exports the canonical Zod schema with two Phase A additions:
//
//   * csrf_origin_denied — Origin header check failed (A4 §1)
//   * refresh_reused     — refresh_reuse_compromise guard (A5)
//
// We could re-import the canonical schema from @pt/contracts and
// call `.extend(...)` on it, but Zod enum extension requires literal
// strings as new entries; the canonical schema is defined with
// `z.enum([...])`. The cleanest pattern is to define this as a
// superset enum here and re-export both: `@pt/api` callers always
// import from this module so the codes stay in lockstep with the
// API surface. `@pt/contracts`'s schema remains the wire-format
// canonical contract; the API may add internal codes (e.g. when
// Phase C introduces its own), and a CI test verifies the
// superset-hood.

import { z } from 'zod';
import { errorCodeSchema as baseErrorCodeSchema } from '@pt/contracts';

/**
 * The full union of error codes the @pt/api surface emits. The wire
 * payload is the same shape `@pt/contracts.errorEnvelopeSchema`
 * describes — `{ error: { code, message, correlationId } }`.
 *
 * Phase A additions:
 *   - csrf_origin_denied (A4) — Origin header check failed on a
 *     state-changing /api/auth/* route.
 *   - refresh_reused (A5) — refresh_reuse_compromise guard tripped:
 *     the presented refresh-token-hash has already been rotated
 *     out, which means a stale client retried with a token an
 *     attacker already swapped. The session is revoked wholesale
 *     and the user must re-authenticate.
 */
export const errorCodeSchema = z.enum([
  ...baseErrorCodeSchema.options,
  'csrf_origin_denied',
  'refresh_reused',
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export { baseErrorCodeSchema };
export { errorEnvelopeSchema, parseErrorEnvelope } from '@pt/contracts';