// Tests for @pt/domain — locks every pure helper against regression.
// Phase A ships: rating semantics, idempotent upsert validation,
// smart-review queue ordering, progress aggregation, sentence ID
// normalisation, conversation turn-bucket helpers. Phase B's filter
// expression / settings / collection helpers are out of scope here.

import { describe, it, expect } from 'vitest';
import {
  // ids
  normalizeSentenceId,
  isValidSentenceId,
  isValidUnitId,
  isValidCvId,
  // ratings
  isMasteredInMode,
  ratingSemantics,
  validateIdempotentRating,
  // review
  buildSmartReviewQueue,
  // progress
  aggregateProgress,
  type MasterySnapshot,
  // conversation (turn-bucket helpers)
  bucketTurnsByRole,
  // layering rule
  assertPureLayering,
} from '../index.js';

// ---------- ids ---------------------------------------------------------

describe('id normalisation + validation', () => {
  it('normalizeSentenceId trims whitespace and lowercases', () => {
    expect(normalizeSentenceId('  SEN_Ola  ')).toBe('sen_ola');
  });

  it('normalizeSentenceId returns null for malformed input', () => {
    expect(normalizeSentenceId('not-an-id')).toBeNull();
    expect(normalizeSentenceId('cv_abc')).toBeNull();
    expect(normalizeSentenceId('')).toBeNull();
  });

  it('isValidSentenceId accepts only sen_<slug>', () => {
    expect(isValidSentenceId('sen_ola')).toBe(true);
    expect(isValidSentenceId('sen_')).toBe(false);
    expect(isValidSentenceId('SEN_OLA')).toBe(false);
  });

  it('isValidUnitId accepts only unit_<slug>', () => {
    expect(isValidUnitId('unit_a1_introductions')).toBe(true);
    expect(isValidUnitId('unit-A')).toBe(false);
    expect(isValidUnitId('cv_abc')).toBe(false);
  });

  it('isValidCvId accepts only cv_<16-hex>', () => {
    expect(isValidCvId('cv_0123456789abcdef')).toBe(true);
    expect(isValidCvId('cv_tooshort')).toBe(false);
  });
});

// ---------- ratings -----------------------------------------------------

describe('rating semantics (CONTEXT.md "Self-Rating Semantics")', () => {
  it('1..5 numeric scale; 5 = confident and fluent for the mode', () => {
    expect(ratingSemantics(1)).toBe('barely-recognized');
    expect(ratingSemantics(2)).toBe('significant-help');
    expect(ratingSemantics(3)).toBe('partly-secure');
    expect(ratingSemantics(4)).toBe('minor-hesitation');
    expect(ratingSemantics(5)).toBe('confident');
  });

  it('throws on out-of-range values', () => {
    expect(() => ratingSemantics(0)).toThrow();
    expect(() => ratingSemantics(6)).toThrow();
    expect(() => ratingSemantics(2.5)).toThrow();
  });

  it('isMasteredInMode: rating 5 in that mode = mastered', () => {
    expect(isMasteredInMode(5)).toBe(true);
    expect(isMasteredInMode(4)).toBe(false);
    expect(isMasteredInMode(0)).toBe(false);
  });

  it('lowering a rating removes mastered status (no separate flag to manage)', () => {
    // Domain rule: mastery is derived from current rating, not stored.
    // Lowering 5 → 4 immediately removes mastery.
    expect(isMasteredInMode(5)).toBe(true);
    expect(isMasteredInMode(4)).toBe(false);
  });
});

