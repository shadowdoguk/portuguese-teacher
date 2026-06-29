import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetHealthStateForTests } from "@/lib/observability/health";
import {
  consoleObservabilitySink,
  resetObservabilitySink,
  setObservabilitySink,
} from "@/lib/observability/sink";
import { POST as postTranscribe } from "@/app/api/asr/transcribe/route";
import {
  transcribeFromForm,
  type AsrTranscribeDeps,
} from "@/lib/asr/transcribe";
import type {
  AsrTranscribeResult,
  AsrTranscribeOptions,
  AsrWord,
} from "@/lib/minimax/types";

beforeEach(() => {
  resetHealthStateForTests();
  resetObservabilitySink();
});

afterEach(() => {
  resetHealthStateForTests();
  resetObservabilitySink();
  vi.unstubAllGlobals();
});

function plainRequest(body: string, contentType: string): Request {
  return new Request("http://localhost/api/asr/transcribe", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

const FAKE_WORDS_INTERNAL: AsrWord[] = [
  { word: "olá", start: 0, end: 0.4, confidence: 0.95 },
];

const FAKE_RESULT: AsrTranscribeResult = {
  text: "olá",
  words: FAKE_WORDS_INTERNAL,
  confidence: 0.95,
  languageDetected: "pt-PT",
};

function makeDeps(overrides: Partial<AsrTranscribeDeps> = {}): AsrTranscribeDeps {
  return {
    transcriber:
      overrides.transcriber ??
      (async (_audio: Blob, _options: AsrTranscribeOptions) => FAKE_RESULT),
    isMock: overrides.isMock ?? (() => true),
    resolveBiasing: overrides.resolveBiasing,
  };
}

describe("POST /api/asr/transcribe (request-level validation)", () => {
  it("rejects non-multipart content types with 400", async () => {
    const res = await postTranscribe(plainRequest("hello", "text/plain"));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: false; error: string };
    expect(body.error).toMatch(/multipart/);
  });

  it("rejects malformed multipart bodies with 400", async () => {
    const res = await postTranscribe(plainRequest("not-a-real-boundary", "multipart/form-data"));
    expect(res.status).toBe(400);
  });
});

describe("transcribeFromForm (pure logic)", () => {
  it("rejects form data without an audio file part", async () => {
    const form = new FormData();
    form.append("lang", "pt-PT");
    const res = await transcribeFromForm(form, makeDeps());
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: false; error: string };
    expect(body.error).toMatch(/audio/);
  });

  it("rejects an empty audio payload with 400", async () => {
    const form = new FormData();
    form.append("audio", new Blob([], { type: "audio/webm" }), "u.webm");
    form.append("lang", "pt-PT");
    const res = await transcribeFromForm(form, makeDeps());
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: false; error: string };
    expect(body.error).toMatch(/Empty/);
  });

  it("normalises an unsupported lang to pt-PT and calls the transcriber with it", async () => {
    let receivedLang: AsrTranscribeOptions["lang"] | null = null;
    const deps = makeDeps({
      transcriber: async (_audio, options) => {
        receivedLang = options.lang;
        return { ...FAKE_RESULT, languageDetected: options.lang };
      },
    });
    const form = new FormData();
    form.append("audio", new Blob([new Uint8Array(2048)], { type: "audio/webm" }), "u.webm");
    form.append("lang", "en-US");
    const res = await transcribeFromForm(form, deps);
    expect(res.status).toBe(200);
    expect(receivedLang).toBe("pt-PT");
    const body = (await res.json()) as {
      ok: boolean;
      languageDetected: string;
      mock: boolean;
      text: string;
    };
    expect(body.ok).toBe(true);
    expect(body.languageDetected).toBe("pt-PT");
    expect(body.text).toBe("olá");
    expect(body.mock).toBe(true);
  });

  it("returns the canonical transcript + words from a successful call", async () => {
    const deps = makeDeps();
    const form = new FormData();
    form.append("audio", new Blob([new Uint8Array(2048)], { type: "audio/webm" }), "u.webm");
    form.append("lang", "pt-PT");
    const res = await transcribeFromForm(form, deps);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      text: string;
      confidence: number;
      languageDetected: string;
      words: ReadonlyArray<{ word: string; confidence: number; startMs: number; endMs: number }>;
      mock: boolean;
      lowConfidence: boolean;
      biasingApplied: boolean;
      biasingSize: number;
    };
    expect(body.ok).toBe(true);
    expect(body.text).toBe("olá");
    expect(body.confidence).toBe(0.95);
    expect(body.languageDetected).toBe("pt-PT");
    expect(body.words).toEqual([
      { word: "olá", confidence: 0.95, startMs: 0, endMs: 400 },
    ]);
    expect(body.lowConfidence).toBe(false);
    expect(body.biasingApplied).toBe(false);
    expect(body.biasingSize).toBe(0);
  });

  it("emits a degradation event and returns degraded when the transcriber throws transiently", async () => {
    const stubSink = {
      name: "stub",
      emit: vi.fn(),
      flush: vi.fn(async () => undefined),
    };
    setObservabilitySink(stubSink);
    const { MiniMaxError } = await import("@/lib/minimax/types");
    const deps = makeDeps({
      transcriber: async () => {
        throw new MiniMaxError("ASR is down", 503, "asr");
      },
    });
    const form = new FormData();
    form.append("audio", new Blob([new Uint8Array(2048)], { type: "audio/webm" }), "u.webm");
    form.append("lang", "pt-PT");
    const res = await transcribeFromForm(form, deps);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      degraded?: boolean;
      degradedReason?: string;
    };
    expect(body.ok).toBe(false);
    expect(body.degraded).toBe(true);
    expect(body.degradedReason).toMatch(/ASR is down/);
    const kinds = stubSink.emit.mock.calls.map((c) => (c[0] as { kind: string }).kind);
    expect(kinds).toContain("voice_loop_error");
    expect(kinds).toContain("degradation");
  });

  it("rethrows non-transient MiniMaxError without degrading", async () => {
    const { MiniMaxError } = await import("@/lib/minimax/types");
    const deps = makeDeps({
      transcriber: async () => {
        throw new MiniMaxError("Bad request", 400, "asr");
      },
    });
    const form = new FormData();
    form.append("audio", new Blob([new Uint8Array(2048)], { type: "audio/webm" }), "u.webm");
    form.append("lang", "pt-PT");
    await expect(transcribeFromForm(form, deps)).rejects.toThrow(/Bad request/);
  });

  it("honours the isMock flag in the response", async () => {
    const deps = makeDeps({ isMock: () => false });
    const form = new FormData();
    form.append("audio", new Blob([new Uint8Array(2048)], { type: "audio/webm" }), "u.webm");
    form.append("lang", "pt-PT");
    const res = await transcribeFromForm(form, deps);
    const body = (await res.json()) as { mock: boolean };
    expect(body.mock).toBe(false);
  });
});

