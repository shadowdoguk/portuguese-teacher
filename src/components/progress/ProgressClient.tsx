"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { Card } from "@/components/ui/Card";
import { LEVELS, type Level } from "@/lib/auth/types";
import { formatStage } from "@/lib/utils";

export function ProgressClient() {
  const { user } = useAuth();

  const skillMastery = useMemo(() => deriveSkillMastery(user?.level ?? "A0"), [user?.level]);
  const retentionCurve = useMemo(() => buildRetentionCurve(), []);

  if (!user) {
    return (
      <div className="space-y-10">
        <header className="space-y-3">
          <span className="stage-stamp">Progress</span>
          <h1 className="text-display-lg font-display font-light text-pretty">
            Four skills. One arc.
          </h1>
        </header>
        <Card eyebrow="Sign in" title="Sign in to see your progress">
          <p className="text-sm text-ink-soft">
            Your per-skill mastery, level ladder, and retention curve live here.
          </p>
          <Link href="/log-in" className="mt-4 inline-block btn-primary">
            Log in
          </Link>
        </Card>
      </div>
    );
  }

  const currentLevel = user.level;

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <span className="stage-stamp">Progress</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          Four skills. One arc.
        </h1>
        <p className="max-w-2xl text-pretty text-ink-soft">
          Mastery climbs unevenly — speaking is the slowest. The teacher will
          lean on your stronger skills and scaffold the weaker ones.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card eyebrow="Mastery" title="Per-skill breakdown">
          <ul className="space-y-3">
            {skillMastery.map((s) => (
              <li key={s.skill}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-ink">{s.skill}</span>
                  <span className="font-mono text-ink-mute">{s.value}</span>
                </div>
                <div
                  className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-paper-deep"
                  aria-hidden
                >
                  <div className="h-full rounded-full bg-terracotta" style={{ width: `${s.value}%` }} />
                </div>
                <p className="mt-1 text-xs text-ink-mute">{s.note}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card eyebrow="Milestones" title="Where you are">
          <ol className="space-y-3 text-sm">
            {LEVELS.map((level) => {
              const status = levelStatus(level, currentLevel);
              return (
                <li
                  key={level}
                  className="flex items-center justify-between border-b border-ink/5 pb-2 last:border-0"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-mute">
                    {formatStage(level)}
                  </span>
                  <span
                    className={
                      status === "passed"
                        ? "text-moss"
                        : status === "in-progress"
                          ? "text-terracotta"
                          : "text-ink-mute"
                    }
                  >
                    {status === "passed"
                      ? "Passed"
                      : status === "in-progress"
                        ? "In progress"
                        : "Locked"}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-xs text-ink-mute">
            Each transition is gated by a Milestone assessment at 75% pass.
          </p>
        </Card>
      </section>

      <section>
        <Card eyebrow="Retention" title="Last 14 days">
          <p className="text-sm text-ink-soft">
            Recall accuracy on the review queue, day by day. Spikes are SRS
            half-life bumps after a long break.
          </p>
          <RetentionBars series={retentionCurve} />
        </Card>
      </section>
    </div>
  );
}

function levelStatus(level: Level, currentLevel: Level): "passed" | "in-progress" | "locked" {
  const currentIdx = LEVELS.indexOf(currentLevel);
  const targetIdx = LEVELS.indexOf(level);
  if (targetIdx < currentIdx) return "passed";
  if (targetIdx === currentIdx) return "in-progress";
  return "locked";
}

function deriveSkillMastery(level: Level): { skill: string; value: number; note: string }[] {
  const base: Record<Level, { reading: number; listening: number; writing: number; speaking: number }> = {
    A0: { reading: 72, listening: 64, writing: 58, speaking: 51 },
    A1: { reading: 81, listening: 74, writing: 67, speaking: 60 },
    A2: { reading: 88, listening: 82, writing: 76, speaking: 70 },
    B1: { reading: 92, listening: 88, writing: 84, speaking: 80 },
  };
  const v = base[level];
  return [
    { skill: "Reading", value: v.reading, note: "Driven by flashcards and reading passages." },
    { skill: "Listening", value: v.listening, note: "Driven by listen-and-repeat and scenario briefings." },
    { skill: "Writing", value: v.writing, note: "Driven by fill-in and free-response exercises." },
    { skill: "Speaking", value: v.speaking, note: "The slowest skill — pronunciation drills and role-play." },
  ];
}

function buildRetentionCurve(): number[] {
  const today = new Date();
  const series: number[] = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const day = date.getDay();
    const base = 70 + Math.round(Math.sin((offset / 14) * Math.PI) * 18);
    const weekend = day === 0 || day === 6 ? -6 : 0;
    const jitter = ((offset * 7) % 5) - 2;
    series.push(Math.max(40, Math.min(98, base + weekend + jitter)));
  }
  return series;
}

function RetentionBars({ series }: { series: number[] }) {
  return (
    <div className="mt-4 flex h-28 items-end gap-1.5" role="img" aria-label="Recall accuracy over the last 14 days">
      {series.map((value, idx) => (
        <div
          key={idx}
          className="flex-1 rounded-t bg-terracotta/80"
          style={{ height: `${value}%` }}
          title={`Day ${idx + 1}: ${value}%`}
        />
      ))}
    </div>
  );
}
