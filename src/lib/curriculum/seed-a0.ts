import type { Curriculum, Unit } from "./types";

const A0_1_ALPHABET: Unit = {
  id: "a0-1-alfabeto-saudacoes",
  level: "A0",
  order: 1,
  title: "Alfabeto e saudações",
  description:
    "Reconhecer o alfabeto, os sons característicos do português europeu, e as saudações do dia-a-dia.",
  prerequisiteUnitIds: [],
  remedialAnchors: [],
  lessons: [
    {
      id: "a0-1-l1-alfabeto",
      unitId: "a0-1-alfabeto-saudacoes",
      order: 1,
      kind: "alphabet",
      title: "O alfabeto em voz alta",
      estimatedMinutes: 8,
      body: {
        introduction:
          "Vinte e seis letras, cinco vogais com sons puros, e consoantes que pedem prática — começa por aqui.",
        blocks: [
          {
            kind: "rule",
            text: "As vogais têm um som fixo: a, e, i, o, u. Não há ditongos silenciosos como em inglês.",
          },
          {
            kind: "example",
            pt: "A avó adora o ovo.",
            gloss: "A vogal ‘o’ mantém-se sempre aberta e clara.",
          },
          {
            kind: "example",
            pt: "O João chegou de Lisboa.",
            gloss:
              "‘João’ e ‘Lisboa’ começam com a mesma letra, mas pronunciam-se de forma diferente.",
          },
        ],
      },
      exercises: [
        {
          id: "a0-1-l1-e1",
          lessonId: "a0-1-l1-alfabeto",
          kind: "listen-and-repeat",
          prompt: "Repete: ‘A, B, C, D…’",
          difficulty: "easy",
          vocabularyRefs: [],
          grammarRefs: [],
        },
        {
          id: "a0-1-l1-e2",
          lessonId: "a0-1-l1-alfabeto",
          kind: "pronunciation-drill",
          prompt: "Diz o teu nome letra a letra.",
          difficulty: "core",
          vocabularyRefs: [],
          grammarRefs: [],
        },
      ],
    },
    {
      id: "a0-1-l2-saudacoes",
      unitId: "a0-1-alfabeto-saudacoes",
      order: 2,
      kind: "vocabulary",
      title: "Bom dia, boa tarde, boa noite",
      estimatedMinutes: 6,
      body: {
        introduction: "As três saudações principais e o ‘olá’ informal.",
        blocks: [
          {
            kind: "rule",
            text: "‘Bom dia’ usa-se de manhã; ‘boa tarde’ à tarde; ‘boa noite’ ao fim do dia.",
          },
          {
            kind: "example",
            pt: "Bom dia! Como está?",
            gloss: "Saudação formal pela manhã.",
          },
          {
            kind: "example",
            pt: "Olá, tudo bem?",
            gloss: "Saudação informal a qualquer hora.",
          },
        ],
      },
      exercises: [
        {
          id: "a0-1-l2-e1",
          lessonId: "a0-1-l2-saudacoes",
          kind: "flashcard",
          prompt: "bom dia",
          expectedAnswer: "good morning",
          difficulty: "easy",
          vocabularyRefs: ["a0-1-v-bom-dia"],
          grammarRefs: [],
        },
        {
          id: "a0-1-l2-e2",
          lessonId: "a0-1-l2-saudacoes",
          kind: "fill-in",
          prompt: "Boa ______! (é noite)",
          expectedAnswer: "noite",
          difficulty: "easy",
          vocabularyRefs: ["a0-1-v-boa-noite"],
          grammarRefs: [],
        },
      ],
    },
    {
      id: "a0-1-l3-cortesia",
      unitId: "a0-1-alfabeto-saudacoes",
      order: 3,
      kind: "vocabulary",
      title: "Por favor e obrigado",
      estimatedMinutes: 5,
      body: {
        introduction: "Três palavras que abrem todas as portas em Portugal.",
        blocks: [
          {
            kind: "rule",
            text: "‘Por favor’ para pedir; ‘obrigado’ (homem) / ‘obrigada’ (mulher) para agradecer; ‘de nada’ para responder.",
          },
          {
            kind: "example",
            pt: "Um café, por favor.",
            gloss: "Pedir um café num balcão.",
          },
          {
            kind: "example",
            pt: "— Obrigado! — De nada.",
            gloss: "Pequena troca de cortesia.",
          },
        ],
      },
      exercises: [
        {
          id: "a0-1-l3-e1",
          lessonId: "a0-1-l3-cortesia",
          kind: "role-play",
          prompt: "Pede um café com cortesia completa.",
          difficulty: "core",
          vocabularyRefs: ["a0-1-v-por-favor", "a0-1-v-obrigado"],
          grammarRefs: [],
        },
      ],
    },
  ],
  vocabulary: [
    {
      id: "a0-1-v-bom-dia",
      unitId: "a0-1-alfabeto-saudacoes",
      pt: "bom dia",
      gloss: "good morning",
      partOfSpeech: "phrase",
      examplePt: "Bom dia! Como está?",
      exampleGloss: "Good morning! How are you?",
    },
    {
      id: "a0-1-v-boa-noite",
      unitId: "a0-1-alfabeto-saudacoes",
      pt: "boa noite",
      gloss: "good evening / good night",
      partOfSpeech: "phrase",
    },
    {
      id: "a0-1-v-por-favor",
      unitId: "a0-1-alfabeto-saudacoes",
      pt: "por favor",
      gloss: "please",
      partOfSpeech: "phrase",
    },
    {
      id: "a0-1-v-obrigado",
      unitId: "a0-1-alfabeto-saudacoes",
      pt: "obrigado",
      gloss: "thank you (said by a man)",
      partOfSpeech: "phrase",
    },
    {
      id: "a0-1-v-de-nada",
      unitId: "a0-1-alfabeto-saudacoes",
      pt: "de nada",
      gloss: "you're welcome",
      partOfSpeech: "phrase",
    },
  ],
  grammar: [
    {
      id: "a0-1-g-artigo",
      unitId: "a0-1-alfabeto-saudacoes",
      name: "Artigos definidos",
      description: "O, a, os, as — vêm sempre antes do nome e concordam em género e número.",
      examples: [
        { pt: "o café", gloss: "the coffee (masculine)" },
        { pt: "a água", gloss: "the water (feminine)" },
        { pt: "os amigos", gloss: "the friends (plural masculine)" },
      ],
    },
  ],
  scenarios: [
    {
      id: "a0-1-s-apresentar-cafe",
      unitId: "a0-1-alfabeto-saudacoes",
      goal: "Entrar num café, saudar e pedir uma bebida em três falas.",
      setting: "Balcão de um café em Lisboa, manhã de sábado.",
      roles: {
        learner: "Cliente estrangeiro a entrar pela primeira vez.",
        teacher: "Empregado de balcão simpático.",
      },
      successCriteria: [
        "O Learner usa uma saudação adequada à hora.",
        "O Learner diz ‘por favor’ ao pedir.",
        "O Learner agradece antes de sair.",
      ],
    },
  ],
};

