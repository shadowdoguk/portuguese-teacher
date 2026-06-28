"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { useSettings } from "@/lib/settings";
import { Card } from "@/components/ui/Card";
import { LEARNER_GOALS, LEVELS, type Level } from "@/lib/auth/types";
import { formatStage, pluralize } from "@/lib/utils";
import { indexCurriculum, getUnit } from "@/lib/curriculum";
import { A0_CURRICULUM } from "@/lib/curriculum";

const CURRICULUM_INDEX = indexCurriculum(A0_CURRICULUM);

const NEXT_LESSON_BY_LEVEL: Record<Level, { unit: string; lesson: string; title: string; blurb: string; href: string }> = {
  A0: {
    unit: "Unit 1 · First words",
    lesson: "Lesson 3 of 8",
    title: "Saying where you're from",
    blurb: "Learn ‘sou de…’, practice the difference between ‘ser’ and ‘estar’.",
    href: "/lesson/greetings-3",
  },
  A1: {
    unit: "Unit 4 · Daily life",
    lesson: "Lesson 2 of 6",
    title: "Ordering at the café",
    blurb: "‘Um café, por favor.’ Practice polite requests and follow-ups.",
    href: "/lesson/cafe-2",
  },
  A2: {
    unit: "Unit 9 · Connected sentences",
    lesson: "Lesson 4 of 7",
    title: "Telling a story in the past",
    blurb: "Pretérito perfeito simples. Three short narratives with scaffolding.",
    href: "/lesson/past-story-4",
  },
  B1: {
    unit: "Unit 14 · Opinion",
    lesson: "Lesson 1 of 5",
    title: "Holding an opinion at dinner",
    blurb: "Connectors, hedging, and how to disagree kindly.",
    href: "/lesson/opinion-1",
  },
};

