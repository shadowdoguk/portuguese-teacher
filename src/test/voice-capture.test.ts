import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMediaRecorderSession,
  createWebSpeechSession,
  type MediaRecorderDeps,
  type WebSpeechDeps,
} from "@/lib/voice-loop/capture";

type AnySpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { resultIndex: number; results: unknown }) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

class FakeSpeechRecognition {
  lang = "pt-PT";
  continuous = false;
  interimResults = true;
  onresult: ((event: { resultIndex: number; results: unknown }) => void) | null = null;
  onerror: ((event: { error: string; message?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  startCalls = 0;
  stopCalls = 0;
  abortCalls = 0;
  start(): void {
    this.startCalls += 1;
    queueMicrotask(() => this.onstart?.());
  }
  stop(): void {
    this.stopCalls += 1;
    queueMicrotask(() => this.onend?.());
  }
  abort(): void {
    this.abortCalls += 1;
    queueMicrotask(() => this.onend?.());
  }
}

describe("createWebSpeechSession", () => {
  let lastInstance: FakeSpeechRecognition | null = null;
  let deps: WebSpeechDeps;

  beforeEach(() => {
    lastInstance = null;
    deps = {
      supported: true,
      SpeechRecognitionCtor: function FakeCtor() {
        lastInstance = new FakeSpeechRecognition();
        return lastInstance as unknown as InstanceType<AnySpeechRecognitionCtor>;
      } as unknown as AnySpeechRecognitionCtor,
    };
  });

  it("starts in idle, transitions to listening on start()", async () => {
    const session = createWebSpeechSession({ lang: "pt-PT" }, deps);
    expect(session.getState()).toBe("idle");
    await session.start();
    await flushMicrotasks();
    expect(session.getState()).toBe("listening");
    expect(lastInstance?.startCalls).toBe(1);
  });

  it("emits interim and final transcripts through the listeners", async () => {
    const session = createWebSpeechSession({ lang: "pt-PT" }, deps);
    const interim: string[] = [];
    const finals: string[] = [];
    session.onInterim((t) => interim.push(t));
    session.onFinal((t) => finals.push(t));
    await session.start();
    await flushMicrotasks();
    const instance = lastInstance!;
    instance.onresult?.({
      resultIndex: 0,
      results: makeResults([
        { isFinal: false, alt: { transcript: "olá", confidence: 0.9 } },
      ]),
    });
    expect(session.getInterim()).toBe("olá");
    expect(session.getFinal()).toBe("");
    expect(interim).toContain("olá");
    expect(finals.length).toBe(0);

    instance.onresult?.({
      resultIndex: 0,
      results: makeResults([
        { isFinal: true, alt: { transcript: "olá", confidence: 0.95 } },
      ]),
    });
    expect(session.getInterim()).toBe("");
    expect(session.getFinal()).toBe("olá");
    expect(finals).toEqual(["olá"]);
  });

  it("flips to denied on a not-allowed error", async () => {
    const session = createWebSpeechSession({ lang: "pt-PT" }, deps);
    const errors: string[] = [];
    session.onError((e) => errors.push(e));
    await session.start();
    await flushMicrotasks();
    lastInstance!.onerror?.({ error: "not-allowed" });
    expect(session.getState()).toBe("denied");
    expect(errors[0]).toContain("not-allowed");
  });

  it("returns the final transcript on stop() and resets state to idle", async () => {
    const session = createWebSpeechSession({ lang: "pt-PT" }, deps);
    await session.start();
    await flushMicrotasks();
    const instance = lastInstance!;
    instance.onresult?.({
      resultIndex: 0,
      results: makeResults([
        { isFinal: true, alt: { transcript: "bom dia", confidence: 0.9 } },
      ]),
    });
    const result = await session.stop();
    await flushMicrotasks();
    expect(result.transcript).toBe("bom dia");
    expect(result.audioBlob).toBeNull();
    expect(session.getState()).toBe("idle");
    expect(instance.stopCalls).toBe(1);
  });

  it("aborts without throwing if the browser already stopped", async () => {
    const session = createWebSpeechSession({ lang: "pt-PT" }, deps);
    await session.start();
    await flushMicrotasks();
    expect(() => session.abort()).not.toThrow();
    await flushMicrotasks();
    expect(session.getState()).toBe("idle");
  });

  it("returns unsupported state and emits an error when not supported", async () => {
    const session = createWebSpeechSession({ lang: "pt-PT" }, { supported: false });
    const errors: string[] = [];
    session.onError((e) => errors.push(e));
    await session.start();
    expect(session.getState()).toBe("unsupported");
    expect(errors.length).toBe(1);
  });
});

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

type FakeAlternative = { transcript: string; confidence: number };

type FakeResultLike = {
  isFinal: boolean;
  length: number;
  item: (i: number) => FakeAlternative;
  [index: number]: FakeAlternative;
};

type AnyRecognitionResultListLike = {
  readonly length: number;
  item: (i: number) => FakeResultLike;
  [index: number]: FakeResultLike;
};

function makeResults(
  entries: Array<{ isFinal: boolean; alt: FakeAlternative }>,
): AnyRecognitionResultListLike {
  const results: FakeResultLike[] = entries.map((entry) => {
    const result = {
      isFinal: entry.isFinal,
      length: 1,
      item: () => entry.alt,
    } as FakeResultLike;
    Object.defineProperty(result, "0", { value: entry.alt, enumerable: false });
    return result;
  });
  const list: AnyRecognitionResultListLike = {
    length: results.length,
    item: (i: number) => results[i]!,
  };
  for (let i = 0; i < results.length; i += 1) {
    Object.defineProperty(list, String(i), { value: results[i], enumerable: false });
  }
  return list;
}

class FakeMediaRecorder {
  state: "inactive" | "recording" | "paused" = "inactive";
  mimeType = "audio/webm;codecs=opus";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: { error?: Error | DOMException }) => void) | null = null;
  onstart: (() => void) | null = null;
  startCalls: Array<number | undefined> = [];
  stopCalls = 0;
  dataChunks: Blob[];
  constructor(chunks: Blob[] = []) {
    this.dataChunks = chunks;
  }
  push(chunk: Blob): void {
    this.dataChunks.push(chunk);
  }
  start(timesliceMs?: number): void {
    this.startCalls.push(timesliceMs);
    this.state = "recording";
    this.onstart?.();
  }
  stop(): void {
    this.stopCalls += 1;
    this.state = "inactive";
    if (this.dataChunks.length > 0 && this.ondataavailable) {
      for (const chunk of this.dataChunks) this.ondataavailable({ data: chunk });
    }
    queueMicrotask(() => this.onstop?.());
  }
  pause(): void {
    this.state = "paused";
  }
  resume(): void {
    this.state = "recording";
  }
  requestData(): void {
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob([new Uint8Array(8)], { type: "audio/webm" }) });
    }
  }
}