const A0_2_NUMEROS: Unit = {
  id: "a0-2-numeros-apresentacoes",
  level: "A0",
  order: 2,
  title: "Números e apresentações",
  description: "Contar até vinte, dizer os dias da semana, e apresentar-se com nome e idade.",
  prerequisiteUnitIds: ["a0-1-alfabeto-saudacoes"],
  remedialAnchors: [
    {
      fromUnitId: "a0-2-numeros-apresentacoes",
      toUnitId: "a0-1-alfabeto-saudacoes",
      reason: "phoneme-confusion",
      note: "Rever o alfabeto se o Learner hesitar a soletrar o nome.",
    },
  ],
  lessons: [
    {
      id: "a0-2-l1-numeros",
      unitId: "a0-2-numeros-apresentacoes",
      order: 1,
      kind: "vocabulary",
      title: "Contar até vinte",
      estimatedMinutes: 8,
      body: {
        introduction:
          "Os números em português europeu têm uma lógica regular até vinte, com algumas excepções a partir do dezasseis.",
        blocks: [
          {
            kind: "rule",
            text: "dez + seis = dezasseis; dez + sete = dezassete. A partir do doze, a junção segue este padrão.",
          },
          {
            kind: "example",
            pt: "um, dois, três, quatro, cinco, seis, sete, oito, nove, dez, onze, doze, treze, catorze, quinze, dezasseis.",
            gloss: "Contagem regular até dezasseis.",
          },
        ],
      },
      exercises: [
        {
          id: "a0-2-l1-e1",
          lessonId: "a0-2-l1-numeros",
          kind: "flashcard",
          prompt: "quinze",
          expectedAnswer: "15",
          difficulty: "easy",
          vocabularyRefs: ["a0-2-v-quinze"],
          grammarRefs: [],
        },
        {
          id: "a0-2-l1-e2",
          lessonId: "a0-2-l1-numeros",
          kind: "fill-in",
          prompt: "Dez + sete = dezassete. E dez + oito?",
          expectedAnswer: "dezoito",
          difficulty: "core",
          vocabularyRefs: ["a0-2-v-dezoito"],
          grammarRefs: [],
        },
      ],
    },
    {
      id: "a0-2-l2-dias-semana",
      unitId: "a0-2-numeros-apresentacoes",
      order: 2,
      kind: "vocabulary",
      title: "Os dias da semana",
      estimatedMinutes: 5,
      body: {
        introduction: "Sete dias, todos em minúscula, sem artigo quando se referem ao dia em si.",
        blocks: [
          {
            kind: "rule",
            text: "Os dias escrevem-se em minúscula: segunda, terça, quarta…",
          },
          {
            kind: "example",
            pt: "Hoje é segunda-feira.",
            gloss: "Today is Monday.",
          },
        ],
      },
      exercises: [
        {
          id: "a0-2-l2-e1",
          lessonId: "a0-2-l2-dias-semana",
          kind: "flashcard",
          prompt: "sábado",
          expectedAnswer: "Saturday",
          difficulty: "easy",
          vocabularyRefs: ["a0-2-v-sabado"],
          grammarRefs: [],
        },
      ],
    },
    {
      id: "a0-2-l3-apresentar",
      unitId: "a0-2-numeros-apresentacoes",
      order: 3,
      kind: "grammar",
      title: "Chamo-me… tenho… anos",
      estimatedMinutes: 7,
      body: {
        introduction: "Duas frases simples para te apresentar: nome e idade.",
        blocks: [
          {
            kind: "rule",
            text: "‘Chamo-me…’ para o nome. ‘Tenho … anos’ para a idade. O verbo ‘ter’ é irregular na 1.ª pessoa.",
          },
          {
            kind: "example",
            pt: "Chamo-me Ana e tenho trinta anos.",
            gloss: "My name is Ana and I am thirty years old.",
          },
        ],
      },
      exercises: [
        {
          id: "a0-2-l3-e1",
          lessonId: "a0-2-l3-apresentar",
          kind: "free-response",
          prompt: "Apresenta-te em duas frases.",
          difficulty: "core",
          vocabularyRefs: ["a0-2-v-chamar", "a0-2-v-ter"],
          grammarRefs: ["a0-2-g-apresentar"],
        },
      ],
    },
  ],
  vocabulary: [
    {
      id: "a0-2-v-quinze",
      unitId: "a0-2-numeros-apresentacoes",
      pt: "quinze",
      gloss: "fifteen",
      partOfSpeech: "noun",
    },
    {
      id: "a0-2-v-dezoito",
      unitId: "a0-2-numeros-apresentacoes",
      pt: "dezoito",
      gloss: "eighteen",
      partOfSpeech: "noun",
    },
    {
      id: "a0-2-v-sabado",
      unitId: "a0-2-numeros-apresentacoes",
      pt: "sábado",
      gloss: "Saturday",
      partOfSpeech: "noun",
    },
    {
      id: "a0-2-v-chamar",
      unitId: "a0-2-numeros-apresentacoes",
      pt: "chamar-se",
      gloss: "to be called (reflexive)",
      partOfSpeech: "verb",
    },
    {
      id: "a0-2-v-ter",
      unitId: "a0-2-numeros-apresentacoes",
      pt: "ter",
      gloss: "to have",
      partOfSpeech: "verb",
    },
  ],
  grammar: [
    {
      id: "a0-2-g-apresentar",
      unitId: "a0-2-numeros-apresentacoes",
      name: "Apresentar-se",
      description: "Estruturas mínimas para nome e idade: chamo-me… / tenho … anos.",
      examples: [
        { pt: "Chamo-me Rui.", gloss: "My name is Rui." },
        { pt: "Tenho vinte e cinco anos.", gloss: "I am twenty-five years old." },
      ],
    },
  ],
  scenarios: [
    {
      id: "a0-2-s-apresentar-grupo",
      unitId: "a0-2-numeros-apresentacoes",
      goal: "Apresentar-te a três pessoas novas num grupo, dando nome e idade.",
      setting: "Encontro de intercâmbio numa associação em Coimbra.",
      roles: {
        learner: "Recém-chegado a um grupo de conversação.",
        teacher: "Três participantes portugueses que se apresentam primeiro.",
      },
      successCriteria: [
        "O Learner cumprimenta cada pessoa de forma adequada.",
        "O Learner usa ‘chamo-me…’ e ‘tenho … anos’ em todas as apresentações.",
        "O Learner responde com ‘prazer’ quando apresentado.",
      ],
    },
  ],
};

