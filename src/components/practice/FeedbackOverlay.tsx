"use client";

import type { FeedbackItem, VoiceLoopTurn } from "@/lib/voice-loop";

const KIND_LABEL: Record<FeedbackItem["kind"], string> = {
  corrective: "Correction",
  confirmatory: "Nice",
  formative: "Try",
};

const KIND_TONE: Record<FeedbackItem["kind"], string> = {
  corrective: "border-terracotta bg-paper-warm",
  confirmatory: "border-ink/10 bg-paper",
  formative: "border-ink/10 bg-paper-deep/40",
};

export function FeedbackOverlay({ turn }: { turn: VoiceLoopTurn }) {
  return (
    <div className="space-y-4" data-testid="feedback-overlay">
      <div className="flex flex-wrap items-center gap-3">
        <span className="stage-stamp">Pronunciation score</span>
        <span className="font-display text-2xl text-ink" data-testid="pronunciation-score">
          {turn.pronunciationScore}
          <span className="text-sm text-ink-mute"> / 100</span>
        </span>
        <span className="text-xs text-ink-mute">
          Comprehension: {turn.comprehensionOk ? "OK" : "Retry"}
        </span>
        <span className="text-xs text-ink-mute">
          i+1 target: <strong>{turn.nextDifficultyTarget.toFixed(2)}</strong>
        </span>
      </div>
      {turn.feedback.length === 0 ? (
        <p className="text-sm text-ink-mute">No specific feedback for this turn — keep going.</p>
      ) : (
        <ul className="space-y-2">
          {turn.feedback.map((item, i) => (
            <li
              key={i}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${KIND_TONE[item.kind]}`}
              data-testid="feedback-item"
              data-kind={item.kind}
            >
              <span className="stage-stamp min-w-[5rem]">{KIND_LABEL[item.kind]}</span>
              <div className="flex-1">
                <p className="text-pretty text-ink">{item.text}</p>
                {item.errorCategory ? (
                  <p className="text-xs text-ink-mute">{item.errorCategory}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
