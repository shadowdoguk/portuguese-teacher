"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";
import { useSettings } from "@/lib/settings";
import { useAffective } from "@/lib/affective";
import { Card } from "@/components/ui/Card";

const RATINGS: { value: 1 | 2 | 3 | 4 | 5; label: string; emoji: string }[] = [
  { value: 1, label: "Anxious", emoji: "😟" },
  { value: 2, label: "Hesitant", emoji: "😕" },
  { value: 3, label: "Neutral", emoji: "😐" },
  { value: 4, label: "Confident", emoji: "🙂" },
  { value: 5, label: "Fluent", emoji: "😄" },
];

export function ConfidenceCheckin() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { record } = useAffective();
  const [submitted, setSubmitted] = useState<{ rating: 1 | 2 | 3 | 4 | 5 } | null>(null);

  useEffect(() => {
    setSubmitted(null);
  }, [settings.confidenceCheckinOptIn]);

  if (!settings.confidenceCheckinOptIn) {
    return null;
  }

  if (!user) {
    return (
      <Card eyebrow="Confidence" title="Sign in to record a check-in">
        <p className="text-sm text-ink-soft">
          Weekly self-reported confidence check-ins feed the Affective Filter
          proxy internally — they are never shown on your dashboard.
        </p>
        <Link href="/log-in" className="mt-4 inline-block btn-ghost">
          Log in
        </Link>
      </Card>
    );
  }

  function submit(rating: 1 | 2 | 3 | 4 | 5) {
    record({ kind: "confidence-checkin", source: "self-report", rating });
    setSubmitted({ rating });
  }

  if (submitted) {
    const r = RATINGS.find((x) => x.value === submitted.rating)!;
    return (
      <Card eyebrow="Confidence" title={`Recorded: ${r.label}`}>
        <p className="text-sm text-ink-soft">
          Thanks — your self-report adjusts the AI teacher&apos;s warmth
          calibration. The score stays internal.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(null)}
          className="mt-4 btn-ghost"
        >
          Record another
        </button>
      </Card>
    );
  }

  return (
    <Card eyebrow="Confidence" title="How confident did you feel this week?">
      <p className="text-sm text-ink-soft">
        Pick a face. This feeds the Affective Filter proxy — internal signal
        only, never shown on your dashboard.
      </p>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => submit(r.value)}
            aria-label={r.label}
            className="flex flex-col items-center gap-1 rounded-xl border border-ink/10 bg-paper px-2 py-3 transition-colors duration-200 hover:border-terracotta hover:bg-terracotta/5 focus-visible:border-terracotta focus-visible:outline-none"
          >
            <span aria-hidden className="text-2xl">{r.emoji}</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-ink-mute">{r.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
