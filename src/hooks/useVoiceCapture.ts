"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createMediaRecorderSession,
  createWebSpeechSession,
  defaultPickCapture,
  type CaptureResult,
  type CaptureSession,
  type CaptureState,
  type MediaRecorderConfig,
  type MediaRecorderDeps,
  type WebSpeechConfig,
  type WebSpeechDeps,
} from "@/lib/voice-loop/capture";

export type UseVoiceCaptureOptions = {
  tier: 1 | 2;
  lang?: string;
  silenceMs?: number;
};

export type UseVoiceCaptureResult = {
  state: CaptureState;
  interimTranscript: string;
  finalTranscript: string;
  audioBlob: Blob | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<CaptureResult>;
  abort: () => void;
};

type GlobalWithSpeech = typeof globalThis & {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
  MediaRecorder?: unknown;
  AudioContext?: unknown;
};

export function isWebSpeechSupported(
  globals: GlobalWithSpeech = globalThis as GlobalWithSpeech,
): boolean {
  return Boolean(globals.SpeechRecognition ?? globals.webkitSpeechRecognition);
}

export function isMediaRecorderSupported(
  globals: GlobalWithSpeech = globalThis as GlobalWithSpeech,
): boolean {
  return Boolean(globals.MediaRecorder);
}

function defaultGetUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new DOMException("mediaDevices.getUserMedia is not available", "NotSupportedError"));
  }
  return navigator.mediaDevices.getUserMedia(constraints);
}

export function useVoiceCapture(options: UseVoiceCaptureOptions): UseVoiceCaptureResult {
  const { tier, lang = "pt-PT", silenceMs = 600 } = options;
  const [state, setState] = useState<CaptureState>("idle");
  const [interimTranscript, setInterim] = useState("");
  const [finalTranscript, setFinal] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<CaptureSession | null>(null);
  const statePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const webSpeechDeps: WebSpeechDeps = {
      supported: isWebSpeechSupported(),
      SpeechRecognitionCtor: (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition as never,
      webkitSpeechRecognitionCtor: (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition as never,
    };
    const mediaRecorderDeps: MediaRecorderDeps = {
      supported: isMediaRecorderSupported(),
      MediaRecorderCtor: (window as unknown as { MediaRecorder?: unknown }).MediaRecorder as never,
      AudioContextCtor: (window as unknown as { AudioContext?: unknown }).AudioContext as never,
      getUserMedia: defaultGetUserMedia as never,
    };
    const webSpeechConfig: WebSpeechConfig = { lang, interimResults: true, continuous: false };
    const mediaRecorderConfig: MediaRecorderConfig = { lang, silenceMs };

    const session = defaultPickCapture(
      tier,
      webSpeechDeps,
      mediaRecorderDeps,
      webSpeechConfig,
      mediaRecorderConfig,
    );
    sessionRef.current = session;

    const offInterim = session.onInterim((text) => setInterim(text));
    const offFinal = session.onFinal((text) => setFinal(text));
    const offError = session.onError((message) => setError(message));

    statePollRef.current = setInterval(() => {
      const next = session.getState();
      setState((prev) => (prev === next ? prev : next));
      setAudioBlob(session.getAudioBlob());
    }, 120);

    return () => {
      offInterim();
      offFinal();
      offError();
      if (statePollRef.current) {
        clearInterval(statePollRef.current);
        statePollRef.current = null;
      }
      session.abort();
      sessionRef.current = null;
    };
  }, [tier, lang, silenceMs]);

  const start = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    setError(null);
    setInterim("");
    setFinal("");
    setAudioBlob(null);
    await session.start();
  }, []);

  const stop = useCallback(async (): Promise<CaptureResult> => {
    const session = sessionRef.current;
    if (!session) return { transcript: "", audioBlob: null };
    const result = await session.stop();
    setFinal(result.transcript);
    setAudioBlob(result.audioBlob);
    setState(session.getState());
    return result;
  }, []);

  const abort = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    session.abort();
    setState(session.getState());
  }, []);

  return {
    state,
    interimTranscript,
    finalTranscript,
    audioBlob,
    error,
    start,
    stop,
    abort,
  };
}
