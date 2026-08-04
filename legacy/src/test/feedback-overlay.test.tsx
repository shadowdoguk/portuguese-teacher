import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeedbackOverlay } from "@/components/practice/FeedbackOverlay";
import type { VoiceLoopTurn } from "@/lib/voice-loop";

function buildTurn(overrides: Partial<VoiceLoopTurn> = {}): VoiceLoopTurn {
  return {
    turnId: "t-1",
    utteranceId: "u-1",
    teacherUtterance: "olá",
    feedback: [],
    pronunciationScore: 82,
    pronunciationSource: "endpoint",
    pronunciationPerPhoneme: [
      { phoneme: "o", score: 90, start: 0, end: 0.2 },
      { phoneme: "l", score: 70, start: 0.2, end: 0.4 },
      { phoneme: "á", score: 86, start: 0.4, end: 0.6 },
    ],
    nextDifficultyTarget: 1.2,
    comprehensionOk: true,
    generatedAt: 0,
    mock: true,
    ...overrides,
  };
}

describe("FeedbackOverlay", () => {
  it("renders the score with an accessible progressbar role", () => {
    render(<FeedbackOverlay turn={buildTurn()} />);
    const bar = screen.getByRole("progressbar", { name: /pronunciation score/i });
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute("aria-valuenow", "82");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("renders per-phoneme feedback in drill mode", () => {
    render(<FeedbackOverlay turn={buildTurn({ pronunciationSource: "endpoint" })} />);
    expect(screen.getByTestId("pronunciation-phonemes")).toBeInTheDocument();
    expect(screen.getAllByTestId("pronunciation-phoneme")).toHaveLength(3);
  });

  it("hides the per-phoneme list when the score came from ASR bias only", () => {
    render(
      <FeedbackOverlay
        turn={buildTurn({
          pronunciationSource: "asr-bias",
          pronunciationPerPhoneme: undefined,
        })}
      />,
    );
    expect(screen.queryByTestId("pronunciation-phonemes")).toBeNull();
  });

  it("shows the pronunciation source as a status indicator", () => {
    render(
      <FeedbackOverlay
        turn={buildTurn({ pronunciationSource: "asr-bias" })}
      />,
    );
    expect(screen.getByTestId("pronunciation-source")).toHaveTextContent(/asr/i);
  });

  it("uses a fallback indicator when no source is present", () => {
    render(
      <FeedbackOverlay
        turn={buildTurn({ pronunciationSource: undefined })}
      />,
    );
    expect(screen.getByTestId("pronunciation-source")).toHaveTextContent(/default/i);
  });
});