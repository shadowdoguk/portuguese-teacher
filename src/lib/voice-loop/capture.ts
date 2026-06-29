export type CaptureState =
  | "idle"
  | "requesting-permission"
  | "listening"
  | "denied"
  | "unsupported"
  | "error";

export type CaptureResult = {
  transcript: string;
  audioBlob: Blob | null;
};

export type InterimTranscriptListener = (text: string) => void;
export type FinalTranscriptListener = (text: string) => void;
export type AudioLevelListener = (level: number) => void;
export type CaptureErrorListener = (error: string) => void;

export type CaptureSession = {
  start(): Promise<void>;
  stop(): Promise<CaptureResult>;
  abort(): void;
  getState(): CaptureState;
  getInterim(): string;
  getFinal(): string;
  getAudioBlob(): Blob | null;
  onInterim(handler: InterimTranscriptListener): () => void;
  onFinal(handler: FinalTranscriptListener): () => void;
  onAudioLevel(handler: AudioLevelListener): () => void;
  onError(handler: CaptureErrorListener): () => void;
};

export type WebSpeechConfig = {
  lang: string;
  interimResults?: boolean;
  continuous?: boolean;
};

export type MediaRecorderConfig = {
  lang: string;
  silenceMs?: number;
  silenceAmplitude?: number;
  audioConstraints?: MediaStreamConstraints;
  preferredMimeType?: string;
};

type AnyRecognitionResult = {
  isFinal: boolean;
  readonly length: number;
  item(index: number): { transcript: string; confidence: number };
  [index: number]: { transcript: string; confidence: number };
};

type AnyRecognitionAlternative = { transcript: string; confidence: number };

type AnyRecognitionResultList = {
  readonly length: number;
  item(index: number): AnyRecognitionResult;
  [index: number]: AnyRecognitionResult;
};

type AnyRecognitionEvent = {
  resultIndex: number;
  results: AnyRecognitionResultList;
};

type AnyRecognitionErrorEvent = {
  error: string;
  message?: string;
};

type AnySpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: AnyRecognitionEvent) => void) | null;
  onerror: ((event: AnyRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type AnySpeechRecognitionCtor = new () => AnySpeechRecognition;

export type WebSpeechDeps = {
  SpeechRecognitionCtor?: AnySpeechRecognitionCtor;
  webkitSpeechRecognitionCtor?: AnySpeechRecognitionCtor;
  supported: boolean;
};

export function createWebSpeechSession(
  config: WebSpeechConfig,
  deps: WebSpeechDeps,
): CaptureSession {
  const Ctor = deps.SpeechRecognitionCtor ?? deps.webkitSpeechRecognitionCtor;
  const interimListeners = new Set<InterimTranscriptListener>();
  const finalListeners = new Set<FinalTranscriptListener>();
  const errorListeners = new Set<CaptureErrorListener>();

  let state: CaptureState = deps.supported ? "idle" : "unsupported";
  let interim = "";
  let final = "";
  let recognition: AnySpeechRecognition | null = null;

  function setState(next: CaptureState): void {
    state = next;
  }

  function emitInterim(text: string): void {
    interim = text;
    for (const handler of interimListeners) handler(text);
  }

  function emitFinal(text: string): void {
    final = text;
    interim = "";
    emitInterim("");
    for (const handler of finalListeners) handler(text);
  }

  function emitError(message: string): void {
    for (const handler of errorListeners) handler(message);
  }

  function markError(): void {
    if (state === "listening" || state === "requesting-permission" || state === "idle") {
      setState("error");
    }
  }

  return {
    async start(): Promise<void> {
      if (!deps.supported || !Ctor) {
        setState("unsupported");
        emitError("Web Speech API not available in this browser");
        return;
      }
      if (state === "listening") return;
      try {
        const instance = new Ctor();
        instance.lang = config.lang;
        instance.continuous = config.continuous ?? false;
        instance.interimResults = config.interimResults ?? true;
        instance.onresult = (event: AnyRecognitionEvent) => {
          let interimAccum = "";
          let finalAccum = "";
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i];
            if (!result) continue;
            const alt: AnyRecognitionAlternative | undefined = result[0] ?? result.item?.(0);
            if (!alt) continue;
            if (result.isFinal) {
              finalAccum += alt.transcript;
            } else {
              interimAccum += alt.transcript;
            }
          }
          if (finalAccum) emitFinal((final ? final + " " : "") + finalAccum.trim());
          else if (interimAccum) emitInterim((final ? final + " " : "") + interimAccum);
        };
        instance.onerror = (event: AnyRecognitionErrorEvent) => {
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            setState("denied");
          } else {
            markError();
          }
          for (const handler of errorListeners) {
            handler(event.error + (event.message ? `: ${event.message}` : ""));
          }
        };
        instance.onend = () => {
          if (state === "listening") setState("idle");
        };
        instance.onstart = () => {
          setState("listening");
        };
        recognition = instance;
        instance.start();
      } catch (err) {
        emitError(err instanceof Error ? err.message : "Failed to start Web Speech API");
      }
    },
    async stop(): Promise<CaptureResult> {
      const current = recognition;
      recognition = null;
      if (current) {
        try {
          current.stop();
        } catch {
          // ignore — already stopped
        }
      }
      if (state === "listening") setState("idle");
      return { transcript: final, audioBlob: null };
    },
    abort(): void {
      const current = recognition;
      recognition = null;
      if (current) {
        try {
          current.abort();
        } catch {
          // ignore
        }
      }
      interim = "";
      setState("idle");
    },
    getState(): CaptureState {
      return state;
    },
    getInterim(): string {
      return interim;
    },
    getFinal(): string {
      return final;
    },
    getAudioBlob(): Blob | null {
      return null;
    },
    onInterim(handler: InterimTranscriptListener): () => void {
      interimListeners.add(handler);
      return () => interimListeners.delete(handler);
    },
    onFinal(handler: FinalTranscriptListener): () => void {
      finalListeners.add(handler);
      return () => finalListeners.delete(handler);
    },
    onAudioLevel(_handler: AudioLevelListener): () => void {
      return () => undefined;
    },
    onError(handler: CaptureErrorListener): () => void {
      errorListeners.add(handler);
      return () => errorListeners.delete(handler);
    },
  };
}

