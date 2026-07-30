// Tests for @pt/contracts — pins every public schema's positive + negative
// shape. Failure here means a contract regression that would break @pt/api,
// @pt/web, or @pt/domain in lockstep.

import { describe, it, expect } from 'vitest';
import {
  // errors
  errorCodeSchema,
  errorEnvelopeSchema,
  parseErrorEnvelope,
  // curriculum
  cvIdSchema,
  unitIdSchema,
  sentenceIdSchema,
  levelSchema,
  contentStatusSchema,
  sentenceSchema,
  cvSentenceVersionSchema,
  unitSummarySchema,
  curriculumResponseSchema,
  // practice
  practiceModeSchema,
  practiceRatingValueSchema,
  practiceItemSchema,
  practiceRatingInputSchema,
  practiceQueueQuerySchema,
  smartReviewQuerySchema,
  // audio
  audioIdSchema,
  audioVoiceSchema,
  audioAssetSchema,
  synthesisRequestSchema,
  // conversation
  scenarioIdSchema,
  conversationScenarioSchema,
  conversationTurnSchema,
  conversationSummarySchema,
  conversationSessionSchema,
  // auth
  argon2ParamsSchema,
  argon2Params,
  authSessionIdSchema,
  userIdSchema,
  authSessionSchema,
  authCookiePairSchema,
  loginRequestSchema,
  loginResponseSchema,
  refreshResponseSchema,
  logoutResponseSchema,
  sessionProbeResponseSchema,
} from '../index.js';

// ---------- Helpers -----------------------------------------------------

function uuid(): string {
  return '00000000-0000-4000-8000-000000000000';
}

function isoNow(): string {
  return '2026-07-30T08:00:00.000Z';
}

// ---------- errors ------------------------------------------------------

describe('errorEnvelopeSchema', () => {
  const valid = {
    error: { code: 'validation_failed', message: 'bad input', correlationId: uuid() },
  };

  it('parses a valid envelope', () => {
    expect(() => errorEnvelopeSchema.parse(valid)).not.toThrow();
  });

  it('rejects a missing `error` field', () => {
    expect(() => errorEnvelopeSchema.parse({})).toThrow();
  });

  it('rejects an unknown code', () => {
    expect(() =>
      errorEnvelopeSchema.parse({
        error: { code: 'totally_made_up', message: 'x', correlationId: uuid() },
      }),
    ).toThrow();
  });

  it('parseErrorEnvelope returns the typed shape', () => {
    const out = parseErrorEnvelope(valid);
    expect(out.error.code).toBe('validation_failed');
  });

  it('errorCodeSchema covers every Phase A code from amendment Tasks A3+A4', () => {
    expect(errorCodeSchema.options).toEqual(
      expect.arrayContaining([
        'validation_failed',
        'unauthorized',
        'forbidden',
        'not_found',
        'conflict',
        'rate_limited',
        'internal',
        'csrf_origin_denied',
        'refresh_reused',
        'not_publishable',
      ]),
    );
  });
});

// ---------- curriculum --------------------------------------------------

describe('curriculum ID schemas', () => {
  it('cvIdSchema enforces cv_<16-hex>', () => {
    expect(cvIdSchema.safeParse('cv_0123456789abcdef').success).toBe(true);
    expect(cvIdSchema.safeParse('cv_tooshort').success).toBe(false);
    expect(cvIdSchema.safeParse('unit_abc').success).toBe(false);
  });

  it('unitIdSchema enforces unit_<slug>', () => {
    expect(unitIdSchema.safeParse('unit_a1_introductions').success).toBe(true);
    expect(unitIdSchema.safeParse('unit-A').success).toBe(false);
  });

  it('sentenceIdSchema enforces sen_<slug>', () => {
    expect(sentenceIdSchema.safeParse('sen_ola_mundo').success).toBe(true);
    expect(sentenceIdSchema.safeParse('cv_abc').success).toBe(false);
  });

  it('scenarioIdSchema is identical to the inline one in curriculum.ts', () => {
    // Both declarations must agree — if either drifts, the cycle
    // avoidance in curriculum.ts becomes a latent bug.
    expect(scenarioIdSchema._def).toBeDefined();
    expect(scenarioIdSchema.safeParse('scn_cafe').success).toBe(true);
  });
});

