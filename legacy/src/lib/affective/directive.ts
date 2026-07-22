import type { AffectiveFilterScore, Trend } from "./types";
import { describeScore } from "./scoring";

export type LlmTone = "warmer" | "neutral" | "terse";

export type AffectiveDirective = {
  tone: LlmTone;
  difficultyDrop: number;
  scaffoldingLevel: "high" | "normal" | "low";
  summary: string;
  literal: string;
};

export type AnchorVariant = "warmer" | "canonical";

export type AnchorCandidate = {
  id: string;
  variant: AnchorVariant;
};

const LOW_DIRECTIVE =
  "Affective Filter: low-engagement Learner; respond warmer, more scaffolding, drop difficulty by 0.5 sub-level.";

const HIGH_DIRECTIVE =
  "Affective Filter: high-engagement Learner; respond efficiently and concisely.";

const TREND_DIRECTIVE: Record<Trend, string> = {
  rising: "Engagement is recovering; ease scaffolding gently.",
  flat: "Engagement is stable; maintain current approach.",
  falling: "Engagement is declining; increase warmth and reduce pace.",
};

export function buildAffectiveDirective(score: AffectiveFilterScore): AffectiveDirective {
  const band = describeScore(score);
  if (band === "low") {
    return {
      tone: "warmer",
      difficultyDrop: 0.5,
      scaffoldingLevel: "high",
      summary: "low-engagement Learner",
      literal: `${LOW_DIRECTIVE} ${TREND_DIRECTIVE[score.trend]}`,
    };
  }
  if (band === "high") {
    return {
      tone: "terse",
      difficultyDrop: 0,
      scaffoldingLevel: "low",
      summary: "high-engagement Learner",
      literal: `${HIGH_DIRECTIVE} ${TREND_DIRECTIVE[score.trend]}`,
    };
  }
  return {
    tone: "neutral",
    difficultyDrop: 0,
    scaffoldingLevel: "normal",
    summary: "neutral engagement",
    literal: `Affective Filter: neutral engagement. ${TREND_DIRECTIVE[score.trend]}`,
  };
}

export function shouldInjectDirective(score: AffectiveFilterScore): boolean {
  return score.score <= 30 || score.score >= 70;
}

export function pickAnchorVariant(
  score: AffectiveFilterScore,
  candidates: AnchorCandidate[],
): AnchorCandidate | null {
  if (candidates.length === 0) return null;
  const band = describeScore(score);
  if (band === "low") {
    const warmer = candidates.find((c) => c.variant === "warmer");
    if (warmer) return warmer;
  }
  const canonical = candidates.find((c) => c.variant === "canonical");
  if (canonical) return canonical;
  return candidates[0] ?? null;
}