export function DashboardClient() {
  const { user } = useAuth();
  const { settings } = useSettings();

  const next = useMemo(() => {
    const level = (user?.level ?? "A0") as Level;
    return NEXT_LESSON_BY_LEVEL[level];
  }, [user?.level]);

  const goalPct = useMemo(() => {
    if (!user) return 0;
    const pct = (user.weeklyMinutes / Math.max(settings.weeklyGoalMinutes, 1)) * 100;
    return Math.min(100, Math.round(pct));
  }, [user, settings.weeklyGoalMinutes]);

  const reviewDue = useMemo(() => deriveReviewDue(user?.level ?? "A0"), [user?.level]);

  const placementStatus = useMemo(() => {
    if (!user) return null;
    const selfLevel = user.selfAssessmentLevel;
    const needsPlacement = selfLevel !== undefined && selfLevel !== "A0";
    const hasCurrentUnit = typeof user.currentUnitId === "string" && user.currentUnitId.length > 0;
    if (needsPlacement && !hasCurrentUnit) {
      return { kind: "pending" as const, selfLevel };
    }
    if (hasCurrentUnit) {
      const unit = getUnit(CURRICULUM_INDEX, user.currentUnitId!);
      return {
        kind: "placed" as const,
        unit,
        unitId: user.currentUnitId!,
        level: unit?.level,
      };
    }
    return null;
  }, [user]);

  if (!user) {
    return (
      <div className="space-y-10">
        <header className="space-y-3">
          <span className="stage-stamp">Today</span>
          <h1 className="text-display-lg font-display font-light text-pretty">
            Bom dia. <span className="text-ink-mute">Sign in to see your plan.</span>
          </h1>
          <p className="max-w-2xl text-pretty text-ink-soft">
            Your dashboard summarises today&apos;s lesson, your review queue, and
            where you are on the path to fluency.
          </p>
        </header>
        <Card eyebrow="Sign in" title="Continue where you left off">
          <p className="text-sm text-ink-soft">
            Português keeps your streak, weekly minutes, and lesson plan across
            devices.
          </p>
          <Link href="/log-in" className="mt-4 inline-block btn-primary">
            Log in
          </Link>
        </Card>
      </div>
    );
  }

  const goalBlurb =
    user.weeklyMinutes >= settings.weeklyGoalMinutes
      ? `Goal hit — ${pluralize(user.weeklyMinutes, "minute")} this week.`
      : `${pluralize(user.weeklyMinutes, "minute")} of ${settings.weeklyGoalMinutes} this week.`;
  const primaryGoals = (user.goals ?? []).slice(0, 2).map((g) => LEARNER_GOALS.find((x) => x.value === g)?.label ?? g);

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <span className="stage-stamp">Today</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          Bom dia, {user.name.split(" ")[0]}.{" "}
          <span className="text-ink-mute">You&apos;re {user.streakDays} days in.</span>
        </h1>
        <p className="max-w-2xl text-pretty text-ink-soft">
          {planLineForLevel(user.level, primaryGoals, user.streakDays)}
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card
          eyebrow="Next lesson"
          title={next.title}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-mute">
                {next.unit} · {next.lesson}
              </span>
              <Link href={next.href} className="btn-primary px-4 py-2 text-xs">
                Start lesson
              </Link>
            </div>
          }
        >
          {next.blurb}
        </Card>

        <Card eyebrow="Spaced repetition" title={`${reviewDue.count} due today`}>
          Items you learned earlier are about to fade. A quick review locks them in.
          <Link
            href="/review"
            className="mt-4 inline-block text-sm text-terracotta-deep underline decoration-terracotta underline-offset-4"
          >
            Open review queue →
          </Link>
        </Card>
      </section>

      {placementStatus?.kind === "pending" ? (
        <section
          aria-label="Placement pending"
          className="card-surface flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <span className="stage-stamp">Placement pending</span>
            <h2 className="mt-1 text-display-sm font-display font-light text-pretty">
              We haven&apos;t placed you yet.
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              You self-assessed as <strong>{placementStatus.selfLevel}</strong>. A
              short Placement Lesson confirms or revises your starting Unit.
            </p>
          </div>
          <Link href="/placement" className="btn-primary inline-flex">
            Start placement →
          </Link>
        </section>
      ) : null}

      {placementStatus?.kind === "placed" && placementStatus.unit ? (
        <section
          aria-label="Current Unit"
          className="card-surface flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <span className="stage-stamp">Starting from</span>
            <h2 className="mt-1 text-display-sm font-display font-light text-pretty">
              {placementStatus.unit.title}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {placementStatus.unit.description}
            </p>
            <p className="mt-1 text-xs text-ink-mute">
              Level {placementStatus.level ?? user.level} · Unit {placementStatus.unitId}
            </p>
          </div>
          <Link href="/profile" className="btn-ghost text-xs">
            Change starting Unit →
          </Link>
        </section>
      ) : null}

      <section className="grid gap-6 md:grid-cols-3">
        <Card eyebrow="Weekly goal" title={`${goalPct}% of this week`}>
          <div
            className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-paper-deep"
            aria-hidden
          >
            <div className="h-full rounded-full bg-terracotta" style={{ width: `${goalPct}%` }} />
          </div>
          <p className="mt-3 text-sm text-ink-soft">{goalBlurb}</p>
          <Link
            href="/settings"
            className="mt-4 inline-block text-sm text-terracotta-deep underline decoration-terracotta underline-offset-4"
          >
            Adjust goal →
          </Link>
        </Card>

        <Card eyebrow="Streak" title={pluralize(user.streakDays, "day")}>
          Don&apos;t break the chain. {Math.max(15 - user.streakDays, 1)} minutes
          tomorrow keeps it alive.
        </Card>

        <Card eyebrow="Stage" title={`${formatStage(user.level)} · ${stageName(user.level)}`}>
          {milestoneBlurb(user.level)}
          {primaryGoals.length > 0 ? (
            <p className="mt-3 text-xs text-ink-mute">
              Tuned for {primaryGoals.join(" · ")}.
            </p>
          ) : null}
        </Card>
      </section>
    </div>
  );
}

function deriveReviewDue(level: Level): { count: number; estMinutes: number } {
  const map: Record<Level, { count: number; estMinutes: number }> = {
    A0: { count: 18, estMinutes: 7 },
    A1: { count: 24, estMinutes: 9 },
    A2: { count: 30, estMinutes: 11 },
    B1: { count: 36, estMinutes: 13 },
  };
  return map[level];
}

function stageName(level: Level): string {
  switch (level) {
    case "A0":
      return "First words";
    case "A1":
      return "Daily life";
    case "A2":
      return "Connected sentences";
    case "B1":
      return "Conversational fluency";
  }
}

function planLineForLevel(level: Level, goals: string[], streakDays: number): string {
  const goalPhrase = goals.length > 0 ? ` Tuned for ${goals.join(" · ")}.` : "";
  return `Level ${formatStage(level)} · ${pluralize(streakDays, "day")} in a row. Today's plan should take about fifteen minutes — including two turns with the AI teacher.${goalPhrase}`;
}

function milestoneBlurb(level: Level): string {
  const idx = LEVELS.indexOf(level);
  if (idx === -1 || idx === LEVELS.length - 1) {
    return "B1 is the v1 ceiling — keep refining and the AI teacher pushes nuance.";
  }
  const next = LEVELS[idx + 1];
  return `${formatStage(level)} ends with the ${level}→${next} Milestone — pass at 75% to unlock the next stage.`;
}