describe('curriculum status enums', () => {
  it('levelSchema is {a1, a2}', () => {
    expect(levelSchema.options.sort()).toEqual(['a1', 'a2']);
  });

  it('contentStatusSchema covers the lifecycle', () => {
    expect(contentStatusSchema.options.sort()).toEqual([
      'audio_reviewed',
      'draft',
      'expert_reviewed',
      'published',
    ]);
  });
});

describe('cvSentenceVersionSchema', () => {
  const valid = {
    cvId: 'cv_0123456789abcdef',
    sentenceId: 'sen_ola',
    textPt: 'Olá',
    textEn: 'Hello',
    audioId: null,
    textReviewedAt: null,
    audioReviewedAt: null,
  };

  it('parses when audio / reviewed-at are null (CONTEXT.md "Pre-Phase C Audio")', () => {
    expect(() => cvSentenceVersionSchema.parse(valid)).not.toThrow();
  });

  it('rejects empty text_pt', () => {
    expect(() => cvSentenceVersionSchema.parse({ ...valid, textPt: '' })).toThrow();
  });
});

describe('curriculumResponseSchema', () => {
  it('parses an empty levels array', () => {
    expect(() => curriculumResponseSchema.parse({ levels: [] })).not.toThrow();
  });

  it('accepts a1 level with one published unit', () => {
    const ok = {
      levels: [
        {
          level: 'a1',
          activeCvId: 'cv_0123456789abcdef',
          units: [
            {
              unitId: 'unit_a1_introductions',
              level: 'a1',
              title: 'Introductions',
              summary: 'Greet and introduce yourself.',
              sentenceCount: 12,
              islandCount: 1,
            },
          ],
        },
      ],
    };
    expect(() => curriculumResponseSchema.parse(ok)).not.toThrow();
  });

  it('rejects a unit with negative sentenceCount', () => {
    expect(() =>
      unitSummarySchema.parse({
        unitId: 'unit_a1_introductions',
        level: 'a1',
        title: 'x',
        summary: '',
        sentenceCount: -1,
        islandCount: 0,
      }),
    ).toThrow();
  });
});

// ---------- practice ----------------------------------------------------

describe('practiceModeSchema + rating', () => {
  it('mode is {shadow, recall}', () => {
    expect(practiceModeSchema.options.sort()).toEqual(['recall', 'shadow']);
  });

  it('rating enforces 1..5 integer', () => {
    expect(practiceRatingValueSchema.safeParse(0).success).toBe(false);
    expect(practiceRatingValueSchema.safeParse(1).success).toBe(true);
    expect(practiceRatingValueSchema.safeParse(5).success).toBe(true);
    expect(practiceRatingValueSchema.safeParse(6).success).toBe(false);
    expect(practiceRatingValueSchema.safeParse(2.5).success).toBe(false);
  });
});

describe('practiceRatingInputSchema (idempotency key)', () => {
  it('accepts a valid rating input', () => {
    expect(() =>
      practiceRatingInputSchema.parse({
        clientMutationId: uuid(),
        sentenceId: 'sen_ola',
        mode: 'shadow',
        rating: 4,
      }),
    ).not.toThrow();
  });

  it('rejects a non-UUID client_mutation_id', () => {
    expect(() =>
      practiceRatingInputSchema.parse({
        clientMutationId: 'not-a-uuid',
        sentenceId: 'sen_ola',
        mode: 'shadow',
        rating: 4,
      }),
    ).toThrow();
  });
});

describe('practiceQueueQuerySchema / smartReviewQuerySchema', () => {
  it('queue defaults match to "any"', () => {
    const parsed = practiceQueueQuerySchema.parse({ mode: 'shadow' });
    expect(parsed.match).toBe('any');
  });

  it('queue rejects a malformed filter expression', () => {
    expect(() =>
      practiceQueueQuerySchema.parse({ mode: 'shadow', filter: '<script>alert(1)</script>' }),
    ).toThrow();
  });

  it('review limit clamps at 200', () => {
    expect(() => smartReviewQuerySchema.parse({ mode: 'recall', limit: 500 })).toThrow();
  });
});