const A0_3_CAFE: Unit = {
  id: "a0-3-cafe-pedidos",
  level: "A0",
  order: 3,
  title: "Café e pedidos simples",
  description: "Ler um menu curto, pedir uma bebida e um pastel de nata, e perguntar o preço.",
  prerequisiteUnitIds: ["a0-2-numeros-apresentacoes"],
  remedialAnchors: [
    {
      fromUnitId: "a0-3-cafe-pedidos",
      toUnitId: "a0-1-alfabeto-saudacoes",
      reason: "phoneme-confusion",
      note: "Rever o alfabeto se o Learner tiver dificuldade a soletrar o nome ao empregado.",
    },
    {
      fromUnitId: "a0-3-cafe-pedidos",
      toUnitId: "a0-2-numeros-apresentacoes",
      reason: "vocabulary-decay",
      note: "Rever números 1–20 quando o Learner não conseguir perceber o preço.",
    },
  ],
  lessons: [
    {
      id: "a0-3-l1-vocab-cafe",
      unitId: "a0-3-cafe-pedidos",
      order: 1,
      kind: "vocabulary",
      title: "No balcão do café",
      estimatedMinutes: 7,
      body: {
        introduction: "As bebidas e as palavras de cortesia mais úteis.",
        blocks: [
          {
            kind: "rule",
            text: "‘Um café, por favor.’ ‘Uma água, por favor.’ O numeral e o artigo concordam com o nome.",
          },
          {
            kind: "example",
            pt: "Queria um café e um pastel de nata, por favor.",
            gloss: "Polite way to order coffee and a custard tart.",
          },
        ],
      },
      exercises: [
        {
          id: "a0-3-l1-e1",
          lessonId: "a0-3-l1-vocab-cafe",
          kind: "flashcard",
          prompt: "pastel de nata",
          expectedAnswer: "custard tart",
          difficulty: "easy",
          vocabularyRefs: ["a0-3-v-pastel-nata"],
          grammarRefs: [],
        },
      ],
    },
    {
      id: "a0-3-l2-pedir",
      unitId: "a0-3-cafe-pedidos",
      order: 2,
      kind: "grammar",
      title: "Queria… para pedir com educação",
      estimatedMinutes: 6,
      body: {
        introduction: "O condicional ‘queria’ é a forma educada de pedir em português europeu.",
        blocks: [
          {
            kind: "rule",
            text: "‘Queria + artigo + nome’ é mais educado do que o presente do indicativo.",
          },
          {
            kind: "example",
            pt: "Queria um café, por favor.",
            gloss: "I'd like a coffee, please.",
          },
        ],
      },
      exercises: [
        {
          id: "a0-3-l2-e1",
          lessonId: "a0-3-l2-pedir",
          kind: "fill-in",
          prompt: "Queria ______ água, por favor.",
          expectedAnswer: "uma",
          difficulty: "core",
          vocabularyRefs: ["a0-3-v-agua"],
          grammarRefs: ["a0-3-g-condicional-pedir"],
        },
      ],
    },
    {
      id: "a0-3-l3-ler-menu",
      unitId: "a0-3-cafe-pedidos",
      order: 3,
      kind: "reading",
      title: "Ler um menu curto",
      estimatedMinutes: 8,
      body: {
        introduction: "Praticar a leitura de um menu real, com atenção aos artigos e aos preços.",
        blocks: [
          {
            kind: "rule",
            text: "Em Portugal, os preços escrevem-se com vírgula: ‘1,20 €’.",
          },
          {
            kind: "example",
            pt: "Café — 1,20 €. Pastel de nata — 1,50 €. Água — 1,80 €.",
            gloss: "Short menu with prices.",
          },
        ],
      },
      exercises: [
        {
          id: "a0-3-l3-e1",
          lessonId: "a0-3-l3-ler-menu",
          kind: "fill-in",
          prompt: "Quanto custa o pastel de nata? ______ €.",
          expectedAnswer: "1,50",
          difficulty: "core",
          vocabularyRefs: ["a0-3-v-pastel-nata"],
          grammarRefs: [],
        },
      ],
    },
  ],
  vocabulary: [
    {
      id: "a0-3-v-pastel-nata",
      unitId: "a0-3-cafe-pedidos",
      pt: "pastel de nata",
      gloss: "custard tart",
      partOfSpeech: "noun",
    },
    {
      id: "a0-3-v-agua",
      unitId: "a0-3-cafe-pedidos",
      pt: "água",
      gloss: "water",
      partOfSpeech: "noun",
    },
    {
      id: "a0-3-v-cafe",
      unitId: "a0-3-cafe-pedidos",
      pt: "café",
      gloss: "coffee (espresso)",
      partOfSpeech: "noun",
    },
  ],
  grammar: [
    {
      id: "a0-3-g-condicional-pedir",
      unitId: "a0-3-cafe-pedidos",
      name: "Condicional de cortesia",
      description:
        "‘Queria…’ é o condicional simples do verbo ‘querer’; é a forma preferida para pedir em situações de serviço.",
      examples: [
        { pt: "Queria um café, por favor.", gloss: "I'd like a coffee, please." },
        {
          pt: "Queria uma água com gás.",
          gloss: "I'd like a sparkling water.",
        },
      ],
    },
  ],
  scenarios: [
    {
      id: "a0-3-s-pedir-cafe",
      unitId: "a0-3-cafe-pedidos",
      goal: "Pedir uma bebida e um doce, perguntar o preço e pagar.",
      setting: "Café tradicional em Lisboa, hora do lanche.",
      roles: {
        learner: "Cliente a pedir pela primeira vez em português.",
        teacher: "Empregado paciente que confirma o pedido.",
      },
      successCriteria: [
        "O Learner cumprimenta o empregado ao entrar.",
        "O Learner usa ‘queria’ para fazer o pedido.",
        "O Learner confirma o preço antes de pagar.",
      ],
    },
  ],
};

export const A0_CURRICULUM: Curriculum = {
  dialect: "pt-PT",
  units: [A0_1_ALPHABET, A0_2_NUMEROS, A0_3_CAFE],
  entryUnitId: "a0-1-alfabeto-saudacoes",
  milestones: [
    {
      boundary: "A0-A1",
      fromLevel: "A0",
      toLevel: "A1",
      unitId: "a0-3-cafe-pedidos",
      passingScore: 0.75,
      itemCount: { min: 15, max: 25 },
      cooldownHours: 24,
      maxAttemptsBeforeReferral: 3,
    },
  ],
};
