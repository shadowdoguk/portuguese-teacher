// Practice queue builder — pure ordering over (sentences, options).
//
// Per CONTEXT.md "Smart Review" / "Listen & Repeat" / "Active Recall":
//   - Sort order: 'curriculum' (default, orderIndex ASC),
//     'easyToHard' (orderIndex ASC, same as curriculum today — Phase
//     C may add a difficulty column), or 'hardToEasy' (orderIndex
//     DESC).
//   - Filter expression: optional comma-separated terms; applied
//     before sorting so the order matches the user's intent rather
//     than the input order.
//   - Mode is captured for symmetry with the API layer; the queue
//     itself does not filter by mode today (both Shadow and Recall
//     surface the same sentences).

import { applyFilter } from '../filter/apply.js';
import type { PracticeItem, PracticeQueueOptions } from './types.js';

export function buildPracticeQueue(
  sentences: ReadonlyArray<PracticeItem>,
  opts: PracticeQueueOptions,
): ReadonlyArray<PracticeItem> {
  const filtered = opts.filter
    ? applyFilter(sentences, opts.filter, opts.matchAll ?? false)
    : sentences;
  const sorted = [...filtered];
  if (opts.sortOrder === 'curriculum' || opts.sortOrder === 'easyToHard') {
    sorted.sort((a, b) => a.orderIndex - b.orderIndex);
  } else if (opts.sortOrder === 'hardToEasy') {
    sorted.sort((a, b) => b.orderIndex - a.orderIndex);
  }
  return sorted;
}