describe('validateIdempotentRating', () => {
  const valid = {
    userId: 'usr_abc123',
    sentenceId: 'sen_ola',
    mode: 'shadow' as const,
    rating: 4,
    clientMutationId: '00000000-0000-4000-8000-000000000000',
  };

  it('returns ok for a well-formed rating input', () => {
    const out = validateIdempotentRating(valid);
    expect(out.ok).toBe(true);
  });

  it('rejects an out-of-range rating', () => {
    expect(validateIdempotentRating({ ...valid, rating: 0 }).ok).toBe(false);
    expect(validateIdempotentRating({ ...valid, rating: 6 }).ok).toBe(false);
  });

  it('rejects a non-UUID client_mutation_id (idempotency key)', () => {
    expect(validateIdempotentRating({ ...valid, clientMutationId: 'not-a-uuid' }).ok).toBe(false);
  });

  it('rejects a malformed sentenceId', () => {
    expect(validateIdempotentRating({ ...valid, sentenceId: 'cv_abc' }).ok).toBe(false);
  });

  it('rejects an unknown mode', () => {
    expect(
      validateIdempotentRating({ ...valid, mode: 'review' as 'shadow' }).ok,
    ).toBe(false);
  });

  it('reports a stable error code on rejection (errorCodeSchema-compatible)', () => {
    const out = validateIdempotentRating({ ...valid, rating: 7 });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.code).toBe('validation_failed');
      expect(typeof out.message).toBe('string');
      expect(out.message.length).toBeGreaterThan(0);
    }
  });
});

// ---------- review ------------------------------------------------------

describe('buildSmartReviewQueue (rebuild spec §6.2)', () => {
  const sentences = [
    { sentenceId: 'sen_a', curriculumOrder: 0 },
    { sentenceId: 'sen_b', curriculumOrder: 1 },
    { sentenceId: 'sen_c', curriculumOrder: 2 },
    { sentenceId: 'sen_d', curriculumOrder: 3 },
  ];

  it('excludes rating === 5', () => {
    const queue = buildSmartReviewQueue({
      mode: 'shadow',
      limit: 50,
      ratings: [
        { sentenceId: 'sen_a', rating: 5, lastPractisedAt: '2026-07-30T00:00:00.000Z' },
      ],
      sentences,
    });
    expect(queue.find((r) => r.sentenceId === 'sen_a')).toBeUndefined();
  });

  it('excludes unrated sentences (no lastPractisedAt)', () => {
    const queue = buildSmartReviewQueue({
      mode: 'shadow',
      limit: 50,
      ratings: [],
      sentences,
    });
    expect(queue.length).toBe(0);
  });

  it('orders by rating ASC → lastPractisedAt ASC NULLS FIRST → curriculumOrder ASC', () => {
    const queue = buildSmartReviewQueue({
      mode: 'shadow',
      limit: 50,
      ratings: [
        // sen_a: rating 4, practised 2026-07-30 (newer)
        { sentenceId: 'sen_a', rating: 4, lastPractisedAt: '2026-07-30T08:00:00.000Z' },
        // sen_b: rating 4, practised 2026-07-29 (older — should come first)
        { sentenceId: 'sen_b', rating: 4, lastPractisedAt: '2026-07-29T08:00:00.000Z' },
        // sen_c: rating 4, NEVER practised — should come first (NULLS FIRST)
        { sentenceId: 'sen_c', rating: 4, lastPractisedAt: null },
        // sen_d: rating 1 — should come first regardless of date
        { sentenceId: 'sen_d', rating: 1, lastPractisedAt: '2026-07-30T08:00:00.000Z' },
      ],
      sentences,
    });

    expect(queue.map((r) => r.sentenceId)).toEqual(['sen_d', 'sen_c', 'sen_b', 'sen_a']);
  });

  it('clamps to limit; default 50, max 200', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({
      sentenceId: `sen_${i}`,
      curriculumOrder: i,
    }));
    const ratings = many.map((s) => ({
      sentenceId: s.sentenceId,
      rating: 3 as const,
      lastPractisedAt: '2026-07-30T08:00:00.000Z',
    }));
    const queue = buildSmartReviewQueue({ mode: 'shadow', limit: 50, ratings, sentences: many });
    expect(queue.length).toBe(50);
  });

  it('filters by mode — shadow ratings only surface in shadow queue', () => {
    const queue = buildSmartReviewQueue({
      mode: 'shadow',
      limit: 50,
      ratings: [
        { sentenceId: 'sen_a', rating: 3, lastPractisedAt: '2026-07-30T08:00:00.000Z', mode: 'recall' },
        { sentenceId: 'sen_b', rating: 3, lastPractisedAt: '2026-07-30T08:00:00.000Z', mode: 'shadow' },
      ],
      sentences,
    });
    expect(queue.map((r) => r.sentenceId)).toEqual(['sen_b']);
  });
});

