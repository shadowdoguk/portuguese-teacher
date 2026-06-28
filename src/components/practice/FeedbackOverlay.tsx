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

const SOURCE_LABEL: Record<NonNullable<VoiceLoopTurn["pronunciationSource"]>, string> = {
  endpoint: "Phoneme-distance",
  "asr-bias": "ASR confidence",
  default: "Default estimate",
};

export function FeedbackOverlay({ turn }: { turn: VoiceLoopTurn }) {
  return (
    <div className="space-y-4" data-testid="feedback-overlay">
      <div className="flex flex-wrap items-center gap-3">
        <span className="stage-stamp">Pronunciation score</span>
        <PronunciationScoreBar score={turn.pronunciationScore} />
        <span
          className="text-xs text-ink-mute"
          data-testid="pronunciation-source"
          title="How the score was computed"
        >
          Source: {SOURCE_LABEL[turn.pronunciationSource ?? "default"]}
        </span>
        <span className="text-xs text-ink-mute">
          Comprehension: {turn.comprehensionOk ? "OK" : "Retry"}
        </span>
        <span className="text-xs text-ink-mute">
          i+1 target: <strong>{turn.nextDifficultyTarget.toFixed(2)}</strong>
        </span>
      </div>
      {turn.pronunciationSource === "endpoint" && turn.pronunciationPerPhoneme?.length ? (
        <PronunciationPhonemeList items={turn.pronunciationPerPhoneme} />
      ) : null}
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

function PronunciationScoreBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div
      role="progressbar"
      aria-label="Pronunciation score"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${clamped} out of 100`}
      className="relative flex h-7 w-44 items-center overflow-hidden rounded-full border border-ink/15 bg-paper-deep/40"
      data-testid="pronunciation-bar"
      data-score={clamped}
    >
      <span
        className="absolute inset-y-0 left-0 bg-terracotta/70 transition-[width] duration-300"
        style={{ width: `${clamped}%` }}
        aria-hidden
      />
      <span className="relative z-10 px-3 font-display text-sm text-ink">
        {clamped}
        <span className="text-xs text-ink-mute"> / 100</span>
      </span>
    </div>
  );
}

function PronunciationPhonemeList({
  items,
}: {
  items: ReadonlyArray<{ phoneme: string; score: number; start: number; end: number }>;
}) {
  return (
    <ul
      className="flex flex-wrap gap-2"
      data-testid="pronunciation-phonemes"
      aria-label="Per-phoneme pronunciation breakdown"
    >
      {items.map((item, i) => {
        const tone = item.score >= 80 ? "border-ink/15 bg-paper" : "border-terracotta bg-paper-warm";
        return (
          <li
            key={i}
            className={`flex items-center gap-2 rounded-md border px-2 py-1 ${tone}`}
            data-testid="pronunciation-phoneme"
            data-phoneme={item.phoneme}
            data-score={item.score}
          >
            <span className="font-display text-sm text-ink">/{item.phoneme}/</span>
            <span className="text-xs text-ink-mute">{item.score}</span>
          </li>
        );
      })}
    </ul>
  );
}
