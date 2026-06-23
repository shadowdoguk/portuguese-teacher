import type { LlmCompleteResult, LlmMessage } from "@/lib/minimax/types";

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const HIGH_TMR_PHRASES = [
  "Com efeito, a problemática hodierna carece de uma apreciação holística e multifacetada.",
  "Outrossim, convém salientar que as idiossincrasias do falante nativo se manifestam amiúde.",
  "É imprescindível ponderar a transversalidade do fenómeno em questão.",
  "Não obstante, a conjuntura actual exige uma reflexão circunstanciada.",
  "A periclitante situação demanda uma intervenção célere e inequívoca.",
  "Urge, pois, uma reavaliação paradigmática das premissas subjacentes.",
  "A excelência pedagógica reside na capacidade de transmutar complexidade em clareza.",
  "Há que considerar, however, the inherent ambiguity of linguistic phenomena.",
  "Subsequentemente, o aprendente deverá consolidar os conteúdos programáticos.",
  "A excelência comunicativa pressupõe um domínio cabal das estruturas sintácticas.",
];

const MID_TMR_PHRASES = [
  "Boa resposta. Podemos continuar?",
  "Muito bem! E o que fazes amanhã?",
  "Perfeito. Conta-me mais sobre isso.",
  "Óptimo! Queres tentar outro exemplo?",
  "Está certo. Vamos ao próximo exercício.",
  "Muito bem. E como te sentes hoje?",
  "Boa. Podes repetir, por favor?",
  "Certo. E onde moras exactamente?",
  "Está bom. Quantos anos tens, afinal?",
  "Perfeito. Queres pedir um café?",
];

const LOW_TMR_PHRASES = [
  "Olá!",
  "Bom dia.",
  "Sim.",
  "Não.",
  "Olá, bom dia.",
  "Tudo bem?",
  "Como te chamas?",
  "Obrigado.",
  "Adeus.",
  "Até logo.",
];

const PT_BR_MARKED = [
  "Você é muito gentil, tá bom?",
  "Vocês são legais, pra mim está ótimo.",
  "A gente vai pro centro amanhã.",
  "Tá certo, você tem razão.",
  "Pra mim, é isso aí.",
];

export function buildMockPromptOnlyLlm(): {
  __kind: "mock";
  callOnce: (id: string) => Promise<string>;
} {
  return {
    __kind: "mock",
    async callOnce(id: string): Promise<string> {
      const rng = mulberry32(hashSeed(`prompt-only:${id}`));
      const idx = Math.floor(rng() * HIGH_TMR_PHRASES.length);
      const utterance = HIGH_TMR_PHRASES[idx]!;
      return JSON.stringify({
        nlu: {
          intent: "mock.prompt-only",
          slots: {},
          grammar_features: [],
          error_categories: [],
        },
        utterance,
        feedback: [],
        difficulty_estimate: 2.5,
        comprehension_ok: true,
      });
    },
  };
}

export function buildMockRerankLlm(): (messages: LlmMessage[]) => Promise<LlmCompleteResult> {
  return async (_messages: LlmMessage[]) => {
    const userText = _messages.find((m) => m.role === "user")?.content ?? "";
    const rng = mulberry32(hashSeed(`rerank:${userText}`));

    const lowIdx = Math.floor(rng() * LOW_TMR_PHRASES.length);
    const midIdx = Math.floor(rng() * MID_TMR_PHRASES.length);
    const highIdx = Math.floor(rng() * HIGH_TMR_PHRASES.length);
    const ptBrIdx = Math.floor(rng() * PT_BR_MARKED.length);

    const candidates = [
      {
        nlu: { intent: "mock.0", slots: {}, grammar_features: [], error_categories: [] },
        utterance: HIGH_TMR_PHRASES[highIdx]!,
        feedback: [],
        difficulty_estimate: 2.5,
        comprehension_ok: true,
      },
      {
        nlu: { intent: "mock.1", slots: {}, grammar_features: [], error_categories: [] },
        utterance: PT_BR_MARKED[ptBrIdx]!,
        feedback: [],
        difficulty_estimate: 1.5,
        comprehension_ok: true,
      },
      {
        nlu: { intent: "mock.2", slots: {}, grammar_features: [], error_categories: [] },
        utterance: LOW_TMR_PHRASES[lowIdx]!,
        feedback: [],
        difficulty_estimate: 0.5,
        comprehension_ok: true,
      },
      {
        nlu: { intent: "mock.3", slots: {}, grammar_features: [], error_categories: [] },
        utterance: MID_TMR_PHRASES[midIdx]!,
        feedback: [],
        difficulty_estimate: 1.4,
        comprehension_ok: true,
      },
    ];

    return {
      text: JSON.stringify({ candidates }),
      usage: { promptTokens: 50, completionTokens: 200, totalTokens: 250 },
    };
  };
}