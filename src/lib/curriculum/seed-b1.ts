import type { Curriculum, Unit } from "./types";

const B1_1_GASTRONOMIA: Unit = {
  id: "b1-1-gastronomia",
  level: "B1",
  order: 1,
  title: "Gastronomia e vinho",
  description:
    "Conversação em torno de comida e vinho: recomendar, justificar escolhas, harmonizar, e comentar com cultura.",
  prerequisiteUnitIds: [],
  remedialAnchors: [],
  lessons: [
    {
      id: "b1-1-l1-vinho",
      unitId: "b1-1-gastronomia",
      order: 1,
      kind: "vocabulary",
      title: "Vinho e gastronomia",
      estimatedMinutes: 12,
      body: {
        introduction: "Vocabulário para falar sobre vinho, gastronomia e harmonização.",
        blocks: [
          {
            kind: "rule",
            text: "‘Encorpado’ (vinho) é o equivalente português de ‘full-bodied’.",
          },
        ],
      },
      exercises: [],
    },
  ],
  vocabulary: [],
  grammar: [],
  scenarios: [],
};

const B1_2_SERVICOS: Unit = {
  id: "b1-2-servicos",
  level: "B1",
  order: 2,
  title: "Serviços e burocracia",
  description:
    "Navegar serviços públicos e privados: bancos, entrevistas de emprego, serviços de saúde, e seguros.",
  prerequisiteUnitIds: [],
  remedialAnchors: [],
  lessons: [
    {
      id: "b1-2-l1-seguros",
      unitId: "b1-2-servicos",
      order: 1,
      kind: "vocabulary",
      title: "Seguros e contratos",
      estimatedMinutes: 10,
      body: {
        introduction: "Falar sobre seguros, contratos e condições.",
        blocks: [
          {
            kind: "rule",
            text: "‘Franquia’ é o valor que o segurado paga antes do seguro cobrir o resto.",
          },
        ],
      },
      exercises: [],
    },
  ],
  vocabulary: [],
  grammar: [],
  scenarios: [],
};

export const B1_CURRICULUM: Curriculum = {
  dialect: "pt-PT",
  units: [B1_1_GASTRONOMIA, B1_2_SERVICOS],
  entryUnitId: "b1-1-gastronomia",
  milestones: [],
};