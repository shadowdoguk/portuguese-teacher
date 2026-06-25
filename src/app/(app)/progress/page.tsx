"use client";

import Link from "next/link";
import { A0_CURRICULUM } from "@/lib/curriculum";
import { Card } from "@/components/ui/Card";
import { getAssessmentStore } from "@/lib/assessment";
import { useAuth } from "@/lib/auth/useAuth";

const skills = [
  { name: "Reading", value: 72 },
  { name: "Listening", value: 64 },
  { name: "Writing", value: 58 },
  { name: "Speaking", value: 51 },
];

export default function ProgressPage() {
  const { user } = useAuth();
  const learnerId = user?.id;
  const attempts = learnerId ? getAssessmentStore().attemptsForLearner(learnerId) : [];
  const referrals = learnerId ? getAssessmentStore().referralsForLearner(learnerId) : [];

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <span className="stage-stamp">Progress</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          Four skills. One arc.
        </h1>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card eyebrow="Mastery" title="Per-skill breakdown">
          <ul className="space-y-3">
            {skills.map((s) => (
              <li key={s.name}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-ink">{s.name}</span>
                  <span className="font-mono text-ink-mute">{s.value}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-paper-deep">
                  <div
                    className="h-full rounded-full bg-terracotta"
                    style={{ width: `${s.value}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card eyebrow="Milestones" title="Where you are">
          <ol className="space-y-3 text-sm">
            {(["A0", "A1", "A2", "B1"] as const).map((level) => {
              const status =
                level === user?.level
                  ? "in-progress"
                  : level === "B1" || (user?.level === "A2" && level === "A2")
                    ? "locked"
                    : user?.level && ["A1", "A2", "B1"].includes(user.level) && level === "A0"
                      ? "passed"
                      : "locked";
              return (
                <li
                  key={level}
                  className="flex items-center justify-between border-b border-ink/5 pb-2 last:border-0"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-mute">
                    {level}
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
        </Card>
      </section>

      <section>
        <Card eyebrow="Assessment history" title="Milestone attempts">
          {attempts.length === 0 ? (
            <p className="text-sm text-ink-soft">
              You haven&apos;t taken a Milestone yet. When you reach the end of an A0 Unit,
              the dashboard will surface a Milestone CTA.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {attempts.map((attempt) => (
                <li
                  key={attempt.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/5 pb-2 last:border-0"
                >
                  <div className="space-y-1">
                    <span className="stage-stamp">{attempt.boundary}</span>
                    <span className="block text-xs text-ink-mute">
                      {new Date(attempt.attemptedAt).toLocaleString()}
                    </span>
                    {attempt.recommendedAnchorUnitIds.length > 0 ? (
                      <p className="text-xs text-ink-soft">
                        Remedial anchors:{" "}
                        {attempt.recommendedAnchorUnitIds
                          .map((id) => A0_CURRICULUM.units.find((u) => u.id === id)?.title ?? id)
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={
                      attempt.passed
                        ? "rounded-full bg-moss/15 px-3 py-1 text-xs text-moss"
                        : "rounded-full bg-terracotta/15 px-3 py-1 text-xs text-terracotta-deep"
                    }
                  >
                    {attempt.passed ? "Passed" : "Failed"} · {Math.round(attempt.score * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="btn-ghost">
              Back to dashboard
            </Link>
            {user?.level ? (
              <Link href={`/assess/${boundaryForLevel(user.level)}`} className="btn-soft">
                Take next Milestone →
              </Link>
            ) : null}
          </div>
        </Card>
      </section>

      {referrals.length > 0 ? (
        <section>
          <Card eyebrow="Tutor referrals" title="When AI teaching isn&apos;t enough">
            <ul className="space-y-3 text-sm">
              {referrals.map((referral) => (
                <li
                  key={referral.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/5 pb-2 last:border-0"
                >
                  <div>
                    <span className="stage-stamp">{referral.boundary}</span>
                    <span className="ml-2 text-xs text-ink-mute">
                      triggered {new Date(referral.triggeredAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-ink-soft">
                    After {referral.attemptCount} failures at this boundary —{" "}
                    <Link href="#" className="underline decoration-terracotta underline-offset-4">
                      find a tutor (placeholder)
                    </Link>
                    .
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function boundaryForLevel(level: "A0" | "A1" | "A2" | "B1"): string {
  if (level === "A0") return "A0-A1";
  if (level === "A1") return "A1-A2";
  if (level === "A2") return "A2-B1";
  return "B1";
}
