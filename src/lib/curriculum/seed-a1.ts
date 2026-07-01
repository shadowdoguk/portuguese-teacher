import type { Curriculum, Unit } from "./types";
import { scenariosForUnit } from "./scenarios-extended";

const A1_1_VIAGENS: Unit = {
  id: "a1-1-viagens",
  level: "A1",
  order: 1,
  title: "Viajar em Portugal",
  description:
    "Navegar situações de viagem: aeroporto, táxi, hotel, estação, e pedir ajuda a um transeunte.",
  prerequisiteUnitIds: [],
  remedialAnchors: [],
  lessons: [
    {
      id: "a1-1-l1-aeroporto",
      unitId: "a1-1-viagens",
      order: 1,
      kind: "vocabulary",
      title: "No aeroporto",
      estimatedMinutes: 12,
      body: {
        introduction:
          "Do check-in à porta de embarque: o vocabulário essencial para voar com confiança.",
        blocks: [
          {
            kind: "rule",
            text: "O ‘cartão de embarque’ é o documento que te dá acesso ao avião; o passaporte é a tua identificação internacional.",
          },
          {
            kind: "example",
            pt: "O meu voo sai às 14h30. Onde é o portão de embarque?",
            gloss: "‘Voo’ = flight; ‘portão de embarque’ = boarding gate.",
          },
        ],
      },
      exercises: [
        {
          id: "a1-1-l1-e1",
          lessonId: "a1-1-l1-aeroporto",
          kind: "listen-and-repeat",
          prompt: "Repete: ‘Onde é o portão de embarque?’",
          difficulty: "easy",
          vocabularyRefs: [],
          grammarRefs: [],
        },
      ],
    },
  ],
  vocabulary: [],
  grammar: [],
  scenarios: scenariosForUnit("a1-1-viagens"),
};

const A1_2_ALIMENTACAO: Unit = {
  id: "a1-2-alimentacao",
  level: "A1",
  order: 2,
  title: "Comer fora e fazer compras",
  description:
    "Pedir comida em restaurantes e cafés, comprar roupa e mercearia, e gerir a conta.",
  prerequisiteUnitIds: [],
  remedialAnchors: [],
  lessons: [
    {
      id: "a1-2-l1-restaurante",
      unitId: "a1-2-alimentacao",
      order: 1,
      kind: "vocabulary",
      title: "Pedir num restaurante",
      estimatedMinutes: 10,
      body: {
        introduction:
          "Os verbos ‘querer’, ‘pedir’, ‘pagar’ e a forma educada de os usar.",
        blocks: [
          {
            kind: "rule",
            text: "‘Queria’ é mais educado do que ‘quero’ num restaurante.",
          },
          {
            kind: "example",
            pt: "Queria um café, por favor.",
            gloss: "Forma cortês de pedir.",
          },
        ],
      },
      exercises: [],
    },
  ],
  vocabulary: [],
  grammar: [],
  scenarios: scenariosForUnit("a1-2-alimentacao"),
};

export const A1_CURRICULUM: Curriculum = {
  dialect: "pt-PT",
  units: [A1_1_VIAGENS, A1_2_ALIMENTACAO],
  entryUnitId: "a1-1-viagens",
  milestones: [],
};