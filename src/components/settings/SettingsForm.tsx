"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { useSettings } from "@/lib/settings";
import {
  VOICE_SPEED_RANGE,
  WEEKLY_GOAL_RANGE,
  type CFTiming,
  type CaptionsPref,
  type ReducedMotionPref,
  type RetrievalMode,
} from "@/lib/settings";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { Slider } from "@/components/ui/Slider";
import { Select } from "@/components/ui/Select";

export function SettingsForm() {
  const { user } = useAuth();
  const { settings, update, reset } = useSettings();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!savedAt) return;
    const handle = window.setTimeout(() => setSavedAt(null), 2400);
    return () => window.clearTimeout(handle);
  }, [savedAt]);

  if (!user) {
    return (
      <Card eyebrow="Settings" title="Sign in to change settings">
        <p className="text-sm text-ink-soft">
          Settings travel with your account and shape how the AI teacher speaks,
          how often it corrects you, and what we retain.
        </p>
      </Card>
    );
  }

  function patchAndAck<T>(patch: Partial<typeof settings>) {
    update(patch);
    setSavedAt(new Date().toISOString());
  }

  return (
    <div className="space-y-8">
      <Card eyebrow="Voice" title="How the teacher sounds">
        <Slider
          label="Playback speed"
          value={settings.voiceSpeed}
          min={VOICE_SPEED_RANGE.min}
          max={VOICE_SPEED_RANGE.max}
          step={VOICE_SPEED_RANGE.step}
          onChange={(next) => patchAndAck({ voiceSpeed: next })}
          formatValue={(v) => `${v.toFixed(2)}×`}
          hint={`Slow it down when an utterance is hard. Default 1.00×; range ${VOICE_SPEED_RANGE.min}–${VOICE_SPEED_RANGE.max}.`}
        />
      </Card>

      <Card eyebrow="Feedback" title="When the teacher corrects you">
        <Select<CFTiming>
          label="Corrective feedback timing"
          value={settings.cfTiming}
          onChange={(next) => patchAndAck({ cfTiming: next })}
          options={[
            { value: "immediate", label: "Immediate — correct after each utterance" },
            { value: "end-of-conversation", label: "End-of-conversation — summarise at the end" },
          ]}
          hint="Default: immediate. FR-CP-3 toggles between per-turn corrections and a single end-of-turn summary."
        />
      </Card>

      <Card eyebrow="Accessibility" title="Captions, motion, text input">
        <div className="space-y-4">
          <Toggle
            checked={settings.captions === "on"}
            onChange={(next) => patchAndAck({ captions: (next ? "on" : "off") as CaptionsPref })}
            label="Captions on every TTS utterance"
            description="Show a transcript under the audio player. Default on."
          />
          <Select<ReducedMotionPref>
            label="Reduced motion"
            value={settings.reducedMotion}
            onChange={(next) => patchAndAck({ reducedMotion: next })}
            options={[
              { value: "auto", label: "Follow system preference" },
              { value: "reduce", label: "Always reduce motion" },
              { value: "no-preference", label: "Always allow motion" },
            ]}
            hint="Default: auto. We honour your OS setting unless you override."
          />
          <Toggle
            checked={settings.textOnlyMode}
            onChange={(next) => patchAndAck({ textOnlyMode: next })}
            label="Text-only mode"
            description="Replace audio input with text everywhere. Useful in quiet environments or for hearing accessibility."
          />
          <Select<RetrievalMode>
            label="Review-card retrieval combination"
            value={settings.retrievalMode}
            onChange={(next) => patchAndAck({ retrievalMode: next })}
            options={[
              { value: "text", label: "Text only" },
              { value: "text+audio", label: "Text + audio (default)" },
              { value: "text+image", label: "Text + image" },
              { value: "text+audio+image", label: "Text + audio + image" },
            ]}
            hint="Default: text+audio. Honours Zhang et al. (2021) multimodal retrieval; image assets are placeholders until the image pipeline lands."
            disabled={settings.textOnlyMode}
            data-testid="settings-retrieval-mode"
          />
        </div>
      </Card>

      <Card eyebrow="Goal" title="Weekly practice goal">
        <Slider
          label="Minutes per week"
          value={settings.weeklyGoalMinutes}
          min={WEEKLY_GOAL_RANGE.min}
          max={WEEKLY_GOAL_RANGE.max}
          step={WEEKLY_GOAL_RANGE.step}
          onChange={(next) => patchAndAck({ weeklyGoalMinutes: next })}
          formatValue={(v) => `${Math.round(v)} min`}
          hint="Roughly 15 minutes a day. Lower if you have less time; we adapt the lesson plan."
        />
      </Card>

      <Card eyebrow="Privacy" title="What we keep on file">
        <div className="space-y-4">
          <Toggle
            checked={settings.voiceRecordingOptIn}
            onChange={(next) => patchAndAck({ voiceRecordingOptIn: next })}
            label="Retain my voice recordings (opt-in)"
            description="Default OFF. When on, recordings are encrypted at rest and deletable from Settings. Used to let you review your own pronunciation."
          />
          <Toggle
            checked={settings.confidenceCheckinOptIn}
            onChange={(next) => patchAndAck({ confidenceCheckinOptIn: next })}
            label="Weekly confidence check-in (opt-in)"
            description="A 1–5 self-rating once a week. Feeds the Affective Filter proxy internally; never shown on your dashboard."
          />
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-h-[1.25rem]" aria-live="polite">
          {savedAt ? <p className="text-sm text-moss">Saved.</p> : null}
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            setSavedAt(new Date().toISOString());
          }}
          className="btn-ghost"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
