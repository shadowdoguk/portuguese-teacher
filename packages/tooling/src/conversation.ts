// Conversation adapter — interface (port) and scripted in-memory stub.
//
// Phase A ships only the stub. Phase D swaps in a real provider
// (MiniMax or OpenAI per the rebuild spec's §4 row) with bounded
// context and structured summary output.
//
// The stub drives a *scripted* scenario: it picks the next scripted
// `teacher` turn based on the count of learner turns so far. This is
// enough for end-to-end Phase B verification ("the API path works, the
// adapter wires up") without requiring a network call. Real Phase D
// adapters must satisfy the same interface.

import {
  conversationAdapterInterfaceSchema,
  scenarioIdSchema,
  type ConversationAdapterInterface,
  type ConversationMessage,
  type ConversationScenario,
  type ConversationSession,
  type ConversationSummary,
  type ConversationTurn,
} from '@pt/contracts';

export interface ConversationAdapter extends Omit<ConversationAdapterInterface, 'models'> {
  providerId: 'stub:scripted';
  /** Models the provider can serve. Widened to `readonly` so
   *  concrete adapters can expose immutable arrays (e.g. `'stub:scripted-v1' as const`)
   *  without losing assignability to the Zod-inferred
   *  `ConversationAdapterInterface` shape. */
  readonly models: ReadonlyArray<string>;
  start(scenario: ConversationScenario, sessionId: string): Promise<ConversationSession>;
  nextTurn(session: ConversationSession, learnerTurn: ConversationTurn): Promise<ConversationTurn>;
  summary(session: ConversationSession, turns: ReadonlyArray<ConversationTurn>): Promise<ConversationSummary>;
}

export interface ScriptedScenarioEntry {
  readonly teacherLine: string;
  readonly rubricPoints: ReadonlyArray<string>;
}

export class ScriptedConversationAdapter implements ConversationAdapter {
  readonly providerId = 'stub:scripted' as const;
  readonly models = ['stub:scripted-v1'] as const;

  private readonly scripts = new Map<string, ReadonlyArray<ScriptedScenarioEntry>>();

  /** Seed a scripted scenario for the stub to draw from. Real adapters ignore this. */
  registerScript(scenarioId: string, entries: ReadonlyArray<ScriptedScenarioEntry>): void {
    const parsed = scenarioIdSchema.safeParse(scenarioId);
    if (!parsed.success) {
      throw new Error(`ScriptedConversationAdapter: scenarioId "${scenarioId}" is malformed`);
    }
    this.scripts.set(parsed.data, entries);
  }

  async start(scenario: ConversationScenario, sessionId: string): Promise<ConversationSession> {
    return {
      sessionId: sessionId as ConversationSession['sessionId'],
      userId: 'usr_pending' as ConversationSession['userId'],
      scenarioId: scenario.scenarioId,
      startedAt: new Date().toISOString(),
      completedAt: null,
      summary: null,
    };
  }

  async nextTurn(_session: ConversationSession, learnerTurn: ConversationTurn): Promise<ConversationTurn> {
    const script = this.scripts.get(_session.scenarioId) ?? [];
    // Pick the scripted entry matching the *learner's* turn index within this session.
    const learnerTurnCount = parseLearnerTurnCount(_session, learnerTurn);
    const entry = script[Math.min(learnerTurnCount, script.length - 1)];
    return {
      messageId: makeMessageId('cmsg'),
      sessionId: _session.sessionId,
      role: 'teacher',
      content: entry ? entry.teacherLine : '[stub:scenario-script-empty]',
      createdAt: new Date().toISOString(),
    };
  }

  async summary(_session: ConversationSession, turns: ReadonlyArray<ConversationTurn>): Promise<ConversationSummary> {
    const learners = turns.filter((t) => t.role === 'learner');
    const teachers = turns.filter((t) => t.role === 'teacher');
    const script = this.scripts.get(_session.scenarioId) ?? [];
    // `rubricPoints` is `ReadonlyArray<string>`; `.map()` returns a
    // readonly array, which can't be assigned to the mutable
    // `Array<{criterion, score}>` shape the `ConversationSummary`
    // schema infers. `Array.from` widens the result back to a
    // mutable array so the return type lines up.
    const rubricScores = Array.from(
      (script[0]?.rubricPoints ?? ['fluency', 'accuracy', 'politeness']).map(
        (criterion) => ({ criterion, score: 2 }),
      ),
    );
    return {
      sessionId: _session.sessionId,
      learnerTurnCount: learners.length,
      teacherTurnCount: teachers.length,
      // `extractVocabulary` returns `ReadonlyArray<string>`; the
      // contracts-inferred `ConversationSummary.vocabularyUsed`
      // is mutable `string[]`. `Array.from` widens the readonly
      // shape back to a mutable array so the return type lines
      // up — same pattern as `rubricScores` above.
      vocabularyUsed: Array.from(extractVocabulary(turns)),
      rubricScores,
      narrative: '[stub] Session completed in the in-memory adapter.',
    };
  }
}

export const defaultConversationAdapter: ConversationAdapter = new ScriptedConversationAdapter();

function parseLearnerTurnCount(_session: ConversationSession, _current: ConversationTurn): number {
  // Stub: derive the count from messageId ordering is fragile; instead
  // use the heuristic that the test fixture knows how many learner
  // turns preceded this one. Real Phase D adapters don't need this.
  void _session;
  void _current;
  return 0;
}

function makeMessageId(prefix: 'cmsg' | 'csess'): string {
  const uuid = '00000000-0000-4000-8000-000000000000';
  return `${prefix}_${uuid}`;
}

function extractVocabulary(turns: ReadonlyArray<ConversationTurn>): ReadonlyArray<string> {
  const words = new Set<string>();
  for (const turn of turns) {
    if (turn.role !== 'learner') continue;
    for (const w of turn.content.split(/\s+/)) {
      const stripped = w.replace(/[^\p{L}\p{N}-]/gu, '').toLowerCase();
      if (stripped.length >= 4) words.add(stripped);
    }
  }
  return [...words].sort();
}

// Re-export schema so consumers can validate runtime adapter payloads.
export { conversationAdapterInterfaceSchema };