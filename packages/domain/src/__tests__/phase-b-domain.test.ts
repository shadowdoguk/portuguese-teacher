// Tests for the Phase B @pt/domain helpers (Task 2). Pins the four
// pure helpers `buildPracticeQueue`, `buildReviewQueue`,
// `applyFilter`, `nextStageRecommendation` and the `STAGE_ORDER`
// export. The Phase A helpers (`validateIdempotentRating`,
// `buildSmartReviewQueue`, `aggregateProgress`, `bucketTurnsByRole`)
// live in `domain.test.ts` and are not retested here.

import { describe, it, expect } from 'vitest';
import {
  buildPracticeQueue,
  buildReviewQueue,
  applyFilter,
  nextStageRecommendation,
  STAGE_ORDER,
} from '../index.js';

const sampleSentences = [
  {
    sentenceId: 'sen_1',
    textPt: 'Olá.',
    textEn: 'Hello.',
    unitId: 'unit_a1',
    orderIndex: 0,
    audioId: null,
  },
  {
    sentenceId: 'sen_2',
    textPt: 'Como vai?',
    textEn: 'How are you?',
    unitId: 'unit_a1',
    orderIndex: 1,
    audioId: null,
  },
  {
    sentenceId: 'sen_3',
    textPt: 'Olá, tudo bem?',
    textEn: 'Hello, how are you?',
    unitId: 'unit_a1',
    orderIndex: 2,
    audioId: null,
  },
];

describe('buildPracticeQueue', () => {
  it("returns the unit's sentences in curriculum order", () => {
    const out = buildPracticeQueue(sampleSentences, {
      mode: 'shadow',
      sortOrder: 'curriculum',
    });
    expect(out.map((s) => s.sentenceId)).toEqual(['sen_1', 'sen_2', 'sen_3']);
  });

  it('reverses in hardToEasy', () => {
    const out = buildPracticeQueue(sampleSentences, {
      mode: 'shadow',
      sortOrder: 'hardToEasy',
    });
    expect(out.map((s) => s.sentenceId)).toEqual(['sen_3', 'sen_2', 'sen_1']);
  });

  it('applies the filter expression before sorting (terms retained in orderIndex)', () => {
    const out = buildPracticeQueue(sampleSentences, {
      mode: 'shadow',
      sortOrder: 'curriculum',
      filter: ['tudo'],
      matchAll: false,
    });
    expect(out.map((s) => s.sentenceId)).toEqual(['sen_3']);
  });

  it('returns the input as-is when no filter is supplied', () => {
    const out = buildPracticeQueue(sampleSentences, {
      mode: 'recall',
      sortOrder: 'curriculum',
    });
    expect(out).toHaveLength(3);
  });
});

describe('buildReviewQueue', () => {
  it('excludes ratings of 5 and unrated rows', () => {
    const ratings = new Map([
      [
        'sen_1',
        {
          mode: 'shadow' as const,
          rating: 2,
          lastPractisedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      [
        'sen_2',
        {
          mode: 'shadow' as const,
          rating: 5,
          lastPractisedAt: new Date('2026-01-02T00:00:00Z'),
        },
      ],
      [
        'sen_3',
        {
          mode: 'shadow' as const,
          rating: null,
          lastPractisedAt: null,
        },
      ],
    ]);
    const out = buildReviewQueue(ratings, sampleSentences, 'shadow', 50);
    expect(out.map((s) => s.sentenceId)).toEqual(['sen_1']);
  });

  it('orders by rating ASC, then oldest last_practised_at', () => {
    const ratings = new Map([
      [
        'sen_1',
        {
          mode: 'shadow' as const,
          rating: 3,
          lastPractisedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      [
        'sen_2',
        {
          mode: 'shadow' as const,
          rating: 2,
          lastPractisedAt: new Date('2026-01-04T00:00:00Z'),
        },
      ],
      [
        'sen_3',
        {
          mode: 'shadow' as const,
          rating: 2,
          lastPractisedAt: new Date('2026-01-02T00:00:00Z'),
        },
      ],
    ]);
    const out = buildReviewQueue(ratings, sampleSentences, 'shadow', 50);
    expect(out.map((s) => s.sentenceId)).toEqual(['sen_3', 'sen_2', 'sen_1']);
  });

  it('clamps to limit', () => {
    const ratings = new Map<string, { mode: 'shadow'; rating: number; lastPractisedAt: Date | null }>();
    sampleSentences.forEach((s, i) => {
      ratings.set(s.sentenceId, {
        mode: 'shadow',
        rating: 1,
        lastPractisedAt: new Date(2026, 0, i + 1),
      });
    });
    const out = buildReviewQueue(ratings, sampleSentences, 'shadow', 2);
    expect(out).toHaveLength(2);
  });

  it('excludes ratings of the wrong mode', () => {
    const ratings = new Map([
      [
        'sen_1',
        {
          mode: 'recall' as const,
          rating: 1,
          lastPractisedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
    ]);
    const out = buildReviewQueue(ratings, sampleSentences, 'shadow', 50);
    expect(out).toHaveLength(0);
  });
});

describe('applyFilter', () => {
  it('OR default matches any term across text/translation', () => {
    const out = applyFilter(sampleSentences, ['dar', 'como'], false);
    expect(out.map((s) => s.sentenceId)).toEqual(['sen_2']);
  });

  it('AND matches terms present in the same sentence', () => {
    const out = applyFilter(sampleSentences, ['Olá', 'tudo'], true);
    expect(out.map((s) => s.sentenceId)).toEqual(['sen_3']);
  });

  it('lowercases both haystack and needle', () => {
    const out = applyFilter(sampleSentences, ['COMO'], false);
    expect(out.map((s) => s.sentenceId)).toEqual(['sen_2']);
  });

  it('returns the input as-is when no terms are supplied', () => {
    const out = applyFilter(sampleSentences, [], false);
    expect(out).toHaveLength(sampleSentences.length);
  });
});

describe('nextStageRecommendation', () => {
  it('returns the lowest incomplete stage', () => {
    expect(nextStageRecommendation({ completedStages: ['learn', 'notice'] })).toBe(
      'shadow',
    );
  });

  it('returns null when every stage is complete', () => {
    expect(nextStageRecommendation({ completedStages: [...STAGE_ORDER] })).toBeNull();
  });

  it('returns the first stage when none are complete', () => {
    expect(nextStageRecommendation({ completedStages: [] })).toBe('learn');
  });
});
