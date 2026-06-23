import type { ErrorCategory, FeedbackItem, PracticeMode, VoiceLoopLLMPayload } from "./types";

export const VOICE_LOOP_SYSTEM_PROMPT = [
  "You are the AI teacher for a Portuguese (pt-PT) lesson.",
  "Respond with a single JSON object and nothing else.",
  "Shape:",
  "{",
  '  "nlu": { "intent": string, "slots": object, "grammar_features": string[], "error_categories": string[] },',
  '  "utterance": string,',
  '  "feedback": [ { "kind": "corrective"|"confirmatory"|"formative", "text": string, "span"?: { "start": number, "end": number }, "errorCategory"?: string } ],',
  '  "difficulty_estimate": number,',
  '  "comprehension_ok": boolean',
  "}",
  "Use European Portuguese orthography. Difficulty estimate must be a number in [0, 3].",
].join("\n");

export type MockScriptedTurn = {
  match: (input: string, mode: PracticeMode) => boolean;
  build: (input: string, mode: PracticeMode) => VoiceLoopLLMPayload;
};

const VALID_ERROR_CATEGORIES: ReadonlySet<ErrorCategory> = new Set<ErrorCategory>([
  "grammar.tense",
  "grammar.gender",
  "grammar.agreement",
  "phoneme.confusion",
  "lexical.choice",
  "register",
  "fluency.hesitation",
]);

function coerceErrorCategories(values: ReadonlyArray<string>): ErrorCategory[] {
  return values.filter((value): value is ErrorCategory =>
    VALID_ERROR_CATEGORIES.has(value as ErrorCategory),
  );
}

function detectInputErrors(input: string): ErrorCategory[] {
  const errors: string[] = [];
  // Note: avoid \b because JS treats accented characters as non-word, so
  // \bvocê\b would not match "Você" followed by a space.
  if (/(^|\s)você(\s|$|[,.!?])/i.test(input) && !/(^|\s)tu(\s|$|[,.!?])/i.test(input)) {
    errors.push("register");
  }
  if (/(^|\s)voce(\s|$|[,.!?])/i.test(input)) {
    errors.push("register");
  }
  return coerceErrorCategories(errors);
}

export const MOCK_SCRIPTED_TURNS: readonly MockScriptedTurn[] = [
  {
    match: (input) => /^(ol[áa]|bom dia|boa tarde|boa noite)/i.test(input.trim()),
    build: () => ({
      nlu: {
        intent: "greeting",
        slots: { addressee: "teacher" },
        grammarFeatures: ["present.indicative"],
        errorCategories: [],
      },
      utterance: "Olá! Tudo bem? Como te chamas?",
      feedback: [{ kind: "confirmatory", text: "Boa saudação!" }],
      difficulty_estimate: 1.0,
      comprehension_ok: true,
    }),
  },
  {
    match: (input) => /chamo-me\s+(\w+)/i.test(input),
    build: (input) => {
      const name = input.match(/chamo-me\s+(\w+)/i)?.[1] ?? "";
      return {
        nlu: {
          intent: "introduce.self",
          slots: { name },
          grammarFeatures: ["present.indicative.1sg", "reflexive.chamar"],
          errorCategories: [],
        },
        utterance: "Muito prazer! E quantos anos tens?",
        feedback: [
          { kind: "confirmatory", text: "Boa estrutura: ‘chamo-me…’" },
          {
            kind: "formative",
            text: "Em pt-PT preferimos ‘quantos anos tens?’ a ‘qual é a sua idade?’.",
          },
        ],
        difficulty_estimate: 1.2,
        comprehension_ok: true,
      };
    },
  },
  {
    match: (input) => /tenho\s+\d+\s+anos/i.test(input),
    build: () => ({
      nlu: {
        intent: "introduce.age",
        slots: {},
        grammarFeatures: ["present.indicative.1sg", "verb.ter"],
        errorCategories: [],
      },
      utterance: "Excelente. Queres treinar uma conversa num café?",
      feedback: [
        {
          kind: "confirmatory",
          text: "Perfeito — ‘tenho X anos’ está correto.",
        },
      ],
      difficulty_estimate: 1.4,
      comprehension_ok: true,
    }),
  },
  {
    match: (input) => /queria|café|cafe|água|agua/i.test(input),
    build: () => ({
      nlu: {
        intent: "scenario.cafe.order",
        slots: { item: "café" },
        grammarFeatures: ["conditional.imperfect", "politeness.registration"],
        errorCategories: [],
      },
      utterance: "Um café, com certeza. Mais alguma coisa?",
      feedback: [{ kind: "confirmatory", text: "‘Queria…’ é educado; muito bem." }],
      difficulty_estimate: 1.6,
      comprehension_ok: true,
    }),
  },
  {
    match: () => true,
    build: () => ({
      nlu: {
        intent: "general.turn",
        slots: {},
        grammarFeatures: [],
        errorCategories: [],
      },
      utterance: "Desculpa, podes repetir de outra forma?",
      feedback: [
        {
          kind: "formative",
          text: "Tenta reformular com vocabulário simples.",
        },
      ] satisfies FeedbackItem[],
      difficulty_estimate: 0.8,
      comprehension_ok: false,
    }),
  },
];

export function scriptedPayloadFor(learnerText: string, mode: PracticeMode): VoiceLoopLLMPayload {
  for (const turn of MOCK_SCRIPTED_TURNS) {
    if (turn.match(learnerText, mode)) {
      const payload = turn.build(learnerText, mode);
      return {
        ...payload,
        nlu: {
          ...payload.nlu,
          errorCategories: Array.from(
            new Set([...payload.nlu.errorCategories, ...detectInputErrors(learnerText)]),
          ),
        },
      };
    }
  }
  // unreachable: the catch-all `() => true` always matches
  return MOCK_SCRIPTED_TURNS[MOCK_SCRIPTED_TURNS.length - 1]!.build("", mode);
}
