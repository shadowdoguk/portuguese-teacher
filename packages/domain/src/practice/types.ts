// Practice types — shared by @pt/domain (pure) and @pt/contracts.
//
// The `PracticeItem` shape mirrors
// `@pt/contracts::practiceItemSchema`. It lives here as a plain
// TypeScript type so the domain helpers can stay free of Zod
// internals (the @pt/domain layering rule).

import type { SortOrder } from '../settings/types.js';

export type PracticeItem = {
  sentenceId: string;
  textPt: string;
  textEn: string;
  audioId: string | null;
  unitId: string;
  orderIndex: number;
};

export type PracticeMode = 'shadow' | 'recall';

export type PracticeQueueOptions = {
  mode: PracticeMode;
  sortOrder: SortOrder;
  filter?: ReadonlyArray<string>;
  matchAll?: boolean;
};
