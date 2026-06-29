"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { FeedbackOverlay } from "@/components/practice/FeedbackOverlay";
import { TierBadge } from "@/components/practice/TierBadge";
import { useVoiceCapture, type UseVoiceCaptureResult } from "@/hooks/useVoiceCapture";
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

type AsrApiResponse =
  | {
      ok: true;
      text: string;
      confidence: number;
      languageDetected: string;
      words: ReadonlyArray<{ word: string; confidence: number; startMs: number; endMs: number }>;
      mock: boolean;
    }
  | {
      ok: false;
      error: string;
      degraded?: boolean;
      degradedReason?: string;
    };

const PUSH_TO_TALK_KEY = " ";

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
  const [pushToTalkHeld, setPushToTalkHeld] = useState(false);
  const holdStateRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const probe = capabilitiesFromGlobals({
      navigator: window.navigator,
      window,
    });
    setCapabilities(probe);
  }, []);

  const tier: BrowserTier = capabilities?.tier ?? 3;
  const useAudio = tier === 1 || tier === 2;
  const voiceCapture: UseVoiceCaptureResult = useVoiceCapture({
    tier: tier === 1 || tier === 2 ? (tier as 1 | 2) : 1,
    lang: "pt-PT",
    silenceMs: 600,
  });

  const sendTranscript = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim();
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
    },
    [tier, practiceMode, difficulty.target],
  );

  const sendAudioCanonical = useCallback(
    async (audioBlob: Blob): Promise<string> => {
      const form = new FormData();
      form.append("audio", audioBlob, "utterance.webm");
      form.append("lang", "pt-PT");
      const res = await fetch("/api/asr/transcribe", {
        method: "POST",
        body: form,
      });
      const body = (await res.json()) as AsrApiResponse;
      if (!body.ok) {
        throw new Error(body.degradedReason ?? body.error ?? "ASR failed");
      }
      return body.text;
    },
    [],
  );

  const handleGrade = useCallback(
    async (grade: "again" | "hard" | "good" | "easy") => {
      const head = history[history.length - 1];
      if (!head) return;
      try {
        const res = await fetch("/api/voice-loop/turn/grade", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            learnerId: "demo-learner",
            turnId: head.turnId,
            grade,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? `Grade failed (${res.status})`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      }
    },
    [history],
  );

  const startListening = useCallback(async () => {
    if (!useAudio) return;
    try {
      await voiceCapture.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start capture");
    }
  }, [useAudio, voiceCapture]);

  const stopListeningAndSend = useCallback(async () => {
    if (!useAudio) return;
    try {
      const result = await voiceCapture.stop();
      let transcript = result.transcript;
      if (tier === 2 && result.audioBlob) {
        try {
          transcript = await sendAudioCanonical(result.audioBlob);
        } catch (err) {
          setError(err instanceof Error ? err.message : "ASR failed");
          return;
        }
      }
      if (!transcript.trim()) {
        setError("No speech detected");
        return;
      }
      await sendTranscript(transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop capture");
    }
  }, [useAudio, voiceCapture, tier, sendAudioCanonical, sendTranscript]);

  useEffect(() => {
    if (!useAudio) return;
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== PUSH_TO_TALK_KEY) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) return;
      if (holdStateRef.current) return;
      holdStateRef.current = true;
      setPushToTalkHeld(true);
      event.preventDefault();
      void startListening();
    }
    function onKeyUp(event: KeyboardEvent): void {
      if (event.key !== PUSH_TO_TALK_KEY) return;
      if (!holdStateRef.current) return;
      holdStateRef.current = false;
      setPushToTalkHeld(false);
      event.preventDefault();
      void stopListeningAndSend();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [useAudio, startListening, stopListeningAndSend]);

  const sendTurn = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await sendTranscript(trimmed);
  }, [text, sendTranscript]);

  const headline = useMemo(() => {
    if (!capabilities) return "Probing your browser…";
    return tierForLabel(capabilities.tier);
  }, [capabilities]);

  const captureState = voiceCapture.state;
  const captureActive = captureState === "listening" || captureState === "requesting-permission";
  const captureDenied = captureState === "denied";
  const captureError = voiceCapture.error;
  const captureErrorMessage = error ?? captureError;
  const liveTranscript = voiceCapture.interimTranscript || voiceCapture.finalTranscript;

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
            moment you make them. Press and hold{" "}
            <kbd className="rounded border border-ink/20 bg-paper-warm/40 px-1.5 py-0.5 text-xs">
              Space
            </kbd>{" "}
            to talk, or type below for the Tier 3 fallback.
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
              : captureActive
                ? "Listening…"
                : history.length === 0
                  ? "Say something in Portuguese"
                  : `Turn ${history.length} complete`
          }
        >
          {useAudio ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onMouseDown={() => void startListening()}
                  onMouseUp={() => void stopListeningAndSend()}
                  onMouseLeave={() => {
                    if (captureActive) void stopListeningAndSend();
                  }}
                  onTouchStart={() => void startListening()}
                  onTouchEnd={() => void stopListeningAndSend()}
                  disabled={pending || captureDenied}
                  aria-pressed={captureActive}
                  className={`btn-primary ${captureActive ? "bg-terracotta text-paper" : ""}`}
                  data-testid="mic-button"
                >
                  {captureActive ? "Listening… release to send" : "Hold to talk"}
                </button>
                <p className="text-xs text-ink-mute" data-testid="mic-hint">
                  Or press and hold <kbd className="font-mono">Space</kbd>
                </p>
              </div>
              {captureDenied ? (
                <p
                  className="text-sm text-terracotta-deep"
                  data-testid="mic-denied"
                  role="alert"
                >
                  Microphone permission denied. Allow microphone access in your browser settings, or
                  use the text fallback below.
                </p>
              ) : null}
              <div
                className="min-h-[3.5rem] rounded-lg border border-ink/10 bg-paper-warm/40 p-3"
                data-testid="live-transcript"
                aria-live="polite"
              >
                {liveTranscript ? (
                  <p className="font-display text-lg text-ink" lang="pt-PT">
                    {liveTranscript}
                  </p>
                ) : (
                  <p className="text-sm text-ink-mute">
                    {captureActive
                      ? "Listening — speak in Portuguese."
                      : "Press the mic button (or hold Space) to start."}
                  </p>
                )}
              </div>
              {useAudio ? (
                <details className="text-xs text-ink-mute">
                  <summary className="cursor-pointer">Text fallback (Tier 3)</summary>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void sendTurn();
                    }}
                    className="mt-3 flex flex-col gap-2"
                  >
                    <textarea
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      rows={3}
                      placeholder="Escreve em português — escreve 'Olá' ou 'Bom dia' para começar."
                      className="rounded-lg border border-ink/10 bg-paper p-3 font-display text-lg text-ink focus:border-terracotta focus:outline-none"
                      data-testid="learner-utterance"
                    />
                    <button
                      type="submit"
                      className="btn-primary self-end"
                      disabled={pending || text.trim().length === 0}
                      data-testid="send-turn"
                    >
                      Send turn →
                    </button>
                  </form>
                </details>
              ) : null}
            </div>
          ) : (
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
                  placeholder="Escreve em português — escreve 'Olá' ou 'Bom dia' para começar."
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
            </form>
          )}
          {captureErrorMessage ? (
            <p
              className="mt-3 text-sm text-terracotta-deep"
              data-testid="error"
              role={captureActive ? "status" : "alert"}
            >
              {captureErrorMessage}
            </p>
          ) : null}
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
        {pushToTalkHeld ? "Push-to-talk engaged." : "Tip: hold Space to talk."}{" "}
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
