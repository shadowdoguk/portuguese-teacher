"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { FeedbackOverlay } from "@/components/practice/FeedbackOverlay";
import {
  LevelMismatchBadge,
  LevelMismatchGuidance,
} from "@/components/practice/LevelMismatchBadge";
import { useAuth } from "@/lib/auth/useAuth";
import {
  DEFAULT_DIFFICULTY_TARGET,
  capabilitiesFromGlobals,
  type BrowserTier,
  type DifficultyState,
  type VoiceLoopTierCapabilities,
  type VoiceLoopTurn,
  initialDifficulty,
  adjustFromRules,
} from "@/lib/voice-loop";
import {
  adaptPreTask,
  levelMismatch,
  type AdaptedPreTask,
} from "@/lib/scenarios/adaptive";
import {
  advance,
  complete,
  initialState,
  inferCriteriaFromHistory,
  detectRemedialTriggers,
  type RunnerState,
  type RemedialTrigger,
  scoreScenario,
  type Scenario,
} from "@/lib/scenarios";

type ApiSuccess = {
  ok: true;
  turn: VoiceLoopTurn;
  latencyMs: number;
  mock: boolean;
};

type ApiError = {
  ok: false;
  error: string;
};

type ApiResponse = ApiSuccess | ApiError;

const SCENARIO_TIER_FALLBACK: BrowserTier = 3;
const SCENARIO_SRS_LEARNER_ID = "demo-learner";

export function ScenarioPlayer({
  scenario,
  onExit,
  onComplete,
}: {
  scenario: Scenario;
  onExit: () => void;
  onComplete: (result: {
    stars: 0 | 1 | 2 | 3;
    passed: boolean;
    turnsTaken: number;
    reasons: ReadonlyArray<string>;
  }) => void;
}) {
  const { user } = useAuth();
  const learnerLevel = user?.level ?? "A0";
  const [capabilities, setCapabilities] = useState<VoiceLoopTierCapabilities | null>(null);
  const [state, setState] = useState<RunnerState>(() => initialState(scenario));
  const [history, setHistory] = useState<VoiceLoopTurn[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyState>(() =>
    initialDifficulty(DEFAULT_DIFFICULTY_TARGET),
  );
  const [criteriaOverride, setCriteriaOverride] = useState<ReadonlyArray<boolean> | null>(null);
  const [knownVocabIds, setKnownVocabIds] = useState<ReadonlySet<string>>(() => new Set());

  const mismatch = useMemo(() => levelMismatch(learnerLevel, scenario), [learnerLevel, scenario]);
  const adaptedPreTask = useMemo<AdaptedPreTask>(
    () => adaptPreTask(scenario, knownVocabIds),
    [scenario, knownVocabIds],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCapabilities(
      capabilitiesFromGlobals({ navigator: window.navigator, window }),
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await fetch(
          `/api/srs/state?learnerId=${encodeURIComponent(SCENARIO_SRS_LEARNER_ID)}`,
        );
        if (!res.ok) return;
        const body = (await res.json()) as {
          ok: boolean;
          state?: { items?: Record<string, { reviewCount?: number }> };
        };
        if (!body.ok || cancelled) return;
        const seen = new Set<string>();
        for (const [itemId, record] of Object.entries(body.state?.items ?? {})) {
          if (record.reviewCount && record.reviewCount > 0) seen.add(itemId);
        }
        setKnownVocabIds(seen);
      } catch {
        /* best-effort; leave the known set empty */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [scenario.id]);

  const tier: BrowserTier = capabilities?.tier ?? SCENARIO_TIER_FALLBACK;

  const triggers = useMemo<ReadonlyArray<RemedialTrigger>>(
    () => detectRemedialTriggers(scenario, history),
    [scenario, history],
  );

  const sendTurn = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/voice-loop/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          learnerText: trimmed,
          tier,
          practiceMode: "scenario",
          difficultyTarget: difficulty.target,
        }),
      });
      const body = (await response.json()) as ApiResponse;
      if (!body.ok) {
        setError(body.error);
        return;
      }
      setHistory((prev) => {
        const next = [...prev, body.turn];
        setDifficulty((d) => adjustFromRules(d, body.turn.comprehensionOk));
        setState((s) => {
          const result = advance(s, scenario, next);
          if (result.kind === "completed") {
            const breakdown = scoreScenario(
              scenario,
              criteriaOverride ?? inferCriteriaFromHistory(scenario, next),
            );
            onComplete({
              stars: breakdown.stars,
              passed: breakdown.passed,
              turnsTaken: next.length,
              reasons: breakdown.reasons,
            });
            return result.state;
          }
          return result.state;
        });
        return next;
      });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPending(false);
    }
  }, [text, tier, difficulty.target, scenario, criteriaOverride, onComplete]);

  const finishScenario = useCallback(() => {
    setState((s) => {
      const result = complete(s, scenario, history, Date.now(), criteriaOverride ?? undefined);
      if (result.kind === "completed") {
        const breakdown = scoreScenario(
          scenario,
          criteriaOverride ?? inferCriteriaFromHistory(scenario, history),
        );
        onComplete({
          stars: breakdown.stars,
          passed: breakdown.passed,
          turnsTaken: history.length,
          reasons: breakdown.reasons,
        });
      }
      return result.state;
    });
  }, [scenario, history, criteriaOverride, onComplete]);

  if (state.stage === "pre-task") {
    return (
      <Card eyebrow={`Pre-task · ${scenario.targetLevel}`} title={scenario.goal}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <LevelMismatchBadge mismatch={mismatch} />
            <span className="text-xs text-ink-mute">
              Your level: <span className="font-mono">{learnerLevel}</span> · Scenario:{" "}
              <span className="font-mono">{scenario.targetLevel}</span>
            </span>
          </div>
          <LevelMismatchGuidance mismatch={mismatch} />
          <p className="text-sm text-ink-soft">{scenario.setting}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="stage-stamp">You</dt>
              <dd className="text-ink">{scenario.roles.learner}</dd>
            </div>
            <div>
              <dt className="stage-stamp">Teacher</dt>
              <dd className="text-ink">{scenario.roles.teacher}</dd>
            </div>
          </dl>
          <div className="rounded-lg border border-ink/10 bg-paper p-4">
            <p className="stage-stamp">Briefing</p>
            <p className="mt-1 text-sm text-ink-soft">{scenario.preTask}</p>
          </div>
          {scenario.vocabularyRefs.length > 0 ? (
            <div
              className="rounded-lg border border-ink/10 bg-paper p-4"
              data-testid="scenario-vocab-hints"
            >
              <p className="stage-stamp">Vocabulary for this scenario</p>
              <p className="mt-1 text-xs text-ink-mute">
                {adaptedPreTask.knownVocab.length} already known ·{" "}
                {adaptedPreTask.unknownVocab.length} new
              </p>
              {adaptedPreTask.unknownVocab.length > 0 ? (
                <p
                  className="mt-2 text-xs text-ink-soft"
                  data-testid="scenario-vocab-unknown"
                >
                  <span className="stage-stamp mr-2">New</span>
                  {adaptedPreTask.unknownVocab.join(", ")}
                </p>
              ) : (
                <p
                  className="mt-2 text-xs text-ink-soft"
                  data-testid="scenario-vocab-all-known"
                >
                  You&apos;ve reviewed every item in this Unit already — the
                  scenario is mostly a fluency run.
                </p>
              )}
            </div>
          ) : null}
          <p className="text-xs text-ink-mute">
            Target turns: {scenario.expectedTurns}. Passing score:{" "}
            {Math.round(scenario.passingScore * 100)}%.
          </p>
          <div className="flex items-center justify-between gap-3">
            <button type="button" className="btn-ghost" onClick={onExit}>
              Back to library
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setState((s) => ({ ...s, stage: "during-task" }))}
              data-testid="scenario-start-task"
            >
              Start conversation
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </Card>
    );
  }

  if (state.stage === "during-task") {
    return (
      <div className="space-y-6" data-testid="scenario-during-task">
        <Card
          eyebrow={`During task · turn ${Math.min(history.length + 1, scenario.expectedTurns)}/${scenario.expectedTurns}`}
          title={scenario.goal}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendTurn();
            }}
            className="flex flex-col gap-3"
          >
            <label className="flex flex-col gap-2 text-sm">
              <span className="stage-stamp">Your utterance</span>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Escreve em português…"
                rows={3}
                disabled={pending}
                className="rounded-lg border border-ink/10 bg-paper p-3 font-display text-lg text-ink focus:border-terracotta focus:outline-none disabled:opacity-50"
                data-testid="scenario-learner-utterance"
              />
            </label>
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-mute">
                Difficulty target {difficulty.target.toFixed(2)} · Tier {tier}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={finishScenario}
                  disabled={history.length === 0}
                  data-testid="scenario-finish"
                >
                  End scenario
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={pending || text.trim().length === 0}
                  data-testid="scenario-send-turn"
                >
                  {pending ? "Sending…" : "Send turn"}
                  <span aria-hidden>→</span>
                </button>
              </div>
            </div>
            {error ? (
              <p className="text-sm text-terracotta-deep" data-testid="scenario-error">
                {error}
              </p>
            ) : null}
          </form>
        </Card>

        {triggers.length > 0 ? (
          <Card eyebrow="Remedial anchor" title="Suggestion">
            <ul className="space-y-2 text-sm text-ink-soft">
              {triggers.map((t) => (
                <li key={`${t.reason}-${t.toUnitId}`}>
                  <span className="stage-stamp mr-2">{t.reason}</span>
                  {t.note}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {history.length > 0 ? (
          <section className="space-y-6">
            {history
              .slice()
              .reverse()
              .map((turn) => (
                <article key={turn.turnId} className="card-surface space-y-4 p-6">
                  <header className="flex items-center justify-between">
                    <span className="stage-stamp">{turn.turnId}</span>
                    <span className="text-xs text-ink-mute">
                      {new Date(turn.generatedAt).toLocaleTimeString()}
                    </span>
                  </header>
                  <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
                    <div>
                      <span className="stage-stamp">Teacher</span>
                      <p className="mt-2 font-display text-xl text-ink" lang="pt-PT">
                        {turn.teacherUtterance}
                      </p>
                    </div>
                    <FeedbackOverlay turn={turn} />
                  </div>
                </article>
              ))}
          </section>
        ) : null}
      </div>
    );
  }

  const breakdown = scoreScenario(
    scenario,
    criteriaOverride ?? inferCriteriaFromHistory(scenario, history),
  );

  return (
    <Card
      eyebrow="Post-task"
      title={breakdown.passed ? "Scenario complete" : "Scenario ended"}
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">
          You took {history.length} turn{history.length === 1 ? "" : "s"} across{" "}
          {scenario.expectedTurns} expected.{" "}
          {breakdown.passed
            ? `You passed with ${breakdown.stars} star${breakdown.stars === 1 ? "" : "s"}.`
            : "You did not reach the passing threshold this time."}
        </p>
        <ul className="space-y-2 text-sm text-ink-soft" data-testid="scenario-reasons">
          {breakdown.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        {scenario.remedialAnchorRefs.length > 0 && !breakdown.passed ? (
          <div className="rounded-lg border border-ink/10 bg-paper p-4">
            <p className="stage-stamp">Suggested remedial anchors</p>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">
              {scenario.remedialAnchorRefs.map((a) => (
                <li key={a.toUnitId}>
                  {a.reason} · {a.note}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <button type="button" className="btn-ghost" onClick={onExit}>
            Back to library
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setHistory([]);
              setState(initialState(scenario));
              setText("");
              setCriteriaOverride(null);
            }}
            data-testid="scenario-restart"
          >
            Try again
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </Card>
  );
}
