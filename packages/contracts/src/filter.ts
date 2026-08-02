// Filter schemas — shared by @pt/api and @pt/web.
//
// Per CONTEXT.md "Filter", the filter scope is the sentences in the
// active CV. Comma-separated terms default to OR; the explicit
// "match=all" switch turns it into AND. The expression may be empty
// (which is a no-op — returns every sentence in the unit).

import { z } from 'zod';

/** Filter expression: comma-separated terms, ≤ 200 chars total. Empty
 * strings are valid (no-op). */
export const filterExpressionSchema = z.string().min(0).max(200);

export type FilterExpression = z.infer<typeof filterExpressionSchema>;

/** Match mode — "or" (default) or "all" (AND). */
export const matchModeSchema = z.enum(['or', 'all']);

export type MatchMode = z.infer<typeof matchModeSchema>;
