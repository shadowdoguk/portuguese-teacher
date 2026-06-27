"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { Card } from "@/components/ui/Card";
import { DEFAULT_SELF_ASSESSMENT, LEVELS, type Level } from "@/lib/auth/types";

type Phase = "intro" | "in-progress" | "complete";

export default function PlacementPage() {
  const router = useRouter();
  const { user, updateProfile, setLevel } = useAuth();
  const [phase, setPhase] = useState<Phase>("intro");

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

  const target = user.selfAssessmentLevel ?? DEFAULT_SELF_ASSESSMENT;

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

  function startPlacement() {
    setPhase("in-progress");
  }

  function completePlacement(unitId: string, level: Level) {
    updateProfile({ currentUnitId: unitId });
    setLevel(level);
    setPhase("complete");
  }

  if (phase === "complete") {
    return (
      <div className="space-y-8">
        <header className="space-y-2">
          <span className="stage-stamp">Placement complete</span>
          <h1 className="text-display-md font-display font-light text-pretty">
            You&apos;re starting at <em className="font-display italic text-terracotta">{user.currentUnitId ?? "A0 · Unit 1"}</em>.
          </h1>
          <p className="max-w-2xl text-pretty text-ink-soft">
            You can change this any time from your profile.
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

  if (phase === "in-progress") {
    return (
      <PlacementRunner
        targetLevel={target}
        onComplete={(unitId, level) => completePlacement(unitId, level)}
        onCancel={() => setPhase("intro")}
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
          check will read across reading, listening, and writing to confirm or
          revise your starting Unit.
        </p>
      </header>

      <Card eyebrow="What to expect" title="One short lesson">
        <ul className="space-y-2 text-sm text-ink-soft">
          <li>• 8–12 items, 5–8 minutes</li>
          <li>• Reading, listening, writing</li>
          <li>• Adaptive — picks harder items as you go</li>
          <li>• You can override the recommendation after</li>
        </ul>
        <p className="mt-4 text-xs text-ink-mute">
          The full Placement Lesson selector, scoring, and adaptive branching
          are tracked in issue #15 — this page is the integration point.
        </p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={startPlacement} className="btn-primary">
          Start Placement Lesson
        </button>
        <Link href="/dashboard" className="btn-ghost">
          Skip for now
        </Link>
      </div>
    </div>
  );
}

function PlacementRunner({
  targetLevel,
  onComplete,
  onCancel,
}: {
  targetLevel: Level;
  onComplete: (unitId: string, level: Level) => void;
  onCancel: () => void;
}) {
  const targetIndex = LEVELS.indexOf(targetLevel);
  const recommendedIndex = Math.max(0, targetIndex);
  const recommendedLevel = LEVELS[recommendedIndex] ?? "A0";
  const unitId = `${recommendedLevel.toLowerCase()}-unit-1`;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="stage-stamp">Placement · in progress</span>
        <h1 className="text-display-md font-display font-light text-pretty">
          Adaptive check running…
        </h1>
      </header>
      <Card eyebrow="Runner" title="Stubbed for now">
        <p className="text-sm text-ink-soft">
          The full Placement Lesson runtime (#15) generates a balanced,
          adaptive pool of 8–12 items across the seeded Curriculum. This
          placeholder confirms the routing and persistence work end-to-end.
        </p>
        <p className="mt-3 text-xs text-ink-mute">
          Recommended Unit: <strong>{unitId}</strong> · Level{" "}
          <strong>{recommendedLevel}</strong>
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onComplete(unitId, recommendedLevel)}
            className="btn-primary"
          >
            Accept recommendation →
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
        </div>
      </Card>
    </div>
  );
}
