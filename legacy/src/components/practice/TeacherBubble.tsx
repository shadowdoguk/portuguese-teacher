"use client";

import { useCallback } from "react";
import { useTeacherAudio } from "@/hooks/useTeacherAudio";
import type { TtsSynthesizeResponse } from "@/lib/tts/synthesize";
import type { TtsVoice } from "@/lib/settings";

export type TeacherBubbleProps = {
  utterance: string;
  voice: TtsVoice;
  speed?: number;
  autoplay?: boolean;
  textOnly?: boolean;
  fetchImpl?: typeof fetch;
  testId?: string;
  className?: string;
};

export function TeacherBubble({
  utterance,
  voice,
  speed,
  autoplay = false,
  textOnly = false,
  fetchImpl,
  testId = "teacher-bubble",
  className = "",
}: TeacherBubbleProps) {
  const audio = useTeacherAudio({
    text: utterance,
    voice,
    speed,
    autoplay: !textOnly && autoplay,
    enabled: !textOnly && utterance.trim().length > 0,
    fetchImpl,
  });

  const handleReplay = useCallback((): void => {
    void audio.play();
  }, [audio]);

  if (textOnly) {
    return (
      <div className={`space-y-2 ${className}`} data-testid={testId}>
        <p className="font-display text-xl text-ink" lang="pt-PT">
          {utterance}
        </p>
      </div>
    );
  }

  const replayLabel =
    audio.state === "playing"
      ? "Pause teacher"
      : audio.autoplayBlocked
        ? "Play teacher (autoplay was blocked)"
        : "Replay teacher utterance";

  return (
    <div className={`space-y-3 ${className}`} data-testid={testId}>
      <audio
        ref={audio.audioRef}
        src={audio.audioUrl ?? undefined}
        preload="auto"
        data-testid={`${testId}-audio`}
        aria-hidden="true"
      />
      <p className="font-display text-xl text-ink" lang="pt-PT">
        {utterance}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleReplay}
          disabled={audio.state !== "ready" && audio.state !== "playing" && audio.state !== "paused" && audio.state !== "ended"}
          aria-label={replayLabel}
          data-testid={`${testId}-replay`}
          className="btn-ghost text-xs"
        >
          <span aria-hidden>{"\u25B6"}</span>
          <span className="ml-1">
            {audio.state === "playing"
              ? "Playing\u2026"
              : audio.state === "loading"
                ? "Loading audio\u2026"
                : audio.state === "paused"
                  ? "Resume"
                  : audio.state === "ended"
                    ? "Replay"
                    : "Replay"}
          </span>
        </button>
        {audio.state === "degraded" ? (
          <span
            className="text-xs text-terracotta-deep"
            data-testid={`${testId}-degraded`}
            role="status"
          >
            TTS unavailable \u2014 showing text only.{" "}
            <button
              type="button"
              onClick={audio.retry}
              className="underline"
              data-testid={`${testId}-retry`}
            >
              Retry
            </button>
          </span>
        ) : null}
        {audio.state === "error" ? (
          <span
            className="text-xs text-terracotta-deep"
            data-testid={`${testId}-error`}
            role="alert"
          >
            Could not load audio ({audio.errorMessage}).{" "}
            <button
              type="button"
              onClick={audio.retry}
              className="underline"
            >
              Retry
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export type __TtsResponse = TtsSynthesizeResponse;