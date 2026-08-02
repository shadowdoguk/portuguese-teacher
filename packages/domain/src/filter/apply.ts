// Filter expression helper — pure, no I/O.
//
// Per CONTEXT.md "Filter", the filter scope is the sentences in the
// active CV. Comma-separated terms default to OR; the explicit
// "match=all" switch turns it into AND. The haystack is the sentence
// textPt + textEn (lowercased). Vocab / grammar refs are not in the
// PracticeItem shape (Phase A projection); the filter helper is
// agnostic to that future shape (it would just spread more fields
// into the haystack).
//
// Empty-term input is a no-op — returns the input array verbatim.

import type { PracticeItem } from '../practice/types.js';

export function applyFilter(
  sentences: ReadonlyArray<PracticeItem>,
  terms: ReadonlyArray<string>,
  matchAll: boolean,
): ReadonlyArray<PracticeItem> {
  const normalised = terms.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (normalised.length === 0) return sentences;
  return sentences.filter((s) => {
    const haystack = [s.textPt, s.textEn].join(' ').toLowerCase();
    if (matchAll) return normalised.every((t) => haystack.includes(t));
    return normalised.some((t) => haystack.includes(t));
  });
}
