"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { FeedbackOverlay } from "@/components/practice/FeedbackOverlay";
import { TierBadge } from "@/components/practice/TierBadge";
import {
  DEFAULT_DIFFICULTY_TARGET,
  adjustFromRules,
  capabilitiesFromGlobals,
  initialDifficulty,
  isBrowserTier,
  isPracticeMode,
  tierForLabel,
  type BrowserTier,
  type DifficultyState,
  type PracticeMode,
  type VoiceLoopTurn,
  type VoiceLoopTierCapabilities,
} from "@/lib/voice-loop";

const PRACTICE_MODE_OPTIONS: ReadonlyArray<{
  value: PracticeMode;
  label: string;
  description: string;
}> = [
  {
    value: "free-form",
    label: "Free-form",
    description: "Topic open; teacher adapts difficulty.",
  },
  {
    value: "scenario",
    label: "Scenario",
    description: "Goal-oriented tasks (café, directions, small talk).",
  },
  {
    value: "drill",
    label: "Drill",
    description: "Listen-and-repeat; pronunciation scoring.",
  },
];

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

export function PracticeSession() {
  const [capabilities, setCapabilities] = useState<VoiceLoopTierCapabilities | null>(null);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("free-form");
  const [difficulty, setDifficulty] = useState<DifficultyState>(() =>
    initialDifficulty(DEFAULT_DIFFICULTY_TARGET),
  );
  const [history, setHistory] = useState<VoiceLoopTurn[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const probe = capabilitiesFromGlobals({
      navigator: window.navigator,
      window,
    });
    setCapabilities(probe);
  }, []);

  const tier: BrowserTier = capabilities?.tier ?? 3;

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
          practiceMode,
          difficultyTarget: difficulty.target,
        }),
      });
      const body = (await response.json()) as ApiResponse;
      if (!body.ok) {
        setError(body.error);
        return;
      }
      setHistory((prev) => [...prev, body.turn]);
      setDifficulty((prev) => adjustFromRules(prev, body.turn.comprehensionOk));
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPending(false);
    }
  }, [text, tier, practiceMode, difficulty.target]);

  const headline = useMemo(() => {
    if (!capabilities) return "Probing your browser…";
    return tierForLabel(capabilities.tier);
  }, [capabilities]);

  return (
    <div className="space-y-8" data-testid="practice-session">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="stage-stamp">Voice loop · {headline}</span>
          <h1 className="text-pretty font-display text-display-lg font-light">
            Speak Portuguese. <span className="text-ink-mute">Right now.</span>
          </h1>
          <p className="max-w-2xl text-pretty text-ink-soft">
            The AI teacher listens, transcribes, replies in voice, and surfaces corrections the
            moment you make them. Tier 3 fallback lets you type while the real audio capture is
            being wired.
          </p>
        </div>
        <TierBadge capabilities={capabilities} />
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card
          eyebrow="Live turn"
          title={
            pending
              ? "Awaiting teacher…"
              : history.length === 0
                ? "Say something in Portuguese"
                : `Turn ${history.length} complete`
          }
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendTurn();
            }}
            className="flex flex-col gap-3"
          >
            <label className="flex flex-col gap-2 text-sm">
              <span className="stage-stamp">Your utterance (Tier 3 path)</span>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={
                  capabilities?.tier === 1
                    ? "Microphone capture arrives in the next iteration; type here for now."
                    : capabilities?.tier === 2
                      ? "MediaRecorder capture arrives in the next iteration; type here for now."
                      : "Escreve em português — escreve ‘Olá’ ou ‘Bom dia’ para começar."
                }
                rows={3}
                disabled={pending}
                className="rounded-lg border border-ink/10 bg-paper p-3 font-display text-lg text-ink focus:border-terracotta focus:outline-none disabled:opacity-50"
                data-testid="learner-utterance"
              />
            </label>
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-mute">
                {capabilities
                  ? `Tier ${capabilities.tier}: ${capabilities.reason}`
                  : "Detecting Web Speech API + MediaRecorder…"}
              </p>
              <button
                type="submit"
                className="btn-primary"
                disabled={pending || text.trim().length === 0}
                data-testid="send-turn"
              >
                {pending ? "Sending…" : "Send turn"}
                <span aria-hidden>→</span>
              </button>
            </div>
            {error ? (
              <p className="text-sm text-terracotta-deep" data-testid="error">
                {error}
              </p>
            ) : null}
          </form>
        </Card>

        <Card eyebrow="i+1 difficulty" title={`Target ${difficulty.target.toFixed(2)}`}>
          <p className="text-sm text-ink-soft">
            {difficulty.consecutiveSuccesses === 0
              ? "Recent comprehension is uneven — difficulty stays put."
              : `${difficulty.consecutiveSuccesses} consecutive success${difficulty.consecutiveSuccesses === 1 ? "" : "es"} so far. 3 in a row lifts the target by 0.5.`}
          </p>
          <p className="mt-2 text-xs text-ink-mute">
            Failure drops the target by 1.0 immediately. The cap is [0.0, 3.0] per the i+1 range.
          </p>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {PRACTICE_MODE_OPTIONS.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => setPracticeMode(mode.value)}
            className={`card-surface flex flex-col gap-2 px-5 py-4 text-left transition ${
              practiceMode === mode.value ? "border-terracotta" : "hover:border-ink/30"
            }`}
            data-testid={`mode-${mode.value}`}
            aria-pressed={practiceMode === mode.value}
          >
            <span className="stage-stamp">{mode.label}</span>
            <p className="text-sm text-ink-soft">{mode.description}</p>
          </button>
        ))}
      </section>

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
                    Mock: {turn.mock ? "yes" : "no"} · generated{" "}
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

      <p className="text-xs text-ink-mute">
        Real audio capture (Web Speech API + MediaRecorder) and MiniMax TTS playback land in the
        follow-up issues.{" "}
        <Link href="/dashboard" className="underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}

export function __validateModeValues() {
  for (const mode of PRACTICE_MODE_OPTIONS) {
    if (!isPracticeMode(mode.value)) {
      throw new Error(`Bad practice mode value: ${mode.value}`);
    }
  }
  if (!isBrowserTier(1) || !isBrowserTier(2) || !isBrowserTier(3)) {
    throw new Error("Tier values drifted from the type guard");
  }
}
