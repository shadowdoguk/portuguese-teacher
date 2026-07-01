import type { Curriculum, Unit } from "./types";
import { scenariosForUnit } from "./scenarios-extended";

const A2_1_ROTINA_TRABALHO: Unit = {
  id: "a2-1-rotina-trabalho",
  level: "A2",
  order: 1,
  title: "Rotina profissional",
  description:
    "Situações de trabalho em Portugal: reuniões, e-mail, reclamar, devolver, dividir a conta.",
  prerequisiteUnitIds: [],
  remedialAnchors: [],
  lessons: [
    {
      id: "a2-1-l1-reuniao",
      unitId: "a2-1-rotina-trabalho",
      order: 1,
      kind: "vocabulary",
      title: "Numa reunião",
      estimatedMinutes: 10,
      body: {
        introduction:
          "Frases úteis para participar numa reunião de trabalho em português.",
        blocks: [
          {
            kind: "rule",
            text: "‘Poderia repetir, por favor?’ é educado e claro.",
          },
        ],
      },
      exercises: [],
    },
  ],
  vocabulary: [],
  grammar: [],
  scenarios: scenariosForUnit("a2-1-rotina-trabalho"),
};

const A2_2_VIAGENS_SAUDE: Unit = {
  id: "a2-2-viagens-saude",
  level: "A2",
  order: 2,
  title: "Viagens, saúde e emergência",
  description:
    "Comunicar em consultas médicas, explicar alergias, e lidar com emergências em viagem.",
  prerequisiteUnitIds: [],
  remedialAnchors: [],
  lessons: [
    {
      id: "a2-2-l1-medico",
      unitId: "a2-2-viagens-saude",
      order: 1,
      kind: "vocabulary",
      title: "No médico",
      estimatedMinutes: 10,
      body: {
        introduction: "Vocabulário essencial para uma consulta de clínica geral.",
        blocks: [
          {
            kind: "rule",
            text: "‘Sinto-me…’ é a forma mais comum de começar a descrever sintomas.",
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

export const A2_CURRICULUM: Curriculum = {
  dialect: "pt-PT",
  units: [A2_1_ROTINA_TRABALHO, A2_2_VIAGENS_SAUDE],
  entryUnitId: "a2-1-rotina-trabalho",
  milestones: [],
};