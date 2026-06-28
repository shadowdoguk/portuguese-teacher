export const CALIBRATION_REFERENCES: ReadonlyArray<string> = [
  "olá, bom dia",
  "como estás hoje",
  "eu sou estudante",
  "este é o meu amigo",
  "obrigado pela ajuda",
  "até logo, adeus",
  "posso pedir um café",
  "onde é a estação",
  "tenho uma reunião",
  "vamos começar agora",
];

export function buildCalibrationOffset(selfScores: ReadonlyArray<number>): number {
  if (selfScores.length === 0) return 0;
  const mean = selfScores.reduce((acc, value) => acc + value, 0) / selfScores.length;
  return Math.round(100 - mean);
}

export function normalizeAgainstBaseline(rawScore: number, offset: number): number {
  const adjusted = rawScore + offset;
  if (!Number.isFinite(adjusted)) return 0;
  if (adjusted < 0) return 0;
  if (adjusted > 100) return 100;
  return Math.round(adjusted);
}

export function computeCalibratedScore(rawScore: number, offset: number): number {
  return normalizeAgainstBaseline(rawScore, offset);
}