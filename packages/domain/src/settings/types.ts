// Settings types — shared by @pt/domain (pure) and @pt/contracts.
//
// The sort-order enum mirrors `@pt/contracts::sortOrderSchema`. It
// lives here as a plain TypeScript type so the domain helpers can
// stay free of Zod internals (the @pt/domain layering rule).

export type SortOrder = 'curriculum' | 'easyToHard' | 'hardToEasy';