const FakeMediaRecorderCtor = (() => {
  const instances: FakeMediaRecorder[] = [];
  class Wrapper {
    static isTypeSupported(mime: string): boolean {
      return mime.includes("webm");
    }
    static lastInstance(): FakeMediaRecorder | null {
      return instances[instances.length - 1] ?? null;
    }
    state: "inactive" | "recording" | "paused" = "inactive";
    mimeType = "audio/webm;codecs=opus";
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: ((event: { error?: Error | DOMException }) => void) | null = null;
    onstart: (() => void) | null = null;
    private chunks: Blob[] = [];
    constructor(_stream: unknown, options?: { mimeType?: string }) {
      if (options?.mimeType) this.mimeType = options.mimeType;
      instances.push(this as unknown as FakeMediaRecorder);
    }
    push(chunk: Blob): void {
      this.chunks.push(chunk);
    }
    start(_timesliceMs?: number): void {
      this.state = "recording";
      this.onstart?.();
    }
    stop(): void {
      this.state = "inactive";
      for (const chunk of this.chunks) {
        if (this.ondataavailable) this.ondataavailable({ data: chunk });
      }
      queueMicrotask(() => this.onstop?.());
    }
    pause(): void {
      this.state = "paused";
    }
    resume(): void {
      this.state = "recording";
    }
    requestData(): void {}
  }
  return Wrapper;
})();

class FakeAnalyser {
  fftSize = 1024;
  getByteTimeDomainData(array: Uint8Array): void {
    for (let i = 0; i < array.length; i += 1) array[i] = 128;
  }
}

class FakeAudioContext {
  analyser: FakeAnalyser = new FakeAnalyser();
  closed = false;
  createMediaStreamSource(): { connect(): void; disconnect(): void } {
    return { connect: () => undefined, disconnect: () => undefined };
  }
  createAnalyser(): FakeAnalyser {
    return this.analyser;
  }
  async close(): Promise<void> {
    this.closed = true;
  }
}

function makeMediaRecorderDeps(overrides: Partial<MediaRecorderDeps> = {}): MediaRecorderDeps {
  return {
    supported: true,
    MediaRecorderCtor: overrides.MediaRecorderCtor ?? FakeMediaRecorderCtor,
    AudioContextCtor: overrides.AudioContextCtor ?? (FakeAudioContext as never),
    getUserMedia:
      overrides.getUserMedia ??
      (async () => ({
        getTracks: () => [{ stop: () => undefined, kind: "audio", enabled: true }],
        getAudioTracks: () => [{ stop: () => undefined, kind: "audio", enabled: true }],
      })),
  };
}

describe("createMediaRecorderSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("flips to denied when getUserMedia throws NotAllowedError", async () => {
    const deniedError = Object.assign(new Error("Permission denied"), {
      name: "NotAllowedError",
    });
    const deps = makeMediaRecorderDeps({
      getUserMedia: async () => {
        throw deniedError;
      },
    });
    const session = createMediaRecorderSession(
      { lang: "pt-PT", silenceMs: 600 },
      deps,
    );
    const errors: string[] = [];
    session.onError((e) => errors.push(e));
    await session.start();
    expect(session.getState()).toBe("denied");
    expect(errors.length).toBe(1);
  });

  it("transitions to listening on a successful start", async () => {
    const session = createMediaRecorderSession(
      { lang: "pt-PT", silenceMs: 600 },
      makeMediaRecorderDeps(),
    );
    await session.start();
    expect(session.getState()).toBe("listening");
  });

  it("stops and produces a non-empty audio blob on user stop()", async () => {
    const session = createMediaRecorderSession(
      { lang: "pt-PT", silenceMs: 600 },
      makeMediaRecorderDeps(),
    );
    await session.start();
    const recorder = (FakeMediaRecorderCtor as unknown as { lastInstance: () => FakeMediaRecorder | null }).lastInstance();
    expect(recorder).not.toBeNull();
    if (recorder) {
      recorder.push(new Blob([new Uint8Array(64)], { type: "audio/webm" }));
    }
    const stopPromise = session.stop();
    await flushMicrotasks();
    const result = await stopPromise;
    expect(result.audioBlob).not.toBeNull();
    expect(result.audioBlob && result.audioBlob.size).toBe(64);
    expect(session.getState()).toBe("idle");
  });

  it("stops and produces a blob on silence after 600 ms", async () => {
    const session = createMediaRecorderSession(
      { lang: "pt-PT", silenceMs: 600 },
      makeMediaRecorderDeps(),
    );
    await session.start();
    const recorder = (FakeMediaRecorderCtor as unknown as { lastInstance: () => FakeMediaRecorder | null }).lastInstance();
    if (recorder) {
      recorder.push(new Blob([new Uint8Array(32)], { type: "audio/webm" }));
    }
    vi.advanceTimersByTime(700);
    await flushMicrotasks();
    expect(session.getState()).toBe("idle");
    const blob = session.getAudioBlob();
    expect(blob).not.toBeNull();
  });

  it("emits audio level samples", async () => {
    const session = createMediaRecorderSession(
      { lang: "pt-PT", silenceMs: 600 },
      makeMediaRecorderDeps(),
    );
    const levels: number[] = [];
    session.onAudioLevel((l) => levels.push(l));
    await session.start();
    vi.advanceTimersByTime(160);
    expect(levels.length).toBeGreaterThan(0);
  });

  it("returns unsupported state and an error when MediaRecorder is missing", async () => {
    const session = createMediaRecorderSession(
      { lang: "pt-PT", silenceMs: 600 },
      { ...makeMediaRecorderDeps(), supported: false, MediaRecorderCtor: undefined },
    );
    const errors: string[] = [];
    session.onError((e) => errors.push(e));
    await session.start();
    expect(session.getState()).toBe("unsupported");
    expect(errors.length).toBe(1);
  });
});
