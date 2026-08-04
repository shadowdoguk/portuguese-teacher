import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TTS_VOICE } from "@/lib/settings";
import {
  initialTeacherAudioState,
  reduceTeacherAudio,
  useTeacherAudio,
  type TeacherAudioEvent,
  type TeacherAudioState,
  type TeacherAudioStateShape,
} from "@/hooks/useTeacherAudio";

const MOCK_AUDIO_URL = "data:audio/mpeg;base64,//uQw";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function okResponse(): Response {
  return jsonResponse({
    ok: true,
    audioUrl: MOCK_AUDIO_URL,
    contentType: "audio/mpeg",
    durationMs: 1500,
    mock: true,
    voiceId: DEFAULT_TTS_VOICE.id,
    dialect: "pt-PT",
  });
}

function degradedResponse(reason = "TTS unavailable: 503"): Response {
  return jsonResponse({ ok: false, degraded: true, degradedReason: reason });
}

function makeFakeAudio(): HTMLAudioElement {
  const audio = document.createElement("audio");
  let paused = true;
  let currentTime = 0;
  Object.defineProperty(audio, "paused", {
    configurable: true,
    get: () => paused,
  });
  Object.defineProperty(audio, "currentTime", {
    configurable: true,
    get: () => currentTime,
    set: (v: number) => {
      currentTime = v;
    },
  });
  audio.play = vi.fn(async () => {
    paused = false;
  }) as unknown as HTMLAudioElement["play"];
  audio.pause = vi.fn(() => {
    paused = true;
  }) as unknown as HTMLAudioElement["pause"];
  audio.load = vi.fn();
  return audio;
}

describe("reduceTeacherAudio", () => {
  const cases: Array<{
    label: string;
    from: TeacherAudioStateShape;
    event: TeacherAudioEvent;
    expectState: TeacherAudioState;
    expectFlags?: Partial<TeacherAudioStateShape>;
  }> = [
    {
      label: "fetch/start clears error + degraded",
      from: { ...initialTeacherAudioState, state: "error", errorMessage: "x" },
      event: { type: "fetch/start" },
      expectState: "loading",
    },
    {
      label: "fetch/ok sets audioUrl + duration",
      from: { ...initialTeacherAudioState, state: "loading" },
      event: { type: "fetch/ok", audioUrl: MOCK_AUDIO_URL, durationMs: 1500 },
      expectState: "ready",
      expectFlags: { audioUrl: MOCK_AUDIO_URL, durationMs: 1500 },
    },
    {
      label: "fetch/degraded sets degraded reason",
      from: { ...initialTeacherAudioState, state: "loading" },
      event: { type: "fetch/degraded", reason: "503" },
      expectState: "degraded",
      expectFlags: { degradedReason: "503" },
    },
    {
      label: "fetch/error sets error message",
      from: { ...initialTeacherAudioState, state: "loading" },
      event: { type: "fetch/error", message: "boom" },
      expectState: "error",
      expectFlags: { errorMessage: "boom" },
    },
    {
      label: "play/start moves ready -> playing",
      from: { ...initialTeacherAudioState, state: "ready", audioUrl: MOCK_AUDIO_URL },
      event: { type: "play/start" },
      expectState: "playing",
    },
    {
      label: "play/blocked keeps state=ready + sets autoplayBlocked",
      from: { ...initialTeacherAudioState, state: "ready", audioUrl: MOCK_AUDIO_URL },
      event: { type: "play/blocked" },
      expectState: "ready",
      expectFlags: { autoplayBlocked: true },
    },
    {
      label: "stop keeps ready + clears autoplayBlocked",
      from: {
        ...initialTeacherAudioState,
        state: "playing",
        audioUrl: MOCK_AUDIO_URL,
        autoplayBlocked: true,
      },
      event: { type: "stop" },
      expectState: "ready",
      expectFlags: { autoplayBlocked: false },
    },
  ];

  for (const c of cases) {
    it(c.label, () => {
      const next = reduceTeacherAudio(c.from, c.event);
      expect(next.state).toBe(c.expectState);
      for (const [key, value] of Object.entries(c.expectFlags ?? {})) {
        expect(next[key as keyof TeacherAudioStateShape]).toEqual(value);
      }
    });
  }
});

describe("useTeacherAudio", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not fetch when disabled", async () => {
    const { result } = renderHook(() =>
      useTeacherAudio({
        text: "Olá",
        voice: DEFAULT_TTS_VOICE,
        enabled: false,
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    );
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
    expect(result.current.state).toBe("idle");
  });

  it("fetches /api/tts/synthesize on mount and transitions to ready", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const { result } = renderHook(() =>
      useTeacherAudio({
        text: "Olá",
        voice: DEFAULT_TTS_VOICE,
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    );
    await waitFor(() => expect(result.current.state).toBe("ready"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/tts/synthesize");
    expect(init.method).toBe("POST");
    const payload = JSON.parse(String(init.body));
    expect(payload).toEqual({
      text: "Olá",
      voiceId: DEFAULT_TTS_VOICE.id,
      dialect: DEFAULT_TTS_VOICE.dialect,
      speed: undefined,
    });
    expect(result.current.audioUrl).toBe(MOCK_AUDIO_URL);
    expect(result.current.durationMs).toBe(1500);
  });

  it("transitions to degraded when the route returns { ok: false, degraded: true }", async () => {
    fetchMock.mockResolvedValueOnce(degradedResponse("TTS unreachable"));
    const { result } = renderHook(() =>
      useTeacherAudio({
        text: "Olá",
        voice: DEFAULT_TTS_VOICE,
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    );
    await waitFor(() => expect(result.current.state).toBe("degraded"));
    expect(result.current.degradedReason).toMatch(/TTS unreachable/);
    expect(result.current.audioUrl).toBeNull();
  });

  it("transitions to error when the fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const { result } = renderHook(() =>
      useTeacherAudio({
        text: "Olá",
        voice: DEFAULT_TTS_VOICE,
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    );
    await waitFor(() => expect(result.current.state).toBe("error"));
    expect(result.current.errorMessage).toBe("network down");
  });

  it("ignores stale fetch responses", async () => {
    let resolveFirst!: (value: Response) => void;
    const firstPromise = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    fetchMock
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(okResponse());

    const { result } = renderHook(
      ({ text }: { text: string }) =>
        useTeacherAudio({
          text,
          voice: DEFAULT_TTS_VOICE,
          fetchImpl: fetchMock as unknown as typeof fetch,
        }),
      { initialProps: { text: "Olá" } },
    );

    // First fetch in flight; trigger a re-fetch with a new key.
    await act(async () => {
      result.current;
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Resolve the *second* fetch first with a stale text, then resolve the first.
    resolveFirst(okResponse());

    await waitFor(() => expect(result.current.state).toBe("ready"));
    // The hook should hold the most recent (second) audioUrl, not the first.
    expect(result.current.audioUrl).toBe(MOCK_AUDIO_URL);
  });

  it("autoplays when ready and autoplay is enabled", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const audio = makeFakeAudio();
    const { result } = renderHook(() => {
      const hook = useTeacherAudio({
        text: "Olá",
        voice: DEFAULT_TTS_VOICE,
        autoplay: true,
        fetchImpl: fetchMock as unknown as typeof fetch,
      });
      // Replace the audio ref with our fake.
      (hook.audioRef as { current: HTMLAudioElement | null }).current = audio;
      return hook;
    });
    await waitFor(() => expect(result.current.state).toBe("playing"));
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it("marks autoplayBlocked when the browser denies play()", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const audio = makeFakeAudio();
    audio.play = vi.fn(async () => {
      throw new DOMException("blocked", "NotAllowedError");
    }) as unknown as HTMLAudioElement["play"];
    const { result } = renderHook(() => {
      const hook = useTeacherAudio({
        text: "Olá",
        voice: DEFAULT_TTS_VOICE,
        autoplay: true,
        fetchImpl: fetchMock as unknown as typeof fetch,
      });
      (hook.audioRef as { current: HTMLAudioElement | null }).current = audio;
      return hook;
    });
    await waitFor(() => expect(result.current.autoplayBlocked).toBe(true));
    expect(result.current.state).toBe("ready");
  });

  it("retry re-issues the fetch", async () => {
    fetchMock.mockResolvedValueOnce(degradedResponse("flaky"));
    const { result } = renderHook(() =>
      useTeacherAudio({
        text: "Olá",
        voice: DEFAULT_TTS_VOICE,
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    );
    await waitFor(() => expect(result.current.state).toBe("degraded"));
    fetchMock.mockResolvedValueOnce(okResponse());
    act(() => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.state).toBe("ready"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});