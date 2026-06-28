"use client";

import type { VoiceLoopTierCapabilities } from "@/lib/voice-loop";
import { tierForLabel } from "@/lib/voice-loop";

export function TierBadge({ capabilities }: { capabilities: VoiceLoopTierCapabilities | null }) {
  if (!capabilities) {
    return (
      <span className="pill" data-testid="tier-badge">
        Probing browser capabilities…
      </span>
    );
  }
  const colour =
    capabilities.tier === 1 ? "bg-terracotta" : capabilities.tier === 2 ? "bg-ink" : "bg-ink-mute";
  return (
    <span className="pill" data-testid="tier-badge" data-tier={capabilities.tier}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${colour}`} />
      {tierForLabel(capabilities.tier)}
    </span>
  );
}