type AnyBlobEvent = { data: Blob };
type AnyMediaRecorder = {
  start(timesliceMs?: number): void;
  stop(): void;
  pause(): void;
  resume(): void;
  requestData(): void;
  ondataavailable: ((event: AnyBlobEvent) => void) | null;
  onstop: (() => void) | null;
  onerror: ((event: { error?: Error | DOMException }) => void) | null;
  onstart: (() => void) | null;
  state: "inactive" | "recording" | "paused";
  mimeType: string;
};

type AnyMediaRecorderCtor = {
  new (stream: MediaStream, options?: { mimeType?: string }): AnyMediaRecorder;
  isTypeSupported(mimeType: string): boolean;
};

type AnyAudioContext = {
  createMediaStreamSource(stream: MediaStream): {
    connect(node: unknown): void;
    disconnect(): void;
  };
  createAnalyser(): AnyAnalyser;
  close(): Promise<void>;
};

type AnyAnalyser = {
  fftSize: number;
  getByteTimeDomainData(array: Uint8Array): void;
};

type AnyMediaStream = {
  getTracks(): Array<{ stop(): void; kind: string; enabled: boolean }>;
  getAudioTracks(): Array<{ stop(): void; kind: string; enabled: boolean }>;
};

export type MediaRecorderDeps = {
  supported: boolean;
  MediaRecorderCtor?: AnyMediaRecorderCtor;
  AudioContextCtor?: new () => AnyAudioContext;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<AnyMediaStream>;
};

