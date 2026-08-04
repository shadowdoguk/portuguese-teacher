// Tests for @pt/tooling — pins the adapter contract Phase C/D will
// implement against. Phase A ships only stubs; this file verifies
// the stub behaviour so the real adapters have a reference.

import { describe, it, expect } from 'vitest';
import {
  InMemoryAudioAdapter,
  audioContentHash,
  ScriptedConversationAdapter,
  NoOpAudioRecorder,
  selectAdapters,
} from '../index.js';

describe('InMemoryAudioAdapter (Phase A stub)', () => {
  it('returns a stable audioId for the same (voice, text, speed)', async () => {
    const a = new InMemoryAudioAdapter();
    const r1 = await a.synthesize({ text: 'Olá', voice: 'stub:pt-PT:default', speed: 1 });
    const r2 = await a.synthesize({ text: 'Olá', voice: 'stub:pt-PT:default', speed: 1 });
    expect(r1.audioId).toBe(r2.audioId);
    expect(r1.audioId).toMatch(/^aud_[0-9a-f]{16}$/);
  });

  it('returns a different audioId when speed changes', async () => {
    const a = new InMemoryAudioAdapter();
    const r1 = await a.synthesize({ text: 'Olá', voice: 'stub:pt-PT:default', speed: 1 });
    const r2 = await a.synthesize({ text: 'Olá', voice: 'stub:pt-PT:default', speed: 1.2 });
    expect(r1.audioId).not.toBe(r2.audioId);
  });

  it('returns a different audioId when voice changes', async () => {
    const a = new InMemoryAudioAdapter();
    const r1 = await a.synthesize({ text: 'Olá', voice: 'stub:pt-PT:default', speed: 1 });
    const r2 = await a.synthesize({ text: 'Olá', voice: 'polly:Ines', speed: 1 });
    expect(r1.audioId).not.toBe(r2.audioId);
  });

  it('caches synthesised clips (same content hash re-uses bytes)', async () => {
    const a = new InMemoryAudioAdapter();
    await a.synthesize({ text: 'Olá', voice: 'stub:pt-PT:default', speed: 1 });
    await a.synthesize({ text: 'Olá', voice: 'stub:pt-PT:default', speed: 1 });
    expect(a.cacheSize()).toBe(1);
    const hash = audioContentHash('stub:pt-PT:default', 'Olá', 1);
    expect(a.readCached(hash)).toBeDefined();
  });

  it('exposes the canonical voice list', () => {
    const a = new InMemoryAudioAdapter();
    expect(a.voices).toContain('stub:pt-PT:default');
    expect(a.voices).toContain('polly:Ines');
  });

  it('rejects an out-of-range speed at the schema boundary', async () => {
    const a = new InMemoryAudioAdapter();
    await expect(a.synthesize({ text: 'Olá', voice: 'stub:pt-PT:default', speed: 3 })).rejects.toThrow();
  });
});

