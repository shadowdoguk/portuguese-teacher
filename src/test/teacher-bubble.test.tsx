import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeacherBubble } from "@/components/practice/TeacherBubble";
import { DEFAULT_TTS_VOICE } from "@/lib/settings";

function okResponse(): Response {
  return new Response(
    JSON.stringify({
      ok: true,
      audioUrl: "data:audio/mpeg;base64,//uQw",
      contentType: "audio/mpeg",
      durationMs: 1500,
      mock: true,
      voiceId: DEFAULT_TTS_VOICE.id,
      dialect: "pt-PT",
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function degradedResponse(reason = "TTS is down: 503"): Response {
  return new Response(
    JSON.stringify({ ok: false, degraded: true, degradedReason: reason }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("TeacherBubble", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the utterance text in Portuguese", () => {
    render(
      <TeacherBubble
        utterance="Olá! Tudo bem?"
        voice={DEFAULT_TTS_VOICE}
        textOnly
      />,
    );
    const text = screen.getByText("Olá! Tudo bem?");
    expect(text.tagName).toBe("P");
    expect(text.getAttribute("lang")).toBe("pt-PT");
  });

  it("renders the replay button while audio is loading", async () => {
    const fetchMock = vi.fn(async () => okResponse());
    render(
      <TeacherBubble
        utterance="Olá!"
        voice={DEFAULT_TTS_VOICE}
        fetchImpl={fetchMock as unknown as typeof fetch}
      />,
    );
    const replay = screen.getByTestId("teacher-bubble-replay");
    expect(replay).toBeInTheDocument();
    expect(replay).toHaveAttribute("aria-label", "Replay teacher utterance");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces a degradation badge with retry when TTS is down", async () => {
    const fetchMock = vi.fn(async () => degradedResponse("TTS is down: 503"));
    render(
      <TeacherBubble
        utterance="Olá!"
        voice={DEFAULT_TTS_VOICE}
        fetchImpl={fetchMock as unknown as typeof fetch}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId("teacher-bubble-degraded")).toBeInTheDocument(),
    );
    expect(screen.getByText(/TTS unavailable/i)).toBeInTheDocument();
    expect(screen.getByTestId("teacher-bubble-retry")).toBeInTheDocument();
  });

  it("re-fetches when the retry button is pressed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(degradedResponse("TTS is down: 503"))
      .mockResolvedValueOnce(okResponse());
    render(
      <TeacherBubble
        utterance="Olá!"
        voice={DEFAULT_TTS_VOICE}
        fetchImpl={fetchMock as unknown as typeof fetch}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId("teacher-bubble-degraded")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("teacher-bubble-retry"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("renders text-only when textOnly is true (no audio fetch, no replay button)", async () => {
    const fetchMock = vi.fn(async () => okResponse());
    render(
      <TeacherBubble
        utterance="Olá!"
        voice={DEFAULT_TTS_VOICE}
        textOnly
        fetchImpl={fetchMock as unknown as typeof fetch}
      />,
    );
    expect(screen.queryByTestId("teacher-bubble-replay")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});