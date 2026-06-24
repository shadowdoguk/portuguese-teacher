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
      category: "greetings-introductions",
      targetLevel: "A0",
      goal: "Entrar num café, saudar e pedir uma bebida em três falas.",
      setting: "Balcão de um café em Lisboa, manhã de sábado.",
      roles: {
        learner: "Cliente estrangeiro a entrar pela primeira vez.",
        teacher: "Empregado de balcão simpático.",
      },
      preTask:
        "Planeia a tua entrada: que horas são? Que saudação é apropriada? Que bebida queres?",
      expectedTurns: 3,
      vocabularyRefs: ["a0-1-v-bom-dia", "a0-1-v-por-favor", "a0-1-v-obrigado"],
      grammarRefs: ["a0-1-g-artigo"],
      remedialAnchorRefs: [],
      successCriteria: [
        "O Learner usa uma saudação adequada à hora.",
        "O Learner diz ‘por favor’ ao pedir.",
        "O Learner agradece antes de sair.",
      ],
      passingScore: 0.6,
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
      category: "greetings-introductions",
      targetLevel: "A0",
      goal: "Apresentar-te a três pessoas novas num grupo, dando nome e idade.",
      setting: "Encontro de intercâmbio numa associação em Coimbra.",
      roles: {
        learner: "Recém-chegado a um grupo de conversação.",
        teacher: "Três participantes portugueses que se apresentam primeiro.",
      },
      preTask:
        "Prepara uma apresentação de 10 segundos: nome, idade, e de onde vieste. Conta até vinte em voz alta uma vez antes de começar.",
      expectedTurns: 6,
      vocabularyRefs: ["a0-2-v-chamar", "a0-2-v-ter"],
      grammarRefs: ["a0-2-g-apresentar"],
      remedialAnchorRefs: [
        {
          toUnitId: "a0-1-alfabeto-saudacoes",
          reason: "phoneme-confusion",
          note: "Voltar ao alfabeto se o Learner hesitar a soletrar o nome.",
        },
      ],
      successCriteria: [
        "O Learner cumprimenta cada pessoa de forma adequada.",
        "O Learner usa ‘chamo-me…’ e ‘tenho … anos’ em todas as apresentações.",
        "O Learner responde com ‘prazer’ quando apresentado.",
      ],
      passingScore: 0.6,
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
      category: "cafe-restaurant",
      targetLevel: "A0",
      goal: "Pedir uma bebida e um doce, perguntar o preço e pagar.",
      setting: "Café tradicional em Lisboa, hora do lanche.",
      roles: {
        learner: "Cliente a pedir pela primeira vez em português.",
        teacher: "Empregado paciente que confirma o pedido.",
      },
      preTask:
        "Lê o menu em silêncio. Decide o que pedes. Prepara a pergunta ‘quanto é?’ antes de pedir a conta.",
      expectedTurns: 5,
      vocabularyRefs: ["a0-3-v-pastel-nata", "a0-3-v-agua", "a0-3-v-cafe"],
      grammarRefs: ["a0-3-g-condicional-pedir"],
      remedialAnchorRefs: [
        {
          toUnitId: "a0-1-alfabeto-saudacoes",
          reason: "vocabulary-decay",
          note: "Voltar a ‘bom dia / por favor / obrigado’ se o Learner esquecer as cortesias.",
        },
      ],
      successCriteria: [
        "O Learner cumprimenta o empregado ao entrar.",
        "O Learner usa ‘queria’ para fazer o pedido.",
        "O Learner confirma o preço antes de pagar.",
      ],
      passingScore: 0.7,
    },
  ],
};

const A0_4_ROTINA: Unit = {
  id: "a0-4-rotina-e-horas",
  level: "A0",
  order: 4,
  title: "Rotina diária e horas",
  description:
    "Dizer as horas em português europeu, descrever a rotina de um dia de trabalho, e usar o verbo ‘estar’ em presente simples para localizar e descrever estados.",
  prerequisiteUnitIds: ["a0-3-cafe-pedidos"],
  remedialAnchors: [
    {
      fromUnitId: "a0-4-rotina-e-horas",
      toUnitId: "a0-2-numeros-apresentacoes",
      reason: "vocabulary-decay",
      note:
        "Rever os números 1–30 quando o Learner hesitar nas horas compostas (ex.: ‘vinte e uma’).",
    },
  ],
  lessons: [
    {
      id: "a0-4-l1-horas",
      unitId: "a0-4-rotina-e-horas",
      order: 1,
      kind: "vocabulary",
      title: "Que horas são?",
      estimatedMinutes: 9,
      body: {
        introduction:
          "Em Portugal pergunta-se ‘que horas são?’ e responde-se com o verbo ‘ser’ + numeral; ‘e meia’, ‘e um quarto’ e ‘menos um quarto’ cobrem os quartos de hora.",
        blocks: [
          {
            kind: "rule",
            text: "É uma hora. São duas horas. A partir do número dois, o verbo é ‘são’. A expressão ‘da manhã / da tarde / da noite’ esclarece o período.",
          },
          {
            kind: "example",
            pt: "São nove e meia da manhã.",
            gloss: "It is 9:30 in the morning.",
          },
          {
            kind: "example",
            pt: "É uma e um quarto da tarde.",
            gloss: "It is 1:15 in the afternoon.",
          },
          {
            kind: "example",
            pt: "São sete menos um quarto.",
            gloss: "It is a quarter to seven.",
          },
        ],
      },
      exercises: [
        {
          id: "a0-4-l1-e1",
          lessonId: "a0-4-l1-horas",
          kind: "flashcard",
          prompt: "meia",
          expectedAnswer: "half (hour)",
          difficulty: "easy",
          vocabularyRefs: ["a0-4-v-meia"],
          grammarRefs: ["a0-4-g-hora"],
        },
        {
          id: "a0-4-l1-e2",
          lessonId: "a0-4-l1-horas",
          kind: "fill-in",
          prompt: "São três ______ da tarde. (15:00)",
          expectedAnswer: "horas",
          difficulty: "easy",
          vocabularyRefs: [],
          grammarRefs: ["a0-4-g-hora"],
        },
        {
          id: "a0-4-l1-e3",
          lessonId: "a0-4-l1-horas",
          kind: "pronunciation-drill",
          prompt: "Diz: ‘São dez e um quarto da noite.’",
          difficulty: "core",
          vocabularyRefs: [],
          grammarRefs: ["a0-4-g-hora"],
        },
      ],
    },
    {
      id: "a0-4-l2-rotina",
      unitId: "a0-4-rotina-e-horas",
      order: 2,
      kind: "vocabulary",
      title: "A minha rotina",
      estimatedMinutes: 8,
      body: {
        introduction:
          "As três refeições portuguesas têm nomes próprios — pequeno-almoço, almoço e jantar — e cada uma tem o seu lugar no relógio do dia.",
        blocks: [
          {
            kind: "rule",
            text: "Acordo às sete. Tomo o pequeno-almoço às oito. Almoço ao meio-dia. Janto às oito. A forma padrão é verbo na 1.ª pessoa + preposição ‘a’ + hora.",
          },
          {
            kind: "example",
            pt: "Acordo às sete e tomo o pequeno-almoço às oito.",
            gloss: "I wake up at seven and have breakfast at eight.",
          },
          {
            kind: "example",
            pt: "Janto tarde, por volta das nove.",
            gloss: "I eat dinner late, around nine.",
          },
        ],
      },
      exercises: [
        {
          id: "a0-4-l2-e1",
          lessonId: "a0-4-l2-rotina",
          kind: "flashcard",
          prompt: "pequeno-almoço",
          expectedAnswer: "breakfast",
          difficulty: "easy",
          vocabularyRefs: ["a0-4-v-pequeno-almoco"],
          grammarRefs: [],
        },
        {
          id: "a0-4-l2-e2",
          lessonId: "a0-4-l2-rotina",
          kind: "free-response",
          prompt: "A que horas tomas o pequeno-almoço? Responde com uma frase completa.",
          difficulty: "core",
          vocabularyRefs: ["a0-4-v-pequeno-almoco"],
          grammarRefs: [],
        },
      ],
    },
    {
      id: "a0-4-l3-estar",
      unitId: "a0-4-rotina-e-horas",
      order: 3,
      kind: "grammar",
      title: "Onde estou? O que estou a fazer?",
      estimatedMinutes: 7,
      body: {
        introduction:
          "O verbo ‘estar’ serve para duas coisas: dizer onde estamos (localização) e descrever uma acção em curso (estar a + infinitivo).",
        blocks: [
          {
            kind: "rule",
            text: "Estou em casa. Estou no escritório. Estou a trabalhar. Estou a estudar. A construção ‘estar a + infinitivo’ indica acção em curso no momento presente.",
          },
          {
            kind: "example",
            pt: "Estou a trabalhar em Lisboa, mas agora estou em casa.",
            gloss: "I work in Lisbon, but right now I'm at home.",
          },
          {
            kind: "example",
            pt: "A que horas estás a sair?",
            gloss: "What time are you leaving?",
          },
        ],
      },
      exercises: [
        {
          id: "a0-4-l3-e1",
          lessonId: "a0-4-l3-estar",
          kind: "fill-in",
          prompt: "Agora ______ a trabalhar. (estar, 1.ª pessoa)",
          expectedAnswer: "estou",
          difficulty: "easy",
          vocabularyRefs: [],
          grammarRefs: ["a0-4-g-estar"],
        },
        {
          id: "a0-4-l3-e2",
          lessonId: "a0-4-l3-estar",
          kind: "role-play",
          prompt: "Um amigo telefona. Diz onde estás e o que estás a fazer.",
          difficulty: "core",
          vocabularyRefs: ["a0-4-v-casa", "a0-4-v-escritorio"],
          grammarRefs: ["a0-4-g-estar"],
        },
      ],
    },
  ],
  vocabulary: [
    {
      id: "a0-4-v-meia",
      unitId: "a0-4-rotina-e-horas",
      pt: "meia",
      gloss: "half (hour)",
      partOfSpeech: "noun",
      examplePt: "São cinco e meia.",
      exampleGloss: "It is 5:30.",
    },
    {
      id: "a0-4-v-quarto",
      unitId: "a0-4-rotina-e-horas",
      pt: "quarto",
      gloss: "quarter (hour)",
      partOfSpeech: "noun",
      examplePt: "São dez e um quarto.",
      exampleGloss: "It is 10:15.",
    },
    {
      id: "a0-4-v-pequeno-almoco",
      unitId: "a0-4-rotina-e-horas",
      pt: "pequeno-almoço",
      gloss: "breakfast (Portuguese main morning meal)",
      partOfSpeech: "noun",
      examplePt: "Tomo o pequeno-almoço às oito.",
      exampleGloss: "I have breakfast at eight.",
    },
    {
      id: "a0-4-v-almoco",
      unitId: "a0-4-rotina-e-horas",
      pt: "almoço",
      gloss: "lunch",
      partOfSpeech: "noun",
    },
    {
      id: "a0-4-v-jantar",
      unitId: "a0-4-rotina-e-horas",
      pt: "jantar",
      gloss: "dinner",
      partOfSpeech: "noun",
      examplePt: "Janto às oito.",
      exampleGloss: "I have dinner at eight.",
    },
    {
      id: "a0-4-v-acordar",
      unitId: "a0-4-rotina-e-horas",
      pt: "acordar",
      gloss: "to wake up",
      partOfSpeech: "verb",
      examplePt: "Acordo às sete.",
      exampleGloss: "I wake up at seven.",
    },
    {
      id: "a0-4-v-trabalhar",
      unitId: "a0-4-rotina-e-horas",
      pt: "trabalhar",
      gloss: "to work",
      partOfSpeech: "verb",
      examplePt: "Estou a trabalhar.",
      exampleGloss: "I am working.",
    },
    {
      id: "a0-4-v-casa",
      unitId: "a0-4-rotina-e-horas",
      pt: "casa",
      gloss: "home, house",
      partOfSpeech: "noun",
      examplePt: "Estou em casa.",
      exampleGloss: "I am at home.",
    },
    {
      id: "a0-4-v-escritorio",
      unitId: "a0-4-rotina-e-horas",
      pt: "escritório",
      gloss: "office",
      partOfSpeech: "noun",
      examplePt: "Estou no escritório.",
      exampleGloss: "I am at the office.",
    },
    {
      id: "a0-4-v-noite",
      unitId: "a0-4-rotina-e-horas",
      pt: "noite",
      gloss: "night",
      partOfSpeech: "noun",
      examplePt: "Boa noite!",
      exampleGloss: "Good night!",
    },
  ],
  grammar: [
    {
      id: "a0-4-g-hora",
      unitId: "a0-4-rotina-e-horas",
      name: "Dizer as horas",
      description:
        "‘É uma hora’ (singular) e ‘são X horas’ (plural). Os quartos acrescentam ‘e um quarto / e meia / menos um quarto’. ‘Da manhã / da tarde / da noite’ indica o período do dia.",
      examples: [
        { pt: "É uma hora.", gloss: "It is one o'clock." },
        { pt: "São três e meia da tarde.", gloss: "It is 3:30 in the afternoon." },
        { pt: "São oito menos um quarto da noite.", gloss: "It is a quarter to eight in the evening." },
      ],
    },
    {
      id: "a0-4-g-estar",
      unitId: "a0-4-rotina-e-horas",
      name: "Estar em presente: localização e acção em curso",
      description:
        "Estou (1.ª p. sing.), estás, está, estamos, estão. Para localização: ‘estar em / no / na + lugar’. Para acção em curso: ‘estar a + infinitivo’.",
      examples: [
        { pt: "Estou em casa.", gloss: "I am at home." },
        { pt: "Estou a trabalhar.", gloss: "I am working." },
        { pt: "Onde estás?", gloss: "Where are you?" },
      ],
    },
    {
      id: "a0-4-g-rotina",
      unitId: "a0-4-rotina-e-horas",
      name: "Verbos da rotina na 1.ª pessoa",
      description:
        "Acordo (acordar), almoço (almoçar), janto (jantar). A preposição ‘a’ liga o verbo à hora: ‘almoço ao meio-dia’, ‘janto às oito’.",
      examples: [
        { pt: "Acordo às sete.", gloss: "I wake up at seven." },
        { pt: "Almoço ao meio-dia.", gloss: "I have lunch at noon." },
      ],
    },
  ],
  scenarios: [
    {
      id: "a0-4-s-plano-amanha",
      unitId: "a0-4-rotina-e-horas",
      goal: "Combinares com um colega português a hora de um encontro para amanhã e descreve a tua rotina actual.",
      setting: "Mensagem de telemóvel entre dois colegas que vão ter um café amanhã.",
      roles: {
        learner: "Trabalhador estrangeiro a marcar um encontro.",
        teacher: "Colega português paciente que propõe e confirma horários.",
      },
      successCriteria: [
        "O Learner propõe duas janelas horárias com números e horas correctos (ex.: ‘dez da manhã’).",
        "O Learner refere pelo menos duas refeições (pequeno-almoço, almoço ou jantar).",
        "O Learner usa ‘estar a’ + infinitivo para descrever o que está a fazer hoje.",
      ],
    },
  ],
};

export const A0_CURRICULUM: Curriculum = {
  dialect: "pt-PT",
  units: [A0_1_ALPHABET, A0_2_NUMEROS, A0_3_CAFE, A0_4_ROTINA],
  entryUnitId: "a0-1-alfabeto-saudacoes",
  milestones: [
    {
      boundary: "A0-A1",
      fromLevel: "A0",
      toLevel: "A1",
      unitId: "a0-4-rotina-e-horas",
      passingScore: 0.75,
      itemCount: { min: 15, max: 25 },
      cooldownHours: 24,
      maxAttemptsBeforeReferral: 3,
    },
  ],
};