describe("transcribeFromForm — biasing + low-confidence", () => {
  it("passes resolved hotwords to the transcriber when resolveBiasing returns present: true", async () => {
    const capture: { options: AsrTranscribeOptions | null } = { options: null };
    const deps = makeDeps({
      transcriber: async (_audio, options) => {
        capture.options = options;
        return FAKE_RESULT;
      },
      resolveBiasing: async (unitId) => ({
        unitId,
        words: ["café", "leite"],
        present: true,
      }),
    });
    const form = new FormData();
    form.append("audio", new Blob([new Uint8Array(2048)], { type: "audio/webm" }), "u.webm");
    form.append("lang", "pt-PT");
    form.append("unitId", "unit-cafe");
    const res = await transcribeFromForm(form, deps);
    expect(res.status).toBe(200);
    expect(capture.options?.hotwords).toEqual(["café", "leite"]);
    const body = (await res.json()) as {
      biasingApplied: boolean;
      biasingSize: number;
    };
    expect(body.biasingApplied).toBe(true);
    expect(body.biasingSize).toBe(2);
  });

  it("does not pass hotwords when resolveBiasing returns present: false", async () => {
    const capture: { options: AsrTranscribeOptions | null } = { options: null };
    const deps = makeDeps({
      transcriber: async (_audio, options) => {
        capture.options = options;
        return FAKE_RESULT;
      },
      resolveBiasing: async (unitId) => ({ unitId, words: [], present: false }),
    });
    const form = new FormData();
    form.append("audio", new Blob([new Uint8Array(2048)], { type: "audio/webm" }), "u.webm");
    form.append("lang", "pt-PT");
    form.append("unitId", "unit-empty");
    const res = await transcribeFromForm(form, deps);
    expect(capture.options?.hotwords).toBeUndefined();
    const body = (await res.json()) as {
      biasingApplied: boolean;
      biasingSize: number;
    };
    expect(body.biasingApplied).toBe(false);
    expect(body.biasingSize).toBe(0);
  });

  it("does not pass hotwords when no unitId is in the form", async () => {
    const capture: { options: AsrTranscribeOptions | null } = { options: null };
    const resolveCalls: string[] = [];
    const deps = makeDeps({
      transcriber: async (_audio, options) => {
        capture.options = options;
        return FAKE_RESULT;
      },
      resolveBiasing: async (unitId) => {
        resolveCalls.push(unitId);
        return { unitId, words: ["café"], present: true };
      },
    });
    const form = new FormData();
    form.append("audio", new Blob([new Uint8Array(2048)], { type: "audio/webm" }), "u.webm");
    form.append("lang", "pt-PT");
    await transcribeFromForm(form, deps);
    expect(resolveCalls).toEqual([]);
    expect(capture.options?.hotwords).toBeUndefined();
  });

  it("ignores blank unitId strings and does not call resolveBiasing", async () => {
    let resolveCalls = 0;
    const capture: { options: AsrTranscribeOptions | null } = { options: null };
    const deps = makeDeps({
      transcriber: async (_audio, options) => {
        capture.options = options;
        return FAKE_RESULT;
      },
      resolveBiasing: async () => {
        resolveCalls += 1;
        return { unitId: "", words: ["x"], present: true };
      },
    });
    const form = new FormData();
    form.append("audio", new Blob([new Uint8Array(2048)], { type: "audio/webm" }), "u.webm");
    form.append("lang", "pt-PT");
    form.append("unitId", "   ");
    await transcribeFromForm(form, deps);
    expect(resolveCalls).toBe(0);
    expect(capture.options?.hotwords).toBeUndefined();
  });

  it("flags lowConfidence=true when the aggregate confidence is below 0.6", async () => {
    const deps = makeDeps({
      transcriber: async () => ({ ...FAKE_RESULT, confidence: 0.42 }),
    });
    const form = new FormData();
    form.append("audio", new Blob([new Uint8Array(2048)], { type: "audio/webm" }), "u.webm");
    form.append("lang", "pt-PT");
    const res = await transcribeFromForm(form, deps);
    const body = (await res.json()) as { lowConfidence: boolean; confidence: number };
    expect(body.lowConfidence).toBe(true);
    expect(body.confidence).toBe(0.42);
  });

  it("flags lowConfidence=false at exactly 0.6", async () => {
    const deps = makeDeps({
      transcriber: async () => ({ ...FAKE_RESULT, confidence: 0.6 }),
    });
    const form = new FormData();
    form.append("audio", new Blob([new Uint8Array(2048)], { type: "audio/webm" }), "u.webm");
    form.append("lang", "pt-PT");
    const res = await transcribeFromForm(form, deps);
    const body = (await res.json()) as { lowConfidence: boolean };
    expect(body.lowConfidence).toBe(false);
  });
});

describe("observability sink", () => {
  it("uses the console sink by default", () => {
    expect(consoleObservabilitySink.name).toBe("console");
  });
});