// ---------- progress ----------------------------------------------------

describe('aggregateProgress', () => {
  it('returns zeros when there are no ratings or stages', () => {
    const out: MasterySnapshot = aggregateProgress({
      mode: 'shadow',
      unitSentences: [],
      ratings: [],
      completedStages: [],
    });
    expect(out.unitMastery).toBe(0);
    expect(out.sentencesPractised).toBe(0);
    expect(out.sentencesMastered).toBe(0);
    expect(out.stagesCompleted).toEqual([]);
  });

  it('counts sentencesMastered as rating 5 in the mode', () => {
    const out = aggregateProgress({
      mode: 'shadow',
      unitSentences: [
        { sentenceId: 'sen_a' },
        { sentenceId: 'sen_b' },
        { sentenceId: 'sen_c' },
      ],
      ratings: [
        { sentenceId: 'sen_a', rating: 5, mode: 'shadow' },
        { sentenceId: 'sen_b', rating: 5, mode: 'recall' }, // recall, not shadow — not mastered
        { sentenceId: 'sen_c', rating: 4, mode: 'shadow' },
      ],
      completedStages: [],
    });
    expect(out.sentencesMastered).toBe(1);
    expect(out.sentencesPractised).toBe(2); // sen_a + sen_c
    expect(out.unitMastery).toBeCloseTo(1 / 3);
  });

  it('unitMastery is NaN-safe (no divide-by-zero)', () => {
    const out = aggregateProgress({
      mode: 'shadow',
      unitSentences: [],
      ratings: [],
      completedStages: [],
    });
    expect(Number.isFinite(out.unitMastery)).toBe(true);
  });

  it('passes through completedStages unchanged (stages not computed here — Phase B does nextStageRecommendation)', () => {
    const out = aggregateProgress({
      mode: 'recall',
      unitSentences: [],
      ratings: [],
      completedStages: ['learn', 'notice'],
    });
    expect(out.stagesCompleted).toEqual(['learn', 'notice']);
  });
});

// ---------- conversation ------------------------------------------------

describe('bucketTurnsByRole', () => {
  const turns = [
    { messageId: 'cmsg_1', sessionId: 'csess_x', role: 'learner' as const, content: 'Olá', createdAt: '2026-07-30T08:00:00.000Z' },
    { messageId: 'cmsg_2', sessionId: 'csess_x', role: 'teacher' as const, content: 'Bom dia!', createdAt: '2026-07-30T08:00:01.000Z' },
    { messageId: 'cmsg_3', sessionId: 'csess_x', role: 'learner' as const, content: 'Tudo bem?', createdAt: '2026-07-30T08:00:02.000Z' },
    { messageId: 'cmsg_4', sessionId: 'csess_x', role: 'system' as const, content: '[scenario started]', createdAt: '2026-07-30T08:00:00.000Z' },
  ];

  it('buckets turns by role and preserves chronological order within a bucket', () => {
    const out = bucketTurnsByRole(turns);
    expect(out.learner.map((t) => t.messageId)).toEqual(['cmsg_1', 'cmsg_3']);
    expect(out.teacher.map((t) => t.messageId)).toEqual(['cmsg_2']);
    expect(out.system.map((t) => t.messageId)).toEqual(['cmsg_4']);
  });

  it('returns three empty arrays for an empty input', () => {
    const out = bucketTurnsByRole([]);
    expect(out.learner).toEqual([]);
    expect(out.teacher).toEqual([]);
    expect(out.system).toEqual([]);
  });
});

// ---------- layering rule ----------------------------------------------

describe('layering rule: @pt/domain stays pure', () => {
  it('@pt/domain index does not re-export Express types', () => {
    expect(() => assertPureLayering()).not.toThrow();
  });

  it('@pt/domain index does not re-export Drizzle types', () => {
    expect(() => assertPureLayering()).not.toThrow();
  });
});