export function createMediaRecorderSession(
  config: MediaRecorderConfig,
  deps: MediaRecorderDeps,
): CaptureSession {
  const interimListeners = new Set<InterimTranscriptListener>();
  const finalListeners = new Set<FinalTranscriptListener>();
  const audioLevelListeners = new Set<AudioLevelListener>();
  const errorListeners = new Set<CaptureErrorListener>();

  const silenceMs = config.silenceMs ?? 600;
  const silenceAmplitude = config.silenceAmplitude ?? 0.01;
  const preferredMime = config.preferredMimeType ?? "audio/webm;codecs=opus";

  let state: CaptureState = deps.supported ? "idle" : "unsupported";
  let interim = "";
  let final = "";
  let audioBlob: Blob | null = null;
  let stream: AnyMediaStream | null = null;
  let recorder: AnyMediaRecorder | null = null;
  let audioContext: AnyAudioContext | null = null;
  let analyser: AnyAnalyser | null = null;
  let levelTimer: ReturnType<typeof setInterval> | null = null;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  const chunks: Blob[] = [];

  function setState(next: CaptureState): void {
    state = next;
  }

  function clearSilenceTimer(): void {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  }

  function armSilenceTimer(): void {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
      void stopInternal("silence");
    }, silenceMs);
  }

  function emitInterim(text: string): void {
    interim = text;
    for (const handler of interimListeners) handler(text);
  }

  function emitFinal(text: string): void {
    final = text;
    interim = "";
    emitInterim("");
    for (const handler of finalListeners) handler(text);
  }

  function emitAudioLevel(level: number): void {
    for (const handler of audioLevelListeners) handler(level);
  }

  function emitError(message: string): void {
    for (const handler of errorListeners) handler(message);
  }

  function markError(): void {
    if (state === "listening" || state === "requesting-permission" || state === "idle") {
      setState("error");
    }
  }

  function teardown(): void {
    if (levelTimer) {
      clearInterval(levelTimer);
      levelTimer = null;
    }
    clearSilenceTimer();
    if (audioContext) {
      void audioContext.close().catch(() => undefined);
      audioContext = null;
    }
    analyser = null;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = null;
    }
    recorder = null;
  }

  function amplitudeFromAnalyser(): number {
    if (!analyser) return 0;
    const buffer = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buffer);
    let peak = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const sample = (buffer[i] ?? 128) - 128;
      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;
    }
    return peak / 128;
  }

  function startLevelMonitor(): void {
    if (!analyser) return;
    levelTimer = setInterval(() => {
      const level = amplitudeFromAnalyser();
      emitAudioLevel(level);
      if (level > silenceAmplitude) {
        armSilenceTimer();
      }
    }, 80);
  }

  async function stopInternal(reason: "user" | "silence"): Promise<CaptureResult> {
    if (state !== "listening" && state !== "requesting-permission") {
      return { transcript: final, audioBlob: null };
    }
    if (recorder && recorder.state === "recording") {
      return new Promise((resolve) => {
        recorder!.onstop = () => {
          const blob = new Blob(chunks, { type: recorder?.mimeType || "audio/webm" });
          audioBlob = blob;
          const reasonText =
            reason === "silence" ? "silence detected" : "user stopped";
          emitFinal(
            `[audio captured — ${chunks.length} chunks, ${blob.size} bytes, ${reasonText}]`,
          );
          teardown();
          setState("idle");
          resolve({ transcript: final, audioBlob: blob });
        };
        try {
          recorder!.stop();
        } catch (err) {
          teardown();
          markError();
          emitError(err instanceof Error ? err.message : "Failed to stop recorder");
          resolve({ transcript: final, audioBlob: null });
        }
      });
    }
    teardown();
    setState("idle");
    return { transcript: final, audioBlob: null };
  }

  return {
    async start(): Promise<void> {
      if (!deps.supported || !deps.MediaRecorderCtor) {
        setState("unsupported");
        emitError("MediaRecorder not available in this browser");
        return;
      }
      if (state === "listening") return;
      setState("requesting-permission");
      try {
        const userStream = await deps.getUserMedia(
          config.audioConstraints ?? { audio: true },
        );
        stream = userStream;
        const mimeSupported = deps.MediaRecorderCtor.isTypeSupported(preferredMime)
          ? preferredMime
          : "";
        const instance = mimeSupported
          ? new deps.MediaRecorderCtor(userStream as unknown as MediaStream, { mimeType: mimeSupported })
          : new deps.MediaRecorderCtor(userStream as unknown as MediaStream);
        instance.ondataavailable = (event: AnyBlobEvent) => {
          if (event.data && event.data.size > 0) chunks.push(event.data);
        };
        instance.onerror = (event: { error?: Error | DOMException }) => {
          emitError(event.error?.message ?? "MediaRecorder error");
        };
        recorder = instance;
        if (deps.AudioContextCtor) {
          audioContext = new deps.AudioContextCtor();
          const source = audioContext.createMediaStreamSource(
            userStream as unknown as MediaStream,
          );
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 1024;
          source.connect(analyser);
        }
        instance.start(250);
        startLevelMonitor();
        armSilenceTimer();
        setState("listening");
      } catch (err) {
        teardown();
        const errName = (err as { name?: string } | null)?.name ?? "";
        if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
          setState("denied");
        } else {
          markError();
        }
        emitError(err instanceof Error ? err.message : "Failed to start capture");
      }
    },
    async stop(): Promise<CaptureResult> {
      return stopInternal("user");
    },
    abort(): void {
      teardown();
      if (recorder) {
        try {
          recorder.stop();
        } catch {
          // ignore
        }
      }
      interim = "";
      setState("idle");
    },
    getState(): CaptureState {
      return state;
    },
    getInterim(): string {
      return interim;
    },
    getFinal(): string {
      return final;
    },
    getAudioBlob(): Blob | null {
      return audioBlob;
    },
    onInterim(handler: InterimTranscriptListener): () => void {
      interimListeners.add(handler);
      return () => interimListeners.delete(handler);
    },
    onFinal(handler: FinalTranscriptListener): () => void {
      finalListeners.add(handler);
      return () => finalListeners.delete(handler);
    },
    onAudioLevel(handler: AudioLevelListener): () => void {
      audioLevelListeners.add(handler);
      return () => audioLevelListeners.delete(handler);
    },
    onError(handler: CaptureErrorListener): () => void {
      errorListeners.add(handler);
      return () => errorListeners.delete(handler);
    },
  };
}

export type PickCaptureSession = (
  tier: 1 | 2,
  webSpeechDeps: WebSpeechDeps,
  mediaRecorderDeps: MediaRecorderDeps,
  webSpeechConfig: WebSpeechConfig,
  mediaRecorderConfig: MediaRecorderConfig,
) => CaptureSession;

export function defaultPickCapture(
  tier: 1 | 2,
  webSpeechDeps: WebSpeechDeps,
  mediaRecorderDeps: MediaRecorderDeps,
  webSpeechConfig: WebSpeechConfig,
  mediaRecorderConfig: MediaRecorderConfig,
): CaptureSession {
  if (tier === 1) {
    return createWebSpeechSession(webSpeechConfig, webSpeechDeps);
  }
  return createMediaRecorderSession(mediaRecorderConfig, mediaRecorderDeps);
}
