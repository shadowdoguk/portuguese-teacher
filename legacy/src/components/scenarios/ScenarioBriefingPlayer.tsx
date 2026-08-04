"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTeacherAudio } from "@/hooks/useTeacherAudio";
import {
  BRIEFING_FIELD_LABEL,
  BRIEFING_FIELD_ORDER,
  briefingAudioIdsFor,
  briefingFullText,
  briefingTextFor,
  type BriefingField,
} from "@/lib/scenarios/briefing-audio";
import { DEFAULT_TTS_VOICE } from "@/lib/settings";
import type { Scenario } from "@/lib/curriculum/types";

export type ScenarioBriefingPlayerProps = {
  scenario: Scenario;
  /**
   * If true, autoplay the briefing on mount. Default false (the
   * ScenarioPlayer requires an explicit user gesture — the briefing
   * audio is opt-in so a Tier 1/2 learner in a quiet space doesn't
   * get an unprompted narration).
   */
  autoplay?: boolean;
  /**
   * TTS speech rate. Defaults to 1.0 (matches the teacher's utterance
   * playback in PracticeSession).
   */
  speed?: number;
  /**
   * Captions toggle (a11y cross-ref #10). When off, the briefing text
   * is hidden — the Learner just hears the audio. Default on.
   */
  captions?: boolean;
  /**
   * Renders a row of field-label badges showing which segment is
   * currently being read aloud. Default on.
   */
  showCaptions?: boolean;
  /**
   * Optional className for the outer wrapper.
   */
  className?: string;
};

const REPLAY_SHORTCUT_KEYS = new Set(["r", "R"]);

export function ScenarioBriefingPlayer({
  scenario,
  autoplay = false,
  speed = 1.0,
  captions = true,
  showCaptions = true,
  className,
}: ScenarioBriefingPlayerProps) {
  const audioIds = useMemo(() => briefingAudioIdsFor(scenario), [scenario]);
  const fullText = useMemo(() => briefingFullText(scenario), [scenario]);

  const audio = useTeacherAudio({
    text: fullText,
    voice: DEFAULT_TTS_VOICE,
    speed,
    autoplay,
    enabled: audioIds.length > 0,
  });

  const [activeField, setActiveField] = useState<BriefingField | null>(null);
  const [captionsOn, setCaptionsOn] = useState(captions);
  const audioElRef = audio.audioRef;
  const activeFieldRef = useRef<BriefingField | null>(null);

  // Walk the field segments while audio is playing. The total duration
  // is `durationMs`; we apportion it equally across the non-empty
  // segments. This isn't word-perfect (the TTS engine doesn't tell us
  // where it is in the text) but it puts the right caption in sync
  // for the learner at this stage.
  useEffect(() => {
    activeFieldRef.current = activeField;
  }, [activeField]);

  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    let raf = 0;
    let cancelled = false;
    function tick(): void {
      if (cancelled) return;
      const audioEl = audioElRef.current;
      if (!audioEl) return;
      if (audio.state === "playing" && audioIds.length > 0 && audio.durationMs > 0) {
        const t = audioEl.currentTime * 1000;
        const perSegment = audio.durationMs / audioIds.length;
        const idx = Math.min(
          audioIds.length - 1,
          Math.max(0, Math.floor(t / perSegment)),
        );
        const next = audioIds[idx]?.field ?? null;
        if (next !== activeFieldRef.current) {
          setActiveField(next);
        }
      }
      raf = window.requestAnimationFrame(tick);
    }
    raf = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [audio.state, audio.durationMs, audioIds, audioElRef]);

  const onReplay = useCallback(() => {
    if (audio.state === "loading" || audio.state === "idle") return;
    void audio.play();
  }, [audio]);

  // Keyboard shortcut: press R (when not typing in an input) to replay.
  // The role="region" wrapper makes this surface announceable to
  // assistive tech via the `aria-keyshortcuts` attribute.
  useEffect(() => {
    function handleKey(event: KeyboardEvent): void {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (REPLAY_SHORTCUT_KEYS.has(event.key)) {
        event.preventDefault();
        onReplay();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onReplay]);

  if (audioIds.length === 0) {
    return null;
  }

  const playbackLabel = (() => {
    switch (audio.state) {
      case "loading":
        return "Preparing briefing audio…";
      case "ready":
        return "Briefing audio ready";
      case "playing":
        return "Reading briefing aloud";
      case "paused":
        return "Briefing paused";
      case "ended":
        return "Briefing ended";
      case "degraded":
        return `TTS unavailable: ${audio.degradedReason ?? "service degraded"}`;
      case "error":
        return `TTS failed: ${audio.errorMessage ?? "unknown error"}`;
      case "idle":
      default:
        return "Briefing audio not loaded";
    }
  })();

  return (
    <section
      className={className ?? "rounded-lg border border-ink/10 bg-paper p-4"}
      aria-labelledby="briefing-heading"
      aria-keyshortcuts="R"
      data-testid="scenario-briefing-player"
      data-state={audio.state}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h3
          id="briefing-heading"
          className="font-display text-base text-ink"
        >
          Briefing audio
        </h3>
        <p
          className="text-xs text-ink-mute"
          data-testid="briefing-status"
          aria-live="polite"
        >
          {playbackLabel}
        </p>
      </header>

      <audio
        ref={audio.audioRef}
        src={audio.audioUrl ?? undefined}
        preload="auto"
        data-testid="briefing-audio"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onReplay}
          disabled={
            audio.state === "loading" ||
            audio.state === "idle" ||
            audio.state === "degraded" ||
            audio.state === "error"
          }
          className="rounded-full border border-ink/20 bg-paper px-4 py-2 text-sm font-medium text-ink hover:border-ink/40 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Play or replay the scenario briefing"
          data-testid="briefing-replay"
        >
          {audio.state === "playing" ? "Replay (R)" : "Play briefing (R)"}
        </button>
        {audio.state === "degraded" || audio.state === "error" ? (
          <button
            type="button"
            onClick={audio.retry}
            className="rounded-full border border-terracotta bg-paper-warm px-4 py-2 text-sm font-medium text-terracotta-deep hover:bg-paper-warm/80"
            data-testid="briefing-retry"
          >
            Retry TTS
          </button>
        ) : null}
        {showCaptions ? (
          <label className="ml-auto flex items-center gap-2 text-xs text-ink-mute">
            <input
              type="checkbox"
              checked={captionsOn}
              onChange={(event) => setCaptionsOn(event.target.checked)}
              data-testid="briefing-captions-toggle"
            />
            Captions
          </label>
        ) : null}
      </div>

      {captionsOn ? (
        <ol
          className="mt-4 space-y-2"
          data-testid="briefing-captions"
          aria-label="Briefing captions"
        >
          {BRIEFING_FIELD_ORDER.map((field) => {
            const text = briefingTextFor(scenario, field).trim();
            if (!text) return null;
            const isActive = activeField === field;
            return (
              <li
                key={field}
                className={
                  isActive
                    ? "rounded-md border border-terracotta bg-paper-warm/40 p-3"
                    : "rounded-md border border-ink/10 bg-paper-deep/30 p-3"
                }
                aria-current={isActive ? "true" : undefined}
                data-testid="briefing-caption"
                data-field={field}
                data-active={isActive ? "true" : "false"}
              >
                <p className="stage-stamp">{BRIEFING_FIELD_LABEL[field]}</p>
                <p
                  className="mt-1 text-sm text-ink-soft"
                  lang="pt-PT"
                >
                  {text}
                </p>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}