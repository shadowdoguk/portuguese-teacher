"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  A0_CURRICULUM,
  indexCurriculum,
  type Level,
  type LevelBoundary,
} from "@/lib/curriculum";
import {
  ASSESSMENT_LIMITS,
  AssessmentError,
  buildAssessmentOutcome,
  collectAssessmentPool,
  countAttemptsForBoundary,
  extendAssessmentItems,
  getAssessmentStore,
  isEligibleForMilestone,
  isLevelBoundary,
  milestoneByBoundary,
  newAssessmentAttemptId,
  newReferralId,
  nextUnitAfterMilestone,
  shouldTerminateAssessment,
  startAssessmentSession,
  weakestSkill,
  type AssessmentAnswer,
  type AssessmentItem,
  type AssessmentItemScore,
} from "@/lib/assessment";
import { useAuth } from "@/lib/auth/useAuth";

type Phase = "loading" | "missing" | "ineligible" | "error" | "running" | "outcome";
type IneligibleReason =
  | "no-milestone"
  | "learner-not-at-fromLevel"
  | "cooldown-active"
  | "already-passed"
  | "referred";

const SKILL_LABEL: Record<"listening" | "reading" | "writing" | "speaking", string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

export default function AssessBoundaryPage({
  params,
}: {
  params: { boundary: string };
}) {
  const router = useRouter();
  const { user } = useAuth();
  const boundary = params.boundary;
  const [phase, setPhase] = useState<Phase>("loading");
  const [ineligibleReason, setIneligibleReason] = useState<IneligibleReason>(
    "no-milestone",
  );
  const [nextEligibleAt, setNextEligibleAt] = useState<string>("");
  const [referralMessage, setReferralMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [milestoneBoundary, setMilestoneBoundary] = useState<LevelBoundary | null>(null);
  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [outcome, setOutcome] = useState<ReturnType<typeof buildAssessmentOutcome> | null>(null);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      setPhase("missing");
      return;
    }
    if (!isLevelBoundary(boundary)) {
      setErrorMessage(`Unknown boundary: ${boundary}`);
      setPhase("error");
      return;
    }
    const typedBoundary = boundary as LevelBoundary;
    setMilestoneBoundary(typedBoundary);

    const milestone = milestoneByBoundary(A0_CURRICULUM, typedBoundary);
    const store = getAssessmentStore();
    const attempts = store.attemptsForLearner(user.id);
    const referrals = store.referralsForLearner(user.id);
    const eligibility = isEligibleForMilestone(user, milestone, attempts, referrals);

    if (eligibility.eligible && milestone) {
      try {
        const session = startAssessmentSession(A0_CURRICULUM, milestone);
        setItems(session);
        setCurrentIndex(0);
        setAnswers([]);
        setPhase("running");
        return;
      } catch (cause) {
        setErrorMessage(
          cause instanceof AssessmentError
            ? cause.message
            : "Milestone assessment is unavailable right now.",
        );
        setPhase("error");
        return;
      }
    }

    if (eligibility.reason === "cooldown-active" && eligibility.nextEligibleAt) {
      setNextEligibleAt(eligibility.nextEligibleAt);
    }
    if (eligibility.referral) {
      const when = new Date(eligibility.referral.triggeredAt).toLocaleString();
      setReferralMessage(
        `Tutor referral was triggered on ${when} after ${eligibility.referral.attemptCount} failed attempts.`,
      );
    }
    setIneligibleReason(eligibility.reason as IneligibleReason);
    setPhase("ineligible");
  }, [user, router, boundary]);

  const poolSize = useMemo(
    () => (milestoneBoundary ? collectAssessmentPool(A0_CURRICULUM, milestoneBoundary).length : 0),
    [milestoneBoundary],
  );

  const runningMilestone = milestoneBoundary
    ? milestoneByBoundary(A0_CURRICULUM, milestoneBoundary)
    : undefined;

  if (phase === "loading") {
    return (
      <div className="space-y-6">
        <span className="stage-stamp">Milestone</span>
        <p className="text-pretty text-ink-soft">Loading…</p>
      </div>
    );
  }

  if (phase === "missing" || !user) {
    return (
      <div className="space-y-6">
        <span className="stage-stamp">Milestone</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          Sign in to take the Milestone.
        </h1>
        <Link href="/log-in" className="btn-primary inline-flex">
          Log in →
        </Link>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="space-y-6">
        <span className="stage-stamp">Milestone</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          Milestone is unavailable.
        </h1>
        <p role="alert" className="text-pretty text-terracotta-deep">
          {errorMessage}
        </p>
        <Link href="/dashboard" className="btn-ghost inline-flex">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (phase === "ineligible") {
    return (
      <IneligibleScreen
        boundary={milestoneBoundary ?? boundary}
        reason={ineligibleReason}
        nextEligibleAt={nextEligibleAt}
        referralMessage={referralMessage}
        onContinue={() => router.replace("/dashboard")}
      />
    );
  }

  if (phase === "outcome" && outcome && milestoneBoundary) {
    return (
      <OutcomeScreen
        boundary={milestoneBoundary}
        learnerId={user.id}
        items={items}
        answers={answers}
        outcome={outcome}
        poolSize={poolSize}
        onAdvance={() => router.replace("/dashboard")}
      />
    );
  }

  const currentItem = items[currentIndex];
  if (!currentItem) {
    return null;
  }
  const progress = Math.min(1, answers.length / ASSESSMENT_LIMITS.max);

  function handleAnswer(score: AssessmentItemScore) {
    if (!currentItem) return;
    const nextAnswers: AssessmentAnswer[] = [
      ...answers,
      {
        itemId: currentItem.id,
        score,
        answeredAt: new Date().toISOString(),
      },
    ];
    setAnswers(nextAnswers);

    const milestone = runningMilestone;
    if (!milestone) {
      setErrorMessage("Milestone not found.");
      setPhase("error");
      return;
    }
    const nextIndex = currentIndex + 1;

    if (shouldTerminateAssessment(items, nextAnswers)) {
      finalize(items, nextAnswers, milestone);
      return;
    }
    if (nextIndex >= items.length) {
      const extended = extendAssessmentItems(A0_CURRICULUM, milestone, items, nextAnswers);
      if (extended.length > items.length) {
        setItems(extended);
        return;
      }
      finalize(extended, nextAnswers, milestone);
      return;
    }
    setCurrentIndex(nextIndex);
  }

  function finalize(
    finalItems: ReadonlyArray<AssessmentItem>,
    finalAnswers: ReadonlyArray<AssessmentAnswer>,
    milestone: ReturnType<typeof milestoneByBoundary> & object,
  ) {
    const idx = indexCurriculum(A0_CURRICULUM);
    const result = buildAssessmentOutcome(milestone, idx, finalItems, finalAnswers);
    setItems([...finalItems]);
    setAnswers([...finalAnswers]);
    setOutcome(result);
    setPhase("outcome");
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <span className="stage-stamp">Milestone · {milestoneBoundary}</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          Let&apos;s see if you&apos;re ready for the next level.
        </h1>
        <p className="max-w-2xl text-pretty text-ink-soft">
          {ASSESSMENT_LIMITS.min}–{ASSESSMENT_LIMITS.max} items balanced across listening, reading,
          writing, and speaking. The pass mark is{" "}
          {Math.round((runningMilestone?.passingScore ?? 0) * 100)}%.
        </p>
      </header>

      <section
        aria-label="Assessment progress"
        className="card-surface flex items-center gap-4"
      >
        <div className="grow space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-mute">
            <span>
              Item {Math.min(currentIndex + 1, items.length)} of {ASSESSMENT_LIMITS.max}
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
          Tap the answer that best matches your response. Be honest — items adapt to your level.
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

function IneligibleScreen({
  boundary,
  reason,
  nextEligibleAt,
  referralMessage,
  onContinue,
}: {
  boundary: string;
  reason: IneligibleReason;
  nextEligibleAt: string;
  referralMessage: string;
  onContinue: () => void;
}) {
  const titleByReason: Record<IneligibleReason, string> = {
    "no-milestone": "No Milestone at this boundary.",
    "learner-not-at-fromLevel": "This Milestone isn&apos;t for your current level.",
    "cooldown-active": "Cooldown active — try again later.",
    "already-passed": "You already passed this Milestone.",
    referred: "A tutor referral is on file for this Milestone.",
  };
  const bodyByReason: Record<IneligibleReason, string> = {
    "no-milestone": `No milestone is registered for boundary ${boundary}.`,
    "learner-not-at-fromLevel": "You need to be at the level below this boundary before taking it.",
    "cooldown-active": nextEligibleAt
      ? `You can retake this Milestone after ${new Date(nextEligibleAt).toLocaleString()}.`
      : "You can retake this Milestone after the 24-hour cooldown.",
    "already-passed": "You&apos;ve already cleared this Milestone — no need to take it again.",
    referred: referralMessage || "A tutor referral has been recorded for this boundary.",
  };
  return (
    <section className="space-y-6">
      <span className="stage-stamp">Milestone · {boundary}</span>
      <h1 className="text-display-lg font-display font-light text-pretty">
        {titleByReason[reason]}
      </h1>
      <p className="max-w-2xl text-pretty text-ink-soft" dangerouslySetInnerHTML={{ __html: bodyByReason[reason] }} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={onContinue}>
          Back to dashboard
        </button>
        {reason === "referred" ? (
          <Link href="/progress" className="btn-ghost">
            See referral details →
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function OutcomeScreen({
  boundary,
  learnerId,
  outcome,
  poolSize,
  onAdvance,
}: {
  boundary: LevelBoundary;
  learnerId: string;
  items: ReadonlyArray<AssessmentItem>;
  answers: ReadonlyArray<AssessmentAnswer>;
  outcome: ReturnType<typeof buildAssessmentOutcome>;
  poolSize: number;
  onAdvance: () => void;
}) {
  const index = indexCurriculum(A0_CURRICULUM);
  const milestone = milestoneByBoundary(A0_CURRICULUM, boundary);
  const store = getAssessmentStore();
  const attemptsForBoundary = store.attemptsForBoundary(learnerId, boundary);
  const counted = countAttemptsForBoundary(
    [...attemptsForBoundary, {
      id: newAssessmentAttemptId(),
      learnerId,
      boundary,
      attemptedAt: new Date().toISOString(),
      score: outcome.overallScore,
      passed: outcome.passed,
      recommendedAnchorUnitIds: outcome.recommendedAnchorUnitIds,
      perSkillScores: outcome.perSkillScores,
    }],
    boundary,
    learnerId,
  );
  const nextUnit = milestone ? nextUnitAfterMilestone(index, milestone) : undefined;
  const weakest = weakestSkill(outcome.perSkillScores);
  const [recorded, setRecorded] = useState(false);
  const acceptButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    acceptButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (recorded) return;
    if (!milestone) return;
    const attemptId = newAssessmentAttemptId();
    store.recordAttempt({
      id: attemptId,
      learnerId,
      boundary,
      attemptedAt: new Date().toISOString(),
      score: outcome.overallScore,
      passed: outcome.passed,
      recommendedAnchorUnitIds: outcome.recommendedAnchorUnitIds,
      perSkillScores: outcome.perSkillScores,
      notes: `pool=${poolSize}; weakest=${weakest}`,
    });
    if (!outcome.passed && counted.remainingBeforeReferral === 0) {
      store.recordReferral({
        id: newReferralId(),
        learnerId,
        boundary,
        triggeredAt: new Date().toISOString(),
        attemptCount: counted.failedAfterAnchorExhaustion,
        reason: "max-attempts-after-anchor-exhaustion",
        notes: `score=${outcome.overallScore.toFixed(2)}; anchors=${outcome.recommendedAnchorUnitIds.length}`,
      });
    }
    setRecorded(true);
  }, [
    recorded,
    learnerId,
    boundary,
    outcome,
    poolSize,
    weakest,
    milestone,
    counted.remainingBeforeReferral,
    counted.failedAfterAnchorExhaustion,
    store,
  ]);

  if (!milestone) {
    return null;
  }

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <span className="stage-stamp">Milestone outcome · {boundary}</span>
        <h2 className="text-display-md font-display font-light text-pretty">
          {outcome.passed ? "You passed — next level unlocked." : "Not quite — let&apos;s revisit the gaps."}
        </h2>
        <p className="text-pretty text-ink-soft">
          Score {Math.round(outcome.overallScore * 100)}% — pass mark {Math.round(milestone.passingScore * 100)}%.
        </p>
      </header>

      <article className="card-surface space-y-6">
        <dl className="grid gap-4 sm:grid-cols-5">
          <SkillBar label="Listening" score={outcome.perSkillScores.listening} />
          <SkillBar label="Reading" score={outcome.perSkillScores.reading} />
          <SkillBar label="Writing" score={outcome.perSkillScores.writing} />
          <SkillBar label="Speaking" score={outcome.perSkillScores.speaking} />
          <SkillBar label="Overall" score={outcome.overallScore} highlight />
        </dl>

        <p className="text-xs text-ink-mute">Rationale: {outcome.rationale}</p>

        {outcome.passed ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              ref={acceptButtonRef}
              type="button"
              className="btn-primary"
              onClick={onAdvance}
            >
              Continue to next level →
            </button>
            {!nextUnit ? (
              <p className="text-xs text-ink-mute">
                No Units at the {milestone.toLevel} level are seeded yet — you&apos;ll stay at
                your current Unit until they land.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink-soft">
              We&apos;ve routed you to {outcome.recommendedAnchorUnitIds.length} Remedial
              Anchor{outcome.recommendedAnchorUnitIds.length === 1 ? "" : "s"} based on the
              weakest skill ({weakest}). Re-attempt is available after {milestone.cooldownHours}h.
            </p>
            <p className="text-xs text-ink-mute">
              {counted.failedAfterAnchorExhaustion} failure{counted.failedAfterAnchorExhaustion === 1 ? "" : "s"} after
              anchor exhaustion. {counted.remainingBeforeReferral === 0
                ? "A tutor referral has been recorded."
                : `${counted.remainingBeforeReferral} more before tutor referral.`}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                ref={acceptButtonRef}
                type="button"
                className="btn-primary"
                onClick={onAdvance}
              >
                Back to dashboard
              </button>
              <Link href="/progress" className="btn-ghost">
                See attempt history →
              </Link>
            </div>
          </div>
        )}
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
