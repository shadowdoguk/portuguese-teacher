"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { TtsVoice } from "@/lib/settings";
import type { TtsSynthesizeResponse } from "@/lib/tts/synthesize";

export type TeacherAudioState =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "ended"
  | "degraded"
  | "error";

export type TeacherAudioEvent =
  | { type: "fetch/start" }
  | { type: "fetch/ok"; audioUrl: string; durationMs: number }
  | { type: "fetch/degraded"; reason: string }
  | { type: "fetch/error"; message: string }
  | { type: "play/start" }
  | { type: "play/pause" }
  | { type: "play/end" }
  | { type: "play/blocked" }
  | { type: "stop" }
  | { type: "reset" };

export type TeacherAudioStateShape = {
  state: TeacherAudioState;
  audioUrl: string | null;
  durationMs: number;
  degradedReason: string | null;
  errorMessage: string | null;
  autoplayBlocked: boolean;
};

export const initialTeacherAudioState: TeacherAudioStateShape = {
  state: "idle",
  audioUrl: null,
  durationMs: 0,
  degradedReason: null,
  errorMessage: null,
  autoplayBlocked: false,
};

export function reduceTeacherAudio(
  current: TeacherAudioStateShape,
  event: TeacherAudioEvent,
): TeacherAudioStateShape {
  switch (event.type) {
    case "fetch/start":
      return {
        ...current,
        state: "loading",
        errorMessage: null,
        degradedReason: null,
        autoplayBlocked: false,
      };
    case "fetch/ok":
      return {
        ...current,
        state: "ready",
        audioUrl: event.audioUrl,
        durationMs: event.durationMs,
        degradedReason: null,
        errorMessage: null,
        autoplayBlocked: false,
      };
    case "fetch/degraded":
      return {
        ...current,
        state: "degraded",
        degradedReason: event.reason,
        errorMessage: null,
      };
    case "fetch/error":
      return {
        ...current,
        state: "error",
        errorMessage: event.message,
        degradedReason: null,
      };
    case "play/start":
      return { ...current, state: "playing", autoplayBlocked: false };
    case "play/pause":
      return { ...current, state: "paused" };
    case "play/end":
      return { ...current, state: "ended" };
    case "play/blocked":
      return { ...current, state: "ready", autoplayBlocked: true };
    case "stop":
      return current.audioUrl
        ? { ...current, state: "ready", autoplayBlocked: false }
        : current;
    case "reset":
      return { ...initialTeacherAudioState };
  }
}

export type UseTeacherAudioOptions = {
  text: string;
  voice: TtsVoice;
  speed?: number;
  autoplay?: boolean;
  enabled?: boolean;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

export type UseTeacherAudioResult = {
  state: TeacherAudioState;
  audioUrl: string | null;
  durationMs: number;
  degradedReason: string | null;
  errorMessage: string | null;
  autoplayBlocked: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  play: () => Promise<void>;
  stop: () => void;
  retry: () => void;
};

const DEFAULT_ENDPOINT = "/api/tts/synthesize";

export function useTeacherAudio(options: UseTeacherAudioOptions): UseTeacherAudioResult {
  const {
    text,
    voice,
    speed,
    autoplay = false,
    enabled = true,
    fetchImpl,
    signal,
  } = options;

  const [snapshot, dispatch] = useReducer(reduceTeacherAudio, initialTeacherAudioState);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fetchSeqRef = useRef(0);
  const lastFetchedKeyRef = useRef<string | null>(null);
  const fetcherRef = useRef<typeof fetch>(
    fetchImpl ??
      (typeof fetch === "function"
        ? fetch.bind(globalThis)
        : (() => Promise.reject(new Error("fetch is not available")) as never)),
  );
  fetcherRef.current = fetchImpl ?? fetcherRef.current;

  const requestAudio = useCallback(async (): Promise<void> => {
    const mySeq = ++fetchSeqRef.current;
    dispatch({ type: "fetch/start" });
    try {
      const response = await fetcherRef.current(DEFAULT_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text,
          voiceId: voice.id,
          dialect: voice.dialect,
          speed,
        }),
        signal,
      });
      if (mySeq !== fetchSeqRef.current) return;
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          degradedReason?: string;
          error?: string;
        };
        dispatch({
          type: "fetch/error",
          message: body.degradedReason ?? body.error ?? `TTS request failed (${response.status})`,
        });
        return;
      }
      const body = (await response.json()) as TtsSynthesizeResponse;
      if (mySeq !== fetchSeqRef.current) return;
      if (body.ok) {
        dispatch({ type: "fetch/ok", audioUrl: body.audioUrl, durationMs: body.durationMs });
      } else {
        dispatch({ type: "fetch/degraded", reason: body.degradedReason });
      }
    } catch (err) {
      if (mySeq !== fetchSeqRef.current) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "TTS request failed";
      dispatch({ type: "fetch/error", message });
    }
  }, [text, voice.id, voice.dialect, speed, signal]);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: "reset" });
      lastFetchedKeyRef.current = null;
      return;
    }
    const key = `${voice.id}|${voice.dialect}|${speed ?? ""}|${text}`;
    if (key === lastFetchedKeyRef.current) return;
    lastFetchedKeyRef.current = key;
    void requestAudio();
  }, [enabled, text, voice.id, voice.dialect, speed, requestAudio]);

  const play = useCallback(async (): Promise<void> => {
    const audio = audioRef.current;
    if (!audio) return;
    if (snapshot.state !== "ready" && snapshot.state !== "paused" && snapshot.state !== "ended") {
      return;
    }
    try {
      audio.currentTime = 0;
      await audio.play();
      dispatch({ type: "play/start" });
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        dispatch({ type: "play/blocked" });
        return;
      }
      throw err;
    }
  }, [snapshot.state]);

  const stop = useCallback((): void => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    dispatch({ type: "stop" });
  }, []);

  const retry = useCallback((): void => {
    lastFetchedKeyRef.current = null;
    void requestAudio();
  }, [requestAudio]);

  // Autoplay once the audio is ready.
  useEffect(() => {
    if (!autoplay) return;
    if (snapshot.state !== "ready") return;
    const audio = audioRef.current;
    if (!audio) return;
    let cancelled = false;
    audio.currentTime = 0;
    audio
      .play()
      .then(() => {
        if (cancelled) return;
        dispatch({ type: "play/start" });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          dispatch({ type: "play/blocked" });
          return;
        }
        // Swallow other autoplay errors; the user can hit Replay.
      });
    return () => {
      cancelled = true;
      audio.pause();
    };
  }, [autoplay, snapshot.state]);

  // Surface the natural 'ended' event so the UI can show the replay button.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = (): void => {
      dispatch({ type: "play/end" });
    };
    const handlePause = (): void => {
      if (audio.currentTime === 0) return;
      if (snapshot.state === "playing") {
        dispatch({ type: "play/pause" });
      }
    };
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
    };
  }, [snapshot.state]);

  return {
    state: snapshot.state,
    audioUrl: snapshot.audioUrl,
    durationMs: snapshot.durationMs,
    degradedReason: snapshot.degradedReason,
    errorMessage: snapshot.errorMessage,
    autoplayBlocked: snapshot.autoplayBlocked,
    audioRef,
    play,
    stop,
    retry,
  };
}