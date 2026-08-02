// Tests for the Phase B contract additions (Task 1). Pins the new
// Zod schemas for practice, settings, collections, unit-progress,
// and the filter expression parser. Also pins the error envelope
// additions for the Phase B surface (practice_queue_empty,
// collection_name_required, collection_not_found, unit_not_found,
// stage_unknown, unit_progress_invalid_status).
//
// Phase A's `practice.ts` is overwritten by this task — the new
// schemas supersede the Phase A shapes (the Phase A consumers are
// retired with Phase B Task 3, which lands the new Practice API).

import { describe, it, expect } from 'vitest';
import {
  // practice
  practiceItemSchema,
  ratingModeSchema,
  ratingWriteSchema,
  practiceQueueQuerySchema,
  practiceQueueResponseSchema,
  reviewQueueResponseSchema,
  // settings
  settingsSchema,
  partialSettingsSchema,
  // collections
  collectionSchema,
  collectionItemSchema,
  collectionDetailSchema,
  createCollectionBodySchema,
  addItemBodySchema,
  // unit-progress
  unitStageSchema,
  unitProgressWriteSchema,
  // filter
  filterExpressionSchema,
  matchModeSchema,
  // errors
  errorCodeSchema,
} from '../index.js';

describe('Phase B contracts', () => {
  it('validates a rating write', () => {
    const result = ratingWriteSchema.parse({
      clientMutationId: 'cm_1',
      sentenceId: 'sen_a1_int_greet_001',
      mode: 'shadow',
      rating: 4,
    });
    expect(result.rating).toBe(4);
  });

  it('rejects a rating outside 1..5', () => {
    expect(() =>
      ratingWriteSchema.parse({
        clientMutationId: 'cm_1',
        sentenceId: 'sen_a1_int_greet_001',
        mode: 'shadow',
        rating: 7,
      }),
    ).toThrow();
  });

  it('rejects a non-sen_ sentenceId', () => {
    expect(() =>
      ratingWriteSchema.parse({
        clientMutationId: 'cm_1',
        sentenceId: 'cv_abc',
        mode: 'shadow',
        rating: 3,
      }),
    ).toThrow();
  });

  it('rejects a non-cm_ clientMutationId', () => {
    expect(() =>
      ratingWriteSchema.parse({
        clientMutationId: 'plain-uuid-00000000-0000-4000-8000-000000000000',
        sentenceId: 'sen_a1_int_greet_001',
        mode: 'shadow',
        rating: 3,
      }),
    ).toThrow();
  });

  it('validates settings columns', () => {
    const result = settingsSchema.parse({
      audioSpeed: 0.85,
      repetitions: 2,
      pauseMs: 1500,
      textSize: 'large',
      sortOrder: 'curriculum',
      loop: false,
    });
    expect(result.audioSpeed).toBe(0.85);
  });

  it('rejects invalid pauseMs', () => {
    expect(() =>
      settingsSchema.parse({
        audioSpeed: 0.85,
        repetitions: 2,
        pauseMs: 1234,
        textSize: 'large',
        sortOrder: 'curriculum',
        loop: false,
      }),
    ).toThrow();
  });

  it('partialSettingsSchema accepts every column omitted', () => {
    const out = partialSettingsSchema.parse({});
    expect(out).toEqual({});
  });

  it('validates a create-collection body', () => {
    expect(createCollectionBodySchema.parse({ name: 'My list' }).name).toBe('My list');
  });

  it('rejects an empty collection name', () => {
    expect(() => createCollectionBodySchema.parse({ name: '' })).toThrow();
  });

  it('rejects an overlong collection name (>80 chars)', () => {
    expect(() => createCollectionBodySchema.parse({ name: 'x'.repeat(81) })).toThrow();
  });

  it('validates a unit-progress write', () => {
    expect(unitProgressWriteSchema.parse({ status: 'complete' }).status).toBe('complete');
  });

  it('rejects an unknown status', () => {
    expect(() => unitProgressWriteSchema.parse({ status: 'skipped' })).toThrow();
  });

  it('unitStageSchema covers the six stages', () => {
    expect(unitStageSchema.options.sort()).toEqual([
      'apply',
      'communicate',
      'learn',
      'notice',
      'recall',
      'shadow',
    ]);
  });

  it('rejects an overlong filter expression', () => {
    expect(() => filterExpressionSchema.parse('a'.repeat(201))).toThrow();
  });

  it('accepts an empty filter expression', () => {
    expect(filterExpressionSchema.parse('')).toBe('');
  });

  it('accepts matchMode or|all', () => {
    expect(matchModeSchema.parse('or')).toBe('or');
    expect(matchModeSchema.parse('all')).toBe('all');
    expect(() => matchModeSchema.parse('xor')).toThrow();
  });

  it('practiceQueueQuerySchema defaults match to "or"', () => {
    const parsed = practiceQueueQuerySchema.parse({
      unitId: 'unit_a1_introductions',
      mode: 'shadow',
    });
    expect(parsed.match).toBe('or');
  });

  it('practiceQueueQuerySchema rejects a unitId that is not unit_<slug>', () => {
    expect(() =>
      practiceQueueQuerySchema.parse({
        unitId: 'cv_abc',
        mode: 'shadow',
      }),
    ).toThrow();
  });

  it('practiceItemSchema exposes unitId and orderIndex', () => {
    const out = practiceItemSchema.parse({
      sentenceId: 'sen_a1_int_greet_001',
      textPt: 'Olá',
      textEn: 'Hello',
      audioId: null,
      unitId: 'unit_a1_introductions',
      orderIndex: 0,
    });
    expect(out.unitId).toBe('unit_a1_introductions');
    expect(out.orderIndex).toBe(0);
  });

  it('practiceQueueResponseSchema + reviewQueueResponseSchema accept an empty items list', () => {
    expect(() => practiceQueueResponseSchema.parse({ items: [] })).not.toThrow();
    expect(() => reviewQueueResponseSchema.parse({ items: [] })).not.toThrow();
  });

  it('reviewQueueResponseSchema requires a rating on every item', () => {
    expect(() =>
      reviewQueueResponseSchema.parse({
        items: [
          {
            sentenceId: 'sen_a1_int_greet_001',
            textPt: 'Olá',
            textEn: 'Hello',
            audioId: null,
            unitId: 'unit_a1_introductions',
            orderIndex: 0,
          },
        ],
      }),
    ).toThrow();
  });

  it('collectionSchema exposes id, name, sentenceCount, createdAt', () => {
    const out = collectionSchema.parse({
      id: 'col_my_list',
      name: 'My list',
      sentenceCount: 12,
      createdAt: '2026-07-30T08:00:00.000Z',
    });
    expect(out.id).toBe('col_my_list');
  });

  it('collectionDetailSchema extends collectionSchema with items', () => {
    const out = collectionDetailSchema.parse({
      id: 'col_my_list',
      name: 'My list',
      sentenceCount: 1,
      createdAt: '2026-07-30T08:00:00.000Z',
      items: [
        {
          orderIndex: 0,
          sentenceId: 'sen_a1_int_greet_001',
          textPt: 'Olá',
          textEn: 'Hello',
        },
      ],
    });
    expect(out.items).toHaveLength(1);
  });

  it('addItemBodySchema accepts an optional orderIndex', () => {
    const out = addItemBodySchema.parse({ sentenceId: 'sen_a1_int_greet_001' });
    expect(out.orderIndex).toBeUndefined();
  });

  it('ratingModeSchema is {shadow, recall}', () => {
    expect(ratingModeSchema.options.sort()).toEqual(['recall', 'shadow']);
  });

  it('errorCodeSchema covers every Phase B code', () => {
    expect(errorCodeSchema.options).toEqual(
      expect.arrayContaining([
        'practice_queue_empty',
        'collection_name_required',
        'collection_not_found',
        'unit_not_found',
        'stage_unknown',
        'unit_progress_invalid_status',
      ]),
    );
  });
});