describe('ScriptedConversationAdapter (Phase A stub)', () => {
  const scenario = {
    scenarioId: 'scn_cafe',
    unitId: 'unit_a1_introductions',
    title: 'Order a coffee',
    setting: 'Café in Lisbon',
    roles: ['barista', 'customer'],
    learnerObjective: 'Order a coffee and a pastel de nata.',
    expectedVocabularyRefs: ['café', 'pastel de nata'],
    expectedGrammarRefs: ['g-querer-present'],
    openingMessage: 'Bom dia! O que deseja?',
    completionConditions: ['order placed'],
    correctionPolicy: 'correct only on direct ask',
    feedbackRubric: ['fluency', 'accuracy', 'politeness'],
    status: 'published' as const,
  };

  it('starts a session with null completedAt and null summary', async () => {
    const a = new ScriptedConversationAdapter();
    const session = await a.start(scenario, 'csess_00000000-0000-4000-8000-000000000000');
    expect(session.completedAt).toBeNull();
    expect(session.summary).toBeNull();
    expect(session.scenarioId).toBe('scn_cafe');
  });

  it('rejects a malformed scenarioId at register-time', () => {
    const a = new ScriptedConversationAdapter();
    expect(() => a.registerScript('not-a-scenario', [])).toThrow();
  });

  it('produces a teacher turn from a registered script', async () => {
    const a = new ScriptedConversationAdapter();
    a.registerScript('scn_cafe', [{ teacherLine: 'E para beber?', rubricPoints: ['fluency'] }]);
    const session = await a.start(scenario, 'csess_00000000-0000-4000-8000-000000000000');
    const teacherTurn = await a.nextTurn(session, {
      messageId: 'cmsg_00000000-0000-4000-8000-000000000000',
      sessionId: session.sessionId,
      role: 'learner',
      content: 'Um café, por favor.',
      createdAt: new Date().toISOString(),
    });
    expect(teacherTurn.role).toBe('teacher');
    expect(teacherTurn.content).toBe('E para beber?');
  });

  it('summary: bucket counts and rubric scores from the registered script', async () => {
    const a = new ScriptedConversationAdapter();
    a.registerScript('scn_cafe', [
      { teacherLine: 'Bom dia!', rubricPoints: ['fluency', 'politeness'] },
    ]);
    const session = await a.start(scenario, 'csess_00000000-0000-4000-8000-000000000000');
    // Note: `extractVocabulary` only keeps words with length >= 4
    // (per the function's documented heuristic for ASR noise).
    // The fixture learner turn uses longer Portuguese words so
    // the test exercises the extraction path; "bom" / "dia"
    // would be filtered out by the threshold.
    const turns = [
      { messageId: 'cmsg_1', sessionId: session.sessionId, role: 'learner' as const, content: 'Olá, gostaria de um café expresso, por favor', createdAt: '2026-07-30T08:00:00.000Z' },
      { messageId: 'cmsg_2', sessionId: session.sessionId, role: 'teacher' as const, content: 'Bom dia!', createdAt: '2026-07-30T08:00:01.000Z' },
    ];
    const summary = await a.summary(session, turns);
    expect(summary.learnerTurnCount).toBe(1);
    expect(summary.teacherTurnCount).toBe(1);
    expect(summary.rubricScores.map((r) => r.criterion).sort()).toEqual(['fluency', 'politeness']);
    for (const r of summary.rubricScores) {
      expect(r.score).toBe(2);
    }
    expect(summary.vocabularyUsed).toContain('café');
  });

  it('summary: zero-length turns yield zero counts', async () => {
    const a = new ScriptedConversationAdapter();
    const session = await a.start(scenario, 'csess_00000000-0000-4000-8000-000000000000');
    const summary = await a.summary(session, []);
    expect(summary.learnerTurnCount).toBe(0);
    expect(summary.teacherTurnCount).toBe(0);
  });
});

describe('NoOpAudioRecorder (Phase A stub)', () => {
  it('reports 16 kHz sample rate', () => {
    expect(new NoOpAudioRecorder().sampleRate()).toBe(16000);
  });

  it('stop() returns an empty Float32Array and zero duration', async () => {
    const r = new NoOpAudioRecorder();
    const handle = await r.start();
    const out = await handle.stop();
    expect(out.pcm.length).toBe(0);
    expect(out.sampleRate).toBe(16000);
    expect(out.durationSeconds).toBe(0);
  });

  it('cancel() does not throw', async () => {
    const r = new NoOpAudioRecorder();
    const handle = await r.start();
    await expect(handle.cancel()).resolves.toBeUndefined();
  });
});

describe('selectAdapters (factory)', () => {
  it('returns the in-memory stubs for any Phase A input', () => {
    const a = selectAdapters();
    expect(a.audio.providerId).toBe('stub:pt-PT:memory');
    expect(a.conversation.providerId).toBe('stub:scripted');
    expect(a.audioRecorder.providerId).toBe('stub:no-op');
  });

  it('ignores Phase A env hints (Phase C/D read the env at boot)', () => {
    const a = selectAdapters({
      AUDIO_PROVIDER: 'azure:pt-PT:default',
      CONVERSATION_PROVIDER: 'minimax:structured',
      RECORDER_PROVIDER: 'web:mediarecorder',
    });
    expect(a.audio.providerId).toBe('stub:pt-PT:memory');
  });
});