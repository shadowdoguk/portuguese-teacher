"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { A0_CURRICULUM, indexCurriculum, type Level } from "@/lib/curriculum";
import {
  PLACEMENT_LIMITS,
  buildPlacementOutcome,
  collectPlacementPool,
  computeSkillScores,
  extendPlacementItems,
  getPlacementStore,
  newPlacementAttemptId,
  overallScore,
  requiresPlacement,
  shouldTerminate,
  startPlacementSession,
  type PlacementAnswer,
  type PlacementItem,
  type PlacementItemScore,
} from "@/lib/placement";
import { useAuth } from "@/lib/auth/useAuth";

type Phase = "loading" | "missing" | "running" | "outcome";

const SKILL_LABEL: Record<"listening" | "reading" | "speaking", string> = {
  listening: "Listening",
  reading: "Reading",
  speaking: "Speaking",
};

export default function PlacementPage() {
  const router = useRouter();
  const { user, setCurrentUnit } = useAuth();
  const [phase, setPhase] = useState<Phase>("loading");
  const [items, setItems] = useState<PlacementItem[]>([]);
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      setPhase("missing");
      return;
    }
    if (!user.selfAssessedLevel || !requiresPlacement(user.selfAssessedLevel)) {
      router.replace("/dashboard");
      return;
    }
    const session = startPlacementSession(A0_CURRICULUM, user.selfAssessedLevel);
    setItems(session);
    setCurrentIndex(0);
    setAnswers([]);
    setPhase("running");
  }, [user, router]);

  const poolSize = useMemo(() => collectPlacementPool(A0_CURRICULUM).length, []);

  if (phase === "loading") {
    return (
      <div className="space-y-6">
        <span className="stage-stamp">Placement</span>
        <p className="text-pretty text-ink-soft">Loading…</p>
      </div>
    );
  }

  if (phase === "missing" || !user || !user.selfAssessedLevel) {
    return (
      <div className="space-y-6">
        <span className="stage-stamp">Placement</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          Sign in to continue.
        </h1>
        <p className="text-pretty text-ink-soft">
          Sign in to take the Placement Lesson.
        </p>
        <Link href="/log-in" className="btn-primary inline-flex">
          Log in →
        </Link>
      </div>
    );
  }

  if (phase === "outcome") {
    return (
      <OutcomeScreen
        items={items}
        answers={answers}
        selfAssessedLevel={user.selfAssessedLevel}
        learnerId={user.id}
        poolSize={poolSize}
        onConfirm={(unitId, level) => {
          setCurrentUnit(unitId, level);
          router.replace("/dashboard");
        }}
      />
    );
  }

  const currentItem = items[currentIndex];
  if (!currentItem) {
    setPhase("outcome");
    return null;
  }

  const progress = Math.min(1, answers.length / PLACEMENT_LIMITS.max);

  function handleAnswer(score: PlacementItemScore) {
    if (!currentItem) return;
    const nextAnswers: PlacementAnswer[] = [
      ...answers,
      {
        itemId: currentItem.id,
        score,
        answeredAt: new Date().toISOString(),
      },
    ];
    setAnswers(nextAnswers);

    const nextIndex = currentIndex + 1;

    if (shouldTerminate(items, nextAnswers)) {
      setPhase("outcome");
      return;
    }

    if (nextIndex >= items.length) {
      const extended = extendPlacementItems(A0_CURRICULUM, items, nextAnswers);
      if (extended.length > items.length) {
        setItems(extended);
        return;
      }
      setPhase("outcome");
      return;
    }

    setCurrentIndex(nextIndex);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <span className="stage-stamp">Placement</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          Let&apos;s see where you are.
        </h1>
        <p className="max-w-2xl text-pretty text-ink-soft">
          You self-assessed as <strong>{user.selfAssessedLevel}</strong>. We&apos;ll start
          there and shift up or down depending on how each item goes. The lesson adapts as
          you answer.
        </p>
      </header>

      <section
        aria-label="Placement progress"
        className="card-surface flex items-center gap-4"
      >
        <div className="grow space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-mute">
            <span>
              Item {Math.min(currentIndex + 1, items.length)} of {PLACEMENT_LIMITS.max}
            </span>
            <span>{answers.length} answered</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={progress}
            className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10"
          >
            <div
              className="h-full bg-terracotta transition-[width] duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </section>

      <article className="card-surface space-y-6">
        <div className="flex items-center gap-2 text-xs text-ink-mute">
          <span className="stage-stamp">{SKILL_LABEL[currentItem.skill]}</span>
          <span aria-hidden>·</span>
          <span>{currentItem.kind}</span>
        </div>
        <p className="text-display-sm font-display font-light text-pretty">
          {currentItem.prompt}
        </p>
        <p className="text-sm text-ink-soft">
          Tap the answer that best matches how you responded. Be honest — the lesson adapts
          to your level.
        </p>
        <div className="flex flex-wrap gap-3">
          <AnswerButton label="Missed it" tone="ghost" onClick={() => handleAnswer(0)} />
          <AnswerButton label="Partially" tone="soft" onClick={() => handleAnswer(0.5)} />
          <AnswerButton label="Got it" tone="primary" onClick={() => handleAnswer(1)} />
        </div>
      </article>
    </div>
  );
}

function AnswerButton({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: "primary" | "soft" | "ghost";
  onClick: () => void;
}) {
  const cls =
    tone === "primary" ? "btn-primary" : tone === "soft" ? "btn-soft" : "btn-ghost";
  return (
    <button type="button" onClick={onClick} className={`${cls} px-5 py-3 text-sm`}>
      {label}
    </button>
  );
}

function OutcomeScreen({
  items,
  answers,
  selfAssessedLevel,
  learnerId,
  poolSize,
  onConfirm,
}: {
  items: ReadonlyArray<PlacementItem>;
  answers: ReadonlyArray<PlacementAnswer>;
  selfAssessedLevel: Exclude<Level, "A0">;
  learnerId: string;
  poolSize: number;
  onConfirm: (unitId: string, level: Level) => void;
}) {
  const index = indexCurriculum(A0_CURRICULUM);
  const outcome = buildPlacementOutcome(A0_CURRICULUM, index, selfAssessedLevel, items, answers);
  const perSkill = computeSkillScores(items, answers);
  const overall = overallScore(perSkill);
  const recommendedUnit = A0_CURRICULUM.units.find((u) => u.id === outcome.recommendedStartUnitId);

  function recordAttempt(confirmedStartUnitId: string, learnerAccepted: boolean) {
    if (!learnerId) return;
    const store = getPlacementStore();
    store.record({
      id: newPlacementAttemptId(),
      learnerId,
      attemptedAt: new Date().toISOString(),
      selfAssessedLevel,
      score: overall,
      recommendedStartUnitId: outcome.recommendedStartUnitId,
      confirmedStartUnitId,
      notes: `accepted=${learnerAccepted}; pool=${poolSize}`,
    });
  }

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <span className="stage-stamp">Placement outcome</span>
        <h2 className="text-display-md font-display font-light text-pretty">
          We&apos;d suggest you start here.
        </h2>
        <p className="text-pretty text-ink-soft">
          Based on {answers.length} items across listening, reading, and speaking, here&apos;s
          where you seem most comfortable.
        </p>
      </header>

      <article className="card-surface space-y-6">
        <div>
          <span className="stage-stamp">Recommended starting Unit</span>
          <h3 className="mt-2 text-display-sm font-display font-light text-pretty">
            {recommendedUnit?.title ?? "Curriculum entry"}
          </h3>
          <p className="mt-2 text-sm text-ink-soft">
            {recommendedUnit?.description ?? outcome.rationale}
          </p>
          <p className="mt-2 text-xs text-ink-mute">Rationale: {outcome.rationale}</p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-4">
          <SkillBar label="Listening" score={perSkill.listening} />
          <SkillBar label="Reading" score={perSkill.reading} />
          <SkillBar label="Speaking" score={perSkill.speaking} />
          <SkillBar label="Overall" score={overall} highlight />
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              recordAttempt(outcome.recommendedStartUnitId, true);
              onConfirm(outcome.recommendedStartUnitId, outcome.recommendedStartLevel);
            }}
          >
            Accept and start →
          </button>
          <UnitOverridePicker
            recommendedUnitId={outcome.recommendedStartUnitId}
            onPick={(unitId, level) => {
              recordAttempt(unitId, false);
              onConfirm(unitId, level);
            }}
          />
        </div>

        <p className="text-xs text-ink-mute">
          A0 self-assessment would skip the Placement Lesson. You chose {selfAssessedLevel},
          so we ran one.
        </p>
      </article>
    </section>
  );
}

function SkillBar({
  label,
  score,
  highlight = false,
}: {
  label: string;
  score: number;
  highlight?: boolean;
}) {
  const pct = Math.round(score * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-ink-mute">
        <span>{label}</span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
        <div
          className={highlight ? "h-full bg-terracotta" : "h-full bg-ink/40"}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function UnitOverridePicker({
  recommendedUnitId,
  onPick,
}: {
  recommendedUnitId: string;
  onPick: (unitId: string, level: Level) => void;
}) {
  const [open, setOpen] = useState(false);
  const units = A0_CURRICULUM.units;
  return (
    <div className="relative">
      <button type="button" className="btn-ghost" onClick={() => setOpen((value) => !value)}>
        Pick a different Unit
      </button>
      {open ? (
        <ul
          role="menu"
          className="card-surface absolute z-10 mt-2 max-h-64 w-72 space-y-1 overflow-auto p-3 text-sm"
        >
          {units.map((unit) => (
            <li key={unit.id}>
              <button
                type="button"
                role="menuitem"
                className="w-full rounded-md px-2 py-2 text-left hover:bg-ink/5 disabled:opacity-50"
                disabled={unit.id === recommendedUnitId}
                onClick={() => {
                  setOpen(false);
                  onPick(unit.id, unit.level);
                }}
              >
                <span className="stage-stamp">{unit.level}</span>
                <span className="mt-1 block text-ink">{unit.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