describe('practiceItemSchema', () => {
  it('parses a Phase-C-back-filled item with audioId set', () => {
    expect(() =>
      practiceItemSchema.parse({
        sentenceId: 'sen_ola',
        textPt: 'Olá',
        textEn: 'Hello',
        audioId: 'aud_0123456789abcdef',
        curriculumOrder: 0,
      }),
    ).not.toThrow();
  });

  it('parses a Phase-A item with audioId null (CONTEXT.md "Pre-Phase C Audio")', () => {
    expect(() =>
      practiceItemSchema.parse({
        sentenceId: 'sen_ola',
        textPt: 'Olá',
        textEn: 'Hello',
        audioId: null,
        curriculumOrder: 0,
      }),
    ).not.toThrow();
  });
});

// ---------- audio -------------------------------------------------------

describe('audio ID + voice schemas', () => {
  it('audioIdSchema enforces aud_<16-hex>', () => {
    expect(audioIdSchema.safeParse('aud_0123456789abcdef').success).toBe(true);
    expect(audioIdSchema.safeParse('cv_abc').success).toBe(false);
  });

  it('audioVoiceSchema covers Phase A stub + Phase C candidates', () => {
    expect(audioVoiceSchema.options).toEqual(
      expect.arrayContaining([
        'stub:pt-PT:default',
        'azure:pt-PT:default',
        'polly:Ines',
        'minimax:pt-PT:default',
      ]),
    );
  });
});

describe('audioAssetSchema', () => {
  it('rejects speed outside 0.5..2', () => {
    expect(() =>
      audioAssetSchema.parse({
        audioId: 'aud_0123456789abcdef',
        contentHash: 'a'.repeat(64),
        voice: 'stub:pt-PT:default',
        text: 'Olá',
        speed: 3,
        bytes: 'opaque',
        createdAt: isoNow(),
      }),
    ).toThrow();
  });
});

describe('synthesisRequestSchema', () => {
  it('defaults voice and speed when omitted', () => {
    const out = synthesisRequestSchema.parse({ text: 'Olá' });
    expect(out.voice).toBe('stub:pt-PT:default');
    expect(out.speed).toBe(1);
  });
});

// ---------- conversation ------------------------------------------------

describe('conversation scenarios', () => {
  const validScenario = {
    scenarioId: 'scn_cafe',
    unitId: 'unit_a1_introductions',
    title: 'Order a coffee',
    setting: 'Café in Lisbon',
    roles: ['barista', 'customer'],
    learnerObjective: 'Order a coffee and a pastel de nata.',
    expectedVocabularyRefs: ['café', 'pastel de nata'],
    expectedGrammarRefs: ['g-querer-present'],
    openingMessage: 'Bom dia! O que deseja?',
    completionConditions: ['order placed', 'price acknowledged'],
    correctionPolicy: 'correct only on direct ask',
    feedbackRubric: ['fluency', 'accuracy', 'politeness'],
    status: 'published',
  };

  it('parses a published scenario', () => {
    expect(() => conversationScenarioSchema.parse(validScenario)).not.toThrow();
  });

  it('rejects a scenario with no completion conditions', () => {
    expect(() =>
      conversationScenarioSchema.parse({ ...validScenario, completionConditions: [] }),
    ).toThrow();
  });

  it('rejects a scenario with no roles', () => {
    expect(() =>
      conversationScenarioSchema.parse({ ...validScenario, roles: [] }),
    ).toThrow();
  });
});

describe('conversation turns', () => {
  it('rejects an unknown role', () => {
    expect(() =>
      conversationTurnSchema.parse({
        messageId: 'cmsg_00000000-0000-4000-8000-000000000000',
        sessionId: 'csess_00000000-0000-4000-8000-000000000000',
        role: 'observer',
        content: 'hi',
        createdAt: isoNow(),
      }),
    ).toThrow();
  });
});

describe('conversationSessionSchema', () => {
  it('accepts a session with null completedAt and null summary', () => {
    expect(() =>
      conversationSessionSchema.parse({
        sessionId: 'csess_00000000-0000-4000-8000-000000000000',
        userId: 'usr_abc',
        scenarioId: 'scn_cafe',
        startedAt: isoNow(),
        completedAt: null,
        summary: null,
      }),
    ).not.toThrow();
  });
});

// ---------- auth --------------------------------------------------------

describe('argon2ParamsSchema (ADR-0002 lock)', () => {
  it('accepts only the locked triple (memoryCost 19456, timeCost 2, parallelism 1)', () => {
    expect(() =>
      argon2ParamsSchema.parse({ memoryCost: 19456, timeCost: 2, parallelism: 1 }),
    ).not.toThrow();
  });

  it('rejects a non-locked memoryCost', () => {
    expect(() =>
      argon2ParamsSchema.parse({ memoryCost: 65536, timeCost: 2, parallelism: 1 }),
    ).toThrow();
  });

  it('argon2Params frozen object matches the schema', () => {
    expect(argon2Params).toEqual({ memoryCost: 19456, timeCost: 2, parallelism: 1 });
    expect(() => {
      // @ts-expect-error — frozen in dev; the cast is just to satisfy tsc.
      argon2Params.memoryCost = 999;
    }).toThrow();
  });
});

describe('auth session ID + user ID', () => {
  it('authSessionIdSchema enforces sess_<uuid>', () => {
    expect(authSessionIdSchema.safeParse('sess_00000000-0000-4000-8000-000000000000').success).toBe(true);
    expect(authSessionIdSchema.safeParse('usr_abc').success).toBe(false);
  });

  it('userIdSchema enforces usr_<hex>', () => {
    expect(userIdSchema.safeParse('usr_abc123').success).toBe(true);
    expect(userIdSchema.safeParse('usr_XYZ').success).toBe(false);
  });
});

describe('authSessionSchema', () => {
  const validSession = {
    sessionId: 'sess_00000000-0000-4000-8000-000000000000',
    userId: 'usr_abc123',
    accessTokenHash: 'a'.repeat(64),
    refreshTokenHash: 'b'.repeat(64),
    accessExpiresAt: '2026-07-30T08:15:00.000Z',
    refreshExpiresAt: '2026-08-29T08:00:00.000Z',
    revokedAt: null,
    rotatedAt: null,
    createdAt: '2026-07-30T08:00:00.000Z',
  };

  it('parses a fresh session', () => {
    expect(() => authSessionSchema.parse(validSession)).not.toThrow();
  });

  it('rejects a non-64-hex accessTokenHash', () => {
    expect(() =>
      authSessionSchema.parse({ ...validSession, accessTokenHash: 'short' }),
    ).toThrow();
  });
});

describe('authCookiePairSchema', () => {
  it('locks access TTL at 900s and refresh TTL at 2_592_000s', () => {
    expect(() =>
      authCookiePairSchema.parse({
        access: {
          httpOnly: true,
          sameSite: 'Lax',
          secure: false,
          path: '/',
          name: 'ptp_access',
          maxAgeSeconds: 900,
        },
        refresh: {
          httpOnly: true,
          sameSite: 'Lax',
          secure: false,
          path: '/',
          name: 'ptp_refresh',
          maxAgeSeconds: 2592000,
        },
      }),
    ).not.toThrow();
  });

  it('rejects a wrong TTL on the access cookie', () => {
    expect(() =>
      authCookiePairSchema.parse({
        access: {
          httpOnly: true,
          sameSite: 'Lax',
          secure: false,
          path: '/',
          name: 'ptp_access',
          maxAgeSeconds: 60,
        },
        refresh: {
          httpOnly: true,
          sameSite: 'Lax',
          secure: false,
          path: '/',
          name: 'ptp_refresh',
          maxAgeSeconds: 2592000,
        },
      }),
    ).toThrow();
  });
});

describe('loginRequestSchema', () => {
  it('defaults clientPlatform to "web"', () => {
    const out = loginRequestSchema.parse({ email: 'a@b.co', password: 'long-enough' });
    expect(out.clientPlatform).toBe('web');
  });

  it('rejects a too-short password', () => {
    expect(() =>
      loginRequestSchema.parse({ email: 'a@b.co', password: 'short' }),
    ).toThrow();
  });
});

describe('loginResponseSchema (discriminated union by clientPlatform)', () => {
  it('accepts a web variant', () => {
    expect(() =>
      loginResponseSchema.parse({
        clientPlatform: 'web',
        user: { userId: 'usr_abc', email: 'a@b.co' },
        accessExpiresAt: isoNow(),
      }),
    ).not.toThrow();
  });

  it('accepts an Android variant with bearer tokens', () => {
    expect(() =>
      loginResponseSchema.parse({
        clientPlatform: 'android',
        accessToken: 'a'.repeat(64),
        refreshToken: 'b'.repeat(64),
        accessExpiresAt: isoNow(),
        refreshExpiresAt: isoNow(),
      }),
    ).not.toThrow();
  });

  it('rejects mixing variants (web fields + android clientPlatform)', () => {
    expect(() =>
      loginResponseSchema.parse({
        clientPlatform: 'android',
        user: { userId: 'usr_abc', email: 'a@b.co' },
        accessExpiresAt: isoNow(),
      }),
    ).toThrow();
  });
});

describe('refreshResponseSchema', () => {
  it('web variant carries only accessExpiresAt', () => {
    const out = refreshResponseSchema.parse({
      clientPlatform: 'web',
      accessExpiresAt: isoNow(),
    });
    expect(out.clientPlatform).toBe('web');
  });
});

describe('logoutResponseSchema (ADR-0002 §3: current session only)', () => {
  it('parses a successful logout', () => {
    expect(() =>
      logoutResponseSchema.parse({
        revoked: true,
        sessionId: 'sess_00000000-0000-4000-8000-000000000000',
      }),
    ).not.toThrow();
  });

  it('rejects a logout without `revoked: true`', () => {
    expect(() =>
      logoutResponseSchema.parse({
        revoked: false,
        sessionId: 'sess_00000000-0000-4000-8000-000000000000',
      }),
    ).toThrow();
  });
});

describe('sessionProbeResponseSchema', () => {
  it('parses a valid probe', () => {
    expect(() =>
      sessionProbeResponseSchema.parse({
        userId: 'usr_abc',
        email: 'a@b.co',
        accessExpiresAt: isoNow(),
      }),
    ).not.toThrow();
  });
});

// ---------- sentenceSchema + unitSummarySchema sanity ------------------

describe('sentenceSchema', () => {
  const valid = {
    sentenceId: 'sen_ola',
    textPt: 'Olá',
    textEn: 'Hello',
    vocabRefs: [],
    grammarRefs: [],
    pronunciationRefs: [],
    islandRefs: [],
    tags: [],
    curriculumOrder: 0,
    status: 'published' as const,
  };

  it('parses a published sentence with empty refs', () => {
    expect(() => sentenceSchema.parse(valid)).not.toThrow();
  });

  it('defaults refs to [] when omitted', () => {
    const out = sentenceSchema.parse({
      sentenceId: 'sen_ola',
      textPt: 'Olá',
      textEn: 'Hello',
      curriculumOrder: 0,
      status: 'draft',
    });
    expect(out.vocabRefs).toEqual([]);
  });

  it('rejects an unknown status', () => {
    expect(() => sentenceSchema.parse({ ...valid, status: 'pending' })).toThrow();
  });
});

describe('unitSummarySchema', () => {
  it('rebuild spec §5.2: every unit must have at least one published island — schema exposes islandCount (callers enforce ≥1)', () => {
    expect(() =>
      unitSummarySchema.parse({
        unitId: 'unit_a1_introductions',
        level: 'a1',
        title: 'Introductions',
        summary: '',
        sentenceCount: 12,
        islandCount: 1,
      }),
    ).not.toThrow();
  });
});

describe('conversationSummarySchema', () => {
  it('rejects a rubric score outside 0..3', () => {
    expect(() =>
      conversationSummarySchema.parse({
        sessionId: 'csess_00000000-0000-4000-8000-000000000000',
        learnerTurnCount: 5,
        teacherTurnCount: 5,
        vocabularyUsed: [],
        rubricScores: [{ criterion: 'fluency', score: 4 }],
        narrative: '',
      }),
    ).toThrow();
  });
});
