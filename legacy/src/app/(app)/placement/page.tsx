"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { Card } from "@/components/ui/Card";
import { DEFAULT_SELF_ASSESSMENT, type Level } from "@/lib/auth/types";
import {
  A0_CURRICULUM,
  entryUnit,
  indexCurriculum,
  LEVELS as CURRICULUM_LEVELS,
  unitsAtLevel,
} from "@/lib/curriculum";
import {
  PLACEMENT_LIMITS,
  buildPlacementOutcome,
  buildConfirmOutcome,
  collectPlacementPool,
  extendPlacementItems,
  newPlacementAttemptId,
  placementItem,
  shouldTerminate,
  startPlacementSession,
  type PlacementAnswer,
  type PlacementItem,
  type PlacementItemScore,
  type PlacementOutcome,
} from "@/lib/placement";

const CURRICULUM_INDEX = indexCurriculum(A0_CURRICULUM);

type Phase =
  | { kind: "intro" }
  | { kind: "running"; items: PlacementItem[]; answers: PlacementAnswer[] }
  | { kind: "outcome"; outcome: PlacementOutcome; items: PlacementItem[]; answers: PlacementAnswer[] }
  | { kind: "complete" };

export default function PlacementPage() {
  const router = useRouter();
  const { user, confirmPlacement, setCurrentUnit } = useAuth();
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [error, setError] = useState<string | null>(null);

  const target = user?.selfAssessmentLevel ?? DEFAULT_SELF_ASSESSMENT;

  if (!user) {
    return (
      <div className="space-y-8">
        <header className="space-y-2">
          <span className="stage-stamp">Placement</span>
          <h1 className="text-display-md font-display font-light text-pretty">
            Sign in to take the Placement Lesson.
          </h1>
        </header>
        <Card eyebrow="Sign in" title="Available once you have an account">
          <Link href="/log-in" className="btn-primary inline-block">
            Log in
          </Link>
        </Card>
      </div>
    );
  }

  if (target === "A0") {
    return (
      <div className="space-y-8">
        <header className="space-y-2">
          <span className="stage-stamp">Placement</span>
          <h1 className="text-display-md font-display font-light text-pretty">
            No Placement Lesson needed.
          </h1>
          <p className="max-w-2xl text-pretty text-ink-soft">
            You self-assessed as <strong>A0</strong> (absolute beginner). The
            Placement Lesson only runs for learners who self-assess above A0 —
            you&apos;ll start at the first Unit.
          </p>
        </header>
        <Link href="/dashboard" className="btn-primary inline-block">
          Back to dashboard →
        </Link>
      </div>
    );
  }

  const aboveA0 = target as Exclude<Level, "A0">;

  function startSession() {
    setError(null);
    try {
      const items = startPlacementSession(A0_CURRICULUM, aboveA0);
      setPhase({ kind: "running", items, answers: [] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to start placement.");
    }
  }

  function recordAnswer(score: PlacementItemScore) {
    if (phase.kind !== "running") return;
    const current = phase.items[phase.answers.length];
    if (!current) return;
    const answer: PlacementAnswer = {
      itemId: current.id,
      score,
      answeredAt: new Date().toISOString(),
    };
    const answers = [...phase.answers, answer];
    let items = phase.items;
    if (shouldTerminate(items, answers)) {
      const outcome = buildPlacementOutcome(
        A0_CURRICULUM,
        CURRICULUM_INDEX,
        aboveA0,
        items,
        answers,
      );
      setPhase({ kind: "outcome", outcome, items, answers });
      return;
    }
    items = extendPlacementItems(A0_CURRICULUM, items, answers);
    setPhase({ kind: "running", items, answers });
  }

  function acceptRecommendation() {
    if (phase.kind !== "outcome") return;
    const confirmed = buildConfirmOutcome(phase.outcome, { learnerAccepted: true });
    persistConfirmed(confirmed);
  }

  function overrideStart(overrideUnitId: string) {
    if (phase.kind !== "outcome") return;
    const confirmed = buildConfirmOutcome(phase.outcome, {
      learnerAccepted: false,
      overrideUnitId,
    });
    persistConfirmed(confirmed);
  }

  function persistConfirmed(
    confirmed: ReturnType<typeof buildConfirmOutcome>,
  ) {
    const attemptId = newPlacementAttemptId();
    confirmPlacement({
      attemptId,
      attemptedAt: confirmed.confirmedAt,
      selfAssessedLevel: aboveA0,
      overallScore: confirmed.overallScore,
      recommendedStartUnitId: confirmed.recommendedStartUnitId,
      recommendedStartLevel: confirmed.recommendedStartLevel,
      confirmedStartUnitId: confirmed.confirmedStartUnitId,
      confirmedStartLevel: confirmed.recommendedStartLevel,
      learnerAccepted: confirmed.learnerAccepted,
    });
    setPhase({ kind: "complete" });
  }

  if (phase.kind === "complete") {
    return (
      <div className="space-y-8">
        <header className="space-y-2">
          <span className="stage-stamp">Placement complete</span>
          <h1 className="text-display-md font-display font-light text-pretty">
            You&apos;re starting at{" "}
            <em className="font-display italic text-terracotta">
              {user.currentUnitId ?? "your recommended Unit"}
            </em>
            .
          </h1>
          <p className="max-w-2xl text-pretty text-ink-soft">
            You can revisit the Placement Lesson from your profile at any time.
          </p>
        </header>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="btn-primary"
        >
          Go to dashboard →
        </button>
      </div>
    );
  }

  if (phase.kind === "outcome") {
    return (
      <PlacementOutcomeScreen
        outcome={phase.outcome}
        aboveA0={aboveA0}
        onAccept={acceptRecommendation}
        onOverride={overrideStart}
        onCancel={() => setPhase({ kind: "intro" })}
      />
    );
  }

  if (phase.kind === "running") {
    const current = phase.items[phase.answers.length];
    if (!current) {
      return null;
    }
    const total = phase.items.length;
    const answered = phase.answers.length;
    return (
      <PlacementRunner
        item={current}
        progress={`${answered + 1} / ${total}`}
        onAnswer={recordAnswer}
        error={error}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="stage-stamp">Placement</span>
        <h1 className="text-display-md font-display font-light text-pretty">
          Confirm your starting Unit.
        </h1>
        <p className="max-w-2xl text-pretty text-ink-soft">
          You self-assessed as <strong>{target}</strong>. A short adaptive
          check across reading, listening, and writing will confirm or revise
          your starting Unit.
        </p>
      </header>

      <Card eyebrow="What to expect" title="One short lesson">
        <ul className="space-y-2 text-sm text-ink-soft">
          <li>• {PLACEMENT_LIMITS.min}–{PLACEMENT_LIMITS.max} items, 5–8 minutes</li>
          <li>• Reading, listening, writing</li>
          <li>• Adaptive — picks harder items as you go</li>
          <li>• You can override the recommendation afterwards</li>
        </ul>
        <p className="mt-4 text-xs text-ink-mute">
          Pool size: {collectPlacementPool(A0_CURRICULUM).length} eligible exercises.
        </p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={startSession} className="btn-primary">
          Start Placement Lesson
        </button>
        <Link href="/dashboard" className="btn-ghost">
          Skip for now
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setCurrentUnit(entryUnit(CURRICULUM_INDEX).id)}
          className="btn-ghost text-xs"
        >
          Or skip straight to {entryUnit(CURRICULUM_INDEX).title}
        </button>
      </div>
    </div>
  );
}

function PlacementRunner({
  item,
  progress,
  onAnswer,
  error,
}: {
  item: PlacementItem;
  progress: string;
  onAnswer: (score: PlacementItemScore) => void;
  error: string | null;
}) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="stage-stamp">Placement · in progress</span>
        <h1 className="text-display-md font-display font-light text-pretty">
          Adaptive check running…
        </h1>
        <p className="text-xs text-ink-mute">Item {progress}</p>
      </header>

      <Card eyebrow={item.skill} title={`${item.kind} · ${item.difficulty}`}>
        <p className="text-pretty text-ink">{item.prompt}</p>
        {item.expectedAnswer ? (
          <details className="mt-3 text-sm text-ink-soft">
            <summary className="cursor-pointer text-xs text-ink-mute">
              Reference answer (open only after scoring)
            </summary>
            <p className="mt-2">{item.expectedAnswer}</p>
          </details>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onAnswer(1)}
            className="btn-primary"
          >
            Got it right
          </button>
          <button
            type="button"
            onClick={() => onAnswer(0.5)}
            className="btn-ghost"
          >
            Got it partly
          </button>
          <button
            type="button"
            onClick={() => onAnswer(0)}
            className="btn-ghost"
          >
            Got it wrong
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-terracotta-deep">
            {error}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function PlacementOutcomeScreen({
  outcome,
  aboveA0,
  onAccept,
  onOverride,
  onCancel,
}: {
  outcome: PlacementOutcome;
  aboveA0: Exclude<Level, "A0">;
  onAccept: () => void;
  onOverride: (unitId: string) => void;
  onCancel: () => void;
}) {
  const overrideOptions = useMemo(() => {
    const start = CURRICULUM_LEVELS.indexOf(outcome.recommendedStartLevel);
    const seen = new Set<string>();
    const buckets: Array<{ level: Level; unitId: string; title: string }> = [];
    const push = (level: Level, unitId: string, title: string) => {
      if (seen.has(unitId)) return;
      seen.add(unitId);
      buckets.push({ level, unitId, title });
    };
    for (let offset = 0; offset <= 1; offset += 1) {
      const down = start - offset;
      const up = start + offset;
      [down, up].forEach((bucket) => {
        if (bucket < 0 || bucket >= CURRICULUM_LEVELS.length) return;
        const level = CURRICULUM_LEVELS[bucket];
        if (!level) return;
        unitsAtLevel(CURRICULUM_INDEX, level).forEach((unit) => {
          push(level, unit.id, unit.title);
        });
      });
    }
    const recommended = buckets.find(
      (entry) => entry.unitId === outcome.recommendedStartUnitId,
    );
    if (recommended) {
      return [recommended, ...buckets.filter((entry) => entry.unitId !== recommended.unitId)];
    }
    return buckets;
  }, [outcome.recommendedStartLevel, outcome.recommendedStartUnitId]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="stage-stamp">Placement · outcome</span>
        <h1 className="text-display-md font-display font-light text-pretty">
          Recommended starting Unit:{" "}
          <em className="font-display italic text-terracotta">
            {outcome.recommendedStartUnitId}
          </em>
        </h1>
        <p className="max-w-2xl text-pretty text-ink-soft">{outcome.rationale}</p>
      </header>

      <Card eyebrow="Per-skill scores" title="How you did">
        <dl className="grid gap-3 sm:grid-cols-3">
          {(["listening", "reading", "speaking"] as const).map((skill) => (
            <div key={skill}>
              <dt className="text-xs uppercase tracking-wide text-ink-mute">{skill}</dt>
              <dd className="text-display-sm font-display font-light">
                {(outcome.perSkillScores[skill] * 100).toFixed(0)}%
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink-mute">
          Overall: {(outcome.overallScore * 100).toFixed(0)}% · Self-assessment: {aboveA0}
        </p>
      </Card>

      <Card eyebrow="Override" title="Pick a different starting Unit">
        <p className="text-sm text-ink-soft">
          You can accept the recommendation or pick a different Unit if the
          adaptive check didn&apos;t quite match your level.
        </p>
        <ul className="mt-4 space-y-2">
          {overrideOptions.map((option) => (
            <li key={option.unitId} className="flex items-center justify-between gap-3">
              <span className="text-sm">
                <strong>{option.level}</strong> · {option.title}{" "}
                <span className="text-ink-mute">({option.unitId})</span>
              </span>
              <button
                type="button"
                onClick={() => onOverride(option.unitId)}
                className="btn-ghost text-xs"
                disabled={option.unitId === outcome.recommendedStartUnitId}
              >
                {option.unitId === outcome.recommendedStartUnitId
                  ? "Recommended"
                  : "Pick this"}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onAccept} className="btn-primary">
          Accept recommendation →
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Retake placement
        </button>
      </div>
    </div>
  );
}