import type { Level } from "@/lib/curriculum/types";

export type AbCorpusEntry = {
  id: string;
  learnerInput: string;
  notes: string;
};

export type AbCorpus = {
  targetLevel: Level;
  target: number;
  bandHalfWidth: number;
  entries: ReadonlyArray<AbCorpusEntry>;
};

export const A0_TO_A1_CORPUS: AbCorpus = {
  targetLevel: "A0",
  // i+1 target: at A0 the target sits a notch above zero so the harness can
  // see whether the chosen utterance clears the noise floor (pure A0 words
  // land at score 0; this target demands a small amount of i+1 stretch).
  target: 1.0,
  bandHalfWidth: 0.6,
  entries: buildEntries(),
};

function buildEntries(): AbCorpusEntry[] {
  const greetings = [
    "olá",
    "bom dia",
    "boa tarde",
    "boa noite",
    "adeus",
    "até logo",
    "até amanhã",
    "como estás?",
    "como vai?",
    "tudo bem?",
  ];
  const introductions = [
    "chamo-me Ana",
    "sou o Pedro",
    "sou portuguesa",
    "sou brasileiro",
    "tenho vinte e cinco anos",
    "tenho trinta anos",
    "tenho dezassete anos",
    "moro em Lisboa",
    "moro no Porto",
    "sou de Faro",
  ];
  const politeness = [
    "obrigado",
    "obrigada",
    "muito obrigado",
    "de nada",
    "com licença",
    "desculpa",
    "desculpe",
    "por favor",
    "está bem",
    "muito bem",
  ];
  const cafe = [
    "um café, por favor",
    "um café e uma torrada",
    "queria um café",
    "uma água, se faz favor",
    "a conta, por favor",
    "quanto é?",
    "posso pagar com cartão?",
    "mais alguma coisa?",
    "com licença, o café",
    "está quente",
  ];
  const directions = [
    "onde é a farmácia?",
    "como vou para o centro?",
    "é longe?",
    "é perto?",
    "fica aqui perto",
    "vire à direita",
    "vire à esquerda",
    "siga em frente",
    "onde fica a estação?",
    "perto da praça",
  ];
  const family = [
    "tenho dois irmãos",
    "tenho uma irmã",
    "a minha mãe é professora",
    "o meu pai é médico",
    "sou casado",
    "sou solteira",
    "tenho um filho",
    "tenho uma filha",
    "a minha família é grande",
    "os meus avós vivem em Coimbra",
  ];
  const routine = [
    "acordo às sete",
    "tomo o pequeno-almoço",
    "vou para o trabalho",
    "almoço ao meio-dia",
    "janto às oito",
    "vou dormir às onze",
    "estudo português",
    "leio um livro",
    "ouço música",
    "vejo televisão",
  ];
  const numbers = [
    "um, dois, três",
    "quantos anos tens?",
    "tenho cinco anos",
    "são sete euros",
    "duas pessoas, por favor",
    "três cafés",
    "quatro amigos",
    "dez minutos",
    "cento e vinte",
    "mil euros",
  ];
  const colors = [
    "o céu é azul",
    "a relva é verde",
    "o sol é amarelo",
    "a noite é escura",
    "o carro é vermelho",
    "a casa é branca",
    "o gato é preto",
    "a flor é rosa",
    "o mar é azul",
    "a árvore é verde",
  ];
  const misc = [
    "hoje chove",
    "está sol",
    "está frio",
    "está calor",
    "está vento",
    "ontem fui à praia",
    "amanhã vou ao cinema",
    "gosto de chocolate",
    "não gosto de café",
    "quero aprender português",
  ];

  return [
    ...greetings.map(label("greeting")),
    ...introductions.map(label("introduction")),
    ...politeness.map(label("politeness")),
    ...cafe.map(label("cafe")),
    ...directions.map(label("directions")),
    ...family.map(label("family")),
    ...routine.map(label("routine")),
    ...numbers.map(label("numbers")),
    ...colors.map(label("colors")),
    ...misc.map(label("misc")),
  ];
}

function label(category: string) {
  return (input: string, idx: number): AbCorpusEntry => ({
    id: `${category}-${String(idx + 1).padStart(2, "0")}`,
    learnerInput: input,
    notes: category,
  });
}