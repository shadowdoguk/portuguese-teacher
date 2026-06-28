"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  SCENARIO_CATEGORIES,
  SCENARIO_LIBRARY,
  type Scenario,
  type ScenarioCategory,
  type ScenarioProgress,
  type Level,
} from "@/lib/scenarios";
import { LEVELS } from "@/lib/curriculum/types";

const ALL_FILTER = "all" as const;
type CategoryFilter = typeof ALL_FILTER | ScenarioCategory;
type LevelFilter = typeof ALL_FILTER | Level;

const CATEGORY_FILTERS: ReadonlyArray<{ value: CategoryFilter; label: string }> = [
  { value: ALL_FILTER, label: "All" },
  ...SCENARIO_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
];

const LEVEL_FILTERS: ReadonlyArray<{ value: LevelFilter; label: string }> = [
  { value: ALL_FILTER, label: "All levels" },
  ...LEVELS.map((l) => ({ value: l, label: l })),
];

function starsLabel(stars: 0 | 1 | 2 | 3): string {
  return ["—", "★", "★★", "★★★"][stars] ?? "—";
}

function ScenarioCard({
  scenario,
  progress,
  onSelect,
}: {
  scenario: Scenario;
  progress: ScenarioProgress | undefined;
  onSelect: (scenario: Scenario) => void;
}) {
  const stars = progress?.bestStars ?? 0;
  const completed = Boolean(progress?.completedAt);
  return (
    <article className="card-surface flex flex-col gap-4" data-testid={`scenario-card-${scenario.id}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="stage-stamp">
            {scenario.targetLevel} · {scenario.category.replace(/-/g, " ")}
          </p>
          <h3 className="font-display text-xl text-ink">{scenario.goal}</h3>
        </div>
        <span
          className="pill"
          aria-label={completed ? `Completed, ${starsLabel(stars)}` : "Not yet attempted"}
        >
          {starsLabel(stars)}
        </span>
      </header>
      <p className="text-sm text-ink-soft">{scenario.setting}</p>
      <dl className="grid grid-cols-3 gap-2 text-xs text-ink-mute">
        <div>
          <dt className="stage-stamp">Turns</dt>
          <dd className="font-mono text-base text-ink">{scenario.expectedTurns}</dd>
        </div>
        <div>
          <dt className="stage-stamp">Pass</dt>
          <dd className="font-mono text-base text-ink">{Math.round(scenario.passingScore * 100)}%</dd>
        </div>
        <div>
          <dt className="stage-stamp">Criteria</dt>
          <dd className="font-mono text-base text-ink">{scenario.successCriteria.length}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => onSelect(scenario)}
        className="btn-primary self-start"
        data-testid={`scenario-start-${scenario.id}`}
      >
        {completed ? "Re-run scenario" : "Start scenario"}
        <span aria-hidden>→</span>
      </button>
    </article>
  );
}

export function ScenarioLibrary({
  progress,
  onSelect,
}: {
  progress: Record<string, ScenarioProgress>;
  onSelect: (scenario: Scenario) => void;
}) {
  const [category, setCategory] = useState<CategoryFilter>(ALL_FILTER);
  const [level, setLevel] = useState<LevelFilter>(ALL_FILTER);

  const filtered = useMemo(() => {
    return SCENARIO_LIBRARY.filter((s) => {
      if (category !== ALL_FILTER && s.category !== category) return false;
      if (level !== ALL_FILTER && s.targetLevel !== level) return false;
      return true;
    });
  }, [category, level]);

  return (
    <section className="space-y-6" data-testid="scenario-library">
      <header className="flex flex-col gap-3">
        <p className="stage-stamp">Scenario library · {SCENARIO_LIBRARY.length} pt-PT scenarios</p>
        <h2 className="font-display text-2xl text-ink">Practice with goal-oriented tasks</h2>
        <p className="max-w-2xl text-pretty text-ink-soft">
          Each scenario walks through a pre-task briefing, a goal-oriented conversation, and a
          post-task debrief. Stars persist locally and will sync with your profile once the
          progress model lands.
        </p>
      </header>

      <fieldset className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-paper-warm/40 p-4">
        <legend className="px-1 text-xs text-ink-mute">Filter</legend>
        <div className="flex flex-wrap gap-2">
          <span className="stage-stamp self-center pr-2">Category</span>
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`btn-ghost px-3 py-1 text-xs ${
                category === f.value ? "border-terracotta text-terracotta-deep" : ""
              }`}
              aria-pressed={category === f.value}
              onClick={() => setCategory(f.value)}
              data-testid={`filter-category-${f.value}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="stage-stamp self-center pr-2">Level</span>
          {LEVEL_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`btn-ghost px-3 py-1 text-xs ${
                level === f.value ? "border-terracotta text-terracotta-deep" : ""
              }`}
              aria-pressed={level === f.value}
              onClick={() => setLevel(f.value)}
              data-testid={`filter-level-${f.value}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </fieldset>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-mute">No scenarios match these filters.</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              progress={progress[scenario.id]}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-ink-mute">
        Want free-form dialogue instead?{" "}
        <Link href="/practice" className="underline">
          Open the voice loop
        </Link>
        .
      </p>
    </section>
  );
}
