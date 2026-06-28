"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";
import {
  DEFAULT_NATIVE_LANGUAGE,
  DEFAULT_SELF_ASSESSMENT,
  LEARNER_GOALS,
  LEVELS,
  NATIVE_LANGUAGES,
  type LearnerGoal,
  type Level,
} from "@/lib/auth/types";
import {
  A0_CURRICULUM,
  indexCurriculum,
  unitsAtLevel,
  entryUnit,
  LEVELS as CURRICULUM_LEVELS,
} from "@/lib/curriculum";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field, textInputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";

const CURRICULUM_INDEX = indexCurriculum(A0_CURRICULUM);

export function ProfileForm() {
  const { user, updateProfile, setCurrentUnit, latestPlacementAttempt } = useAuth();
  const nameId = useId();

  const [name, setName] = useState(user?.name ?? "");
  const [nativeLanguage, setNativeLanguage] = useState<string>(
    user?.nativeLanguage ?? DEFAULT_NATIVE_LANGUAGE,
  );
  const [selfAssessmentLevel, setSelfAssessmentLevel] = useState<Level>(
    user?.selfAssessmentLevel ?? DEFAULT_SELF_ASSESSMENT,
  );
  const [goals, setGoals] = useState<LearnerGoal[]>(user?.goals ?? []);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setNativeLanguage(user.nativeLanguage ?? DEFAULT_NATIVE_LANGUAGE);
    setSelfAssessmentLevel(user.selfAssessmentLevel ?? DEFAULT_SELF_ASSESSMENT);
    setGoals(user.goals ?? []);
  }, [user]);

  const placementEligible = useMemo(
    () => (user?.selfAssessmentLevel ?? DEFAULT_SELF_ASSESSMENT) !== "A0",
    [user?.selfAssessmentLevel],
  );

  const skipOptions = useMemo(() => {
    const result: Array<{ unitId: string; level: Level; title: string }> = [];
    for (const level of CURRICULUM_LEVELS) {
      unitsAtLevel(CURRICULUM_INDEX, level).forEach((unit) => {
        result.push({ unitId: unit.id, level, title: unit.title });
      });
    }
    return result;
  }, []);

  const currentUnitTitle = useMemo(() => {
    if (!user?.currentUnitId) return null;
    for (const option of skipOptions) {
      if (option.unitId === user.currentUnitId) return option.title;
    }
    return null;
  }, [user?.currentUnitId, skipOptions]);

  const latestAttempt = latestPlacementAttempt();

  if (!user) {
    return (
      <Card eyebrow="Profile" title="Sign in to edit your profile">
        <p className="text-sm text-ink-soft">
          Your learner profile personalises the teacher. Sign in to update your
          name, native language, self-assessment, and goals.
        </p>
        <Link href="/log-in" className="mt-4 inline-block btn-ghost">
          Log in
        </Link>
      </Card>
    );
  }

  function toggleGoal(goal: LearnerGoal) {
    setGoals((current) =>
      current.includes(goal) ? current.filter((g) => g !== goal) : [...current, goal],
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      setError("Name is required.");
      return;
    }
    setError(null);
    updateProfile({
      name: trimmed,
      nativeLanguage,
      selfAssessmentLevel,
      goals,
    });
    setSavedAt(new Date().toISOString());
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      <Card eyebrow="Identity" title="Your learner profile">
        <div className="space-y-5">
          <Field label="Display name" name={nameId} required hint="Shown in lessons and progress.">
            <input
              id={nameId}
              name={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoComplete="name"
              className={textInputClassName(Boolean(error))}
            />
          </Field>

          <Select
            label="Native language"
            value={nativeLanguage}
            options={NATIVE_LANGUAGES}
            onChange={setNativeLanguage}
            hint="Used for tricky grammar explanations when you ask."
          />

          <Select
            label="Self-assessment"
            value={selfAssessmentLevel}
            options={LEVELS.map((l) => ({
              value: l,
              label: `${l} — ${levelDescription(l)}`,
            }))}
            onChange={(next) => setSelfAssessmentLevel(next)}
            hint="If you select above A0, a Placement Lesson confirms or revises your starting Unit."
          />
        </div>
      </Card>

      <Card eyebrow="Goals" title="Why are you learning Portuguese?">
        <p className="text-sm text-ink-soft">
          Pick any that apply — the teacher tunes scenarios and vocabulary to match.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {LEARNER_GOALS.map((g) => (
            <Checkbox
              key={g.value}
              checked={goals.includes(g.value)}
              onChange={() => toggleGoal(g.value)}
              label={g.label}
              description={g.blurb}
              name={`goal-${g.value}`}
            />
          ))}
        </div>
      </Card>

      {placementEligible ? (
        <Card
          eyebrow="Placement"
          title={
            latestAttempt
              ? `Last placed at ${latestAttempt.confirmedStartUnitId}`
              : "A Placement Lesson will confirm your starting Unit"
          }
          footer={
            <div className="flex flex-wrap gap-3">
              <Link href="/placement" className="btn-primary inline-flex">
                {latestAttempt ? "Re-take Placement Lesson →" : "Take Placement Lesson →"}
              </Link>
            </div>
          }
        >
          You self-assessed as <strong>{user.selfAssessmentLevel ?? DEFAULT_SELF_ASSESSMENT}</strong>.
          The Placement Lesson is a single short adaptive check across reading,
          listening, and writing. It picks the right Unit for you — or you can
          self-correct afterwards.
          {latestAttempt ? (
            <p className="mt-3 text-xs text-ink-mute">
              Last run {new Date(latestAttempt.attemptedAt).toLocaleDateString()}:{" "}
              {Math.round(latestAttempt.overallScore * 100)}% overall ·{" "}
              {latestAttempt.learnerAccepted ? "accepted" : "overridden"} recommendation.
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card
        eyebrow="Skip to a level"
        title="Jump straight to a Unit"
      >
        <p className="text-sm text-ink-soft">
          {currentUnitTitle ? (
            <>You&apos;re currently starting at <strong>{currentUnitTitle}</strong>.</>
          ) : (
            <>You haven&apos;t been placed yet — pick a Unit to start immediately.</>
          )}{" "}
          You can change this any time; it does not change your level.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {skipOptions.map((option) => (
            <button
              key={option.unitId}
              type="button"
              onClick={() => setCurrentUnit(option.unitId)}
              className={
                option.unitId === user?.currentUnitId ? "btn-primary text-xs" : "btn-ghost text-xs"
              }
              disabled={option.unitId === user?.currentUnitId}
            >
              {option.level} · {option.title}
            </button>
          ))}
          {user?.currentUnitId ? null : (
            <button
              type="button"
              onClick={() => setCurrentUnit(entryUnit(CURRICULUM_INDEX).id)}
              className="btn-ghost text-xs"
            >
              Reset to entry Unit
            </button>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-h-[1.25rem]" aria-live="polite">
          {error ? (
            <p role="alert" className="text-sm text-terracotta-deep">
              {error}
            </p>
          ) : savedAt ? (
            <p className="text-sm text-moss">Saved.</p>
          ) : null}
        </div>
        <button type="submit" className="btn-primary">
          Save profile
        </button>
      </div>
    </form>
  );
}

function levelDescription(level: Level): string {
  switch (level) {
    case "A0":
      return "Absolute beginner";
    case "A1":
      return "Daily life";
    case "A2":
      return "Connected sentences";
    case "B1":
      return "Conversational fluency";
  }
}
