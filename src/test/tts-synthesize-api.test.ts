import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetHealthStateForTests } from "@/lib/observability/health";
import {
  consoleObservabilitySink,
  resetObservabilitySink,
  setObservabilitySink,
} from "@/lib/observability/sink";
import { POST as postSynthesize } from "@/app/api/tts/synthesize/route";
import {
  synthesizeFromBody,
  type TtsSynthesizeDeps,
} from "@/lib/tts/synthesize";
import { MiniMaxError, type TtsSynthesizeOptions, type TtsSynthesizeResult } from "@/lib/minimax/types";

beforeEach(() => {
  resetHealthStateForTests();
  resetObservabilitySink();
});

afterEach(() => {
  resetHealthStateForTests();
  resetObservabilitySink();
  vi.unstubAllGlobals();
});

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/tts/synthesize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const FAKE_AUDIO_BYTES = new Uint8Array([0xff, 0xfb, 0x90, 0x44, 0x00, 0x00]);

const FAKE_RESULT: TtsSynthesizeResult = {
  audio: new Blob([FAKE_AUDIO_BYTES], { type: "audio/mpeg" }),
  contentType: "audio/mpeg",
  durationMs: 1500,
};

function makeDeps(overrides: Partial<TtsSynthesizeDeps> = {}): TtsSynthesizeDeps {
  return {
    synthesizer:
      overrides.synthesizer ??
      (async (_text: string, _options: TtsSynthesizeOptions) => FAKE_RESULT),
    isMock: overrides.isMock ?? (() => true),
    encode:
      overrides.encode ??
      (async (blob: Blob) => {
        // jsdom's Blob doesn't expose arrayBuffer(); fall back to the
        // fake bytes (we know the test fixture produced them) for assertions.
        const bytes = FAKE_AUDIO_BYTES;
        const base64 = Buffer.from(bytes).toString("base64");
        return `data:${blob.type};base64,${base64}`;
      }),
  };
}

describe("POST /api/tts/synthesize (request-level validation)", () => {
  it("rejects malformed JSON with 400", async () => {
    const res = await postSynthesize(
      new Request("http://localhost/api/tts/synthesize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: false; degraded: true; degradedReason: string };
    expect(body.degraded).toBe(true);
    expect(body.degradedReason).toMatch(/JSON/);
  });
});

describe("synthesizeFromBody (pure logic)", () => {
  it("rejects an empty text payload with 400", async () => {
    const res = await synthesizeFromBody({ text: "  " }, makeDeps());
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: false; degradedReason: string };
    expect(body.degradedReason).toMatch(/text/);
  });

  it("rejects text longer than the 1000-character limit", async () => {
    const res = await synthesizeFromBody({ text: "x".repeat(1001) }, makeDeps());
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: false; degradedReason: string };
    expect(body.degradedReason).toMatch(/1000/);
  });

  it("falls back to the default voice when voiceId is missing", async () => {
    let receivedOptions!: TtsSynthesizeOptions;
    const deps = makeDeps({
      synthesizer: async (_text, options) => {
        receivedOptions = options;
        return FAKE_RESULT;
      },
    });
    const res = await synthesizeFromBody({ text: "Olá!" }, deps);
    expect(res.status).toBe(200);
    expect(receivedOptions.voice.id).toBe("minimax-pt-pt-female-1");
    expect(receivedOptions.voice.dialect).toBe("pt-PT");
  });

  it("falls back to the default voice when voiceId is unsupported", async () => {
    let receivedOptions!: TtsSynthesizeOptions;
    const deps = makeDeps({
      synthesizer: async (_text, options) => {
        receivedOptions = options;
        return FAKE_RESULT;
      },
    });
    const res = await synthesizeFromBody(
      { text: "Olá!", voiceId: "minimax-pt-pt-male-99" },
      deps,
    );
    expect(res.status).toBe(200);
    expect(receivedOptions.voice.id).toBe("minimax-pt-pt-female-1");
  });

  it("clamps an out-of-range speed to [0.5, 1.25]", async () => {
    const received: Array<TtsSynthesizeOptions> = [];
    const deps = makeDeps({
      synthesizer: async (_text, options) => {
        received.push(options);
        return FAKE_RESULT;
      },
    });
    await synthesizeFromBody({ text: "Olá!", speed: 5 }, deps);
    await synthesizeFromBody({ text: "Olá!", speed: 0 }, deps);
    expect(received[0]?.speed).toBe(1.25);
    expect(received[1]?.speed).toBe(0.5);
  });

  it("returns a base64 data URL on success", async () => {
    const res = await synthesizeFromBody({ text: "Olá!" }, makeDeps());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: true;
      audioUrl: string;
      contentType: string;
      durationMs: number;
      mock: boolean;
      voiceId: string;
      dialect: string;
    };
    expect(body.ok).toBe(true);
    expect(body.audioUrl.startsWith("data:audio/mpeg;base64,")).toBe(true);
    expect(body.contentType).toBe("audio/mpeg");
    expect(body.durationMs).toBe(1500);
    expect(body.mock).toBe(true);
    expect(body.voiceId).toBe("minimax-pt-pt-female-1");
    expect(body.dialect).toBe("pt-PT");
  });

  it("emits a degradation event and returns degraded when the synthesizer throws transiently", async () => {
    const stubSink = {
      name: "stub",
      emit: vi.fn(),
      flush: vi.fn(async () => undefined),
    };
    setObservabilitySink(stubSink);
    const deps = makeDeps({
      synthesizer: async () => {
        throw new MiniMaxError("TTS is down", 503, "tts");
      },
    });
    const res = await synthesizeFromBody({ text: "Olá!" }, deps);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: false;
      degraded: true;
      degradedReason: string;
    };
    expect(body.ok).toBe(false);
    expect(body.degraded).toBe(true);
    expect(body.degradedReason).toMatch(/TTS is down/);
    const kinds = stubSink.emit.mock.calls.map((c) => (c[0] as { kind: string }).kind);
    expect(kinds).toContain("voice_loop_error");
    expect(kinds).toContain("degradation");
  });

  it("rethrows non-transient MiniMaxError without degrading", async () => {
    const deps = makeDeps({
      synthesizer: async () => {
        throw new MiniMaxError("Bad request", 400, "tts");
      },
    });
    await expect(synthesizeFromBody({ text: "Olá!" }, deps)).rejects.toThrow(/Bad request/);
  });
});

describe("observability sink", () => {
  it("uses the console sink by default", () => {
    expect(consoleObservabilitySink.name).toBe("console");
  });
});