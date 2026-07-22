"use client";

import type { LevelMismatch } from "@/lib/scenarios/adaptive";

const STYLES: Record<LevelMismatch["match"], string> = {
  core: "border-moss/30 bg-moss/10 text-moss",
  stretch: "border-amber-700/40 bg-amber-100/60 text-amber-900",
  review: "border-ink/15 bg-paper-warm/60 text-ink-soft",
};

export function LevelMismatchBadge({
  mismatch,
}: {
  mismatch: LevelMismatch;
}) {
  const symbol =
    mismatch.match === "stretch"
      ? "↑"
      : mismatch.match === "review"
        ? "↓"
        : "✓";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${STYLES[mismatch.match]}`}
      data-testid="scenario-level-mismatch"
      data-match={mismatch.match}
      data-distance={mismatch.distance}
    >
      <span aria-hidden>{symbol}</span>
      <span>{mismatch.label}</span>
      {mismatch.match !== "core" ? (
        <span className="font-mono text-[0.7rem] normal-case tracking-normal">
          {mismatch.distance > 0 ? `+${mismatch.distance}` : mismatch.distance}
        </span>
      ) : null}
    </span>
  );
}

export function LevelMismatchGuidance({ mismatch }: { mismatch: LevelMismatch }) {
  return (
    <p
      className="text-xs text-ink-mute"
      data-testid="scenario-level-mismatch-guidance"
    >
      {mismatch.guidance}
    </p>
  );
}