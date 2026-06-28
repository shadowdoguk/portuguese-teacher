import { ConfidenceCheckin } from "@/components/confidence/ConfidenceCheckin";
import { PresenceTracker } from "@/components/lesson/PresenceTracker";
import { Card } from "@/components/ui/Card";

export default function ConfidencePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="stage-stamp">Confidence check-in</span>
        <h1 className="text-display-md font-display font-light text-pretty">
          How are you feeling about Portuguese?
        </h1>
      </header>

      <PresenceTracker />
      <ConfidenceCheckin />

      <Card eyebrow="Privacy" title="This stays internal">
        <p className="text-sm text-ink-soft">
          Your self-reported confidence adjusts the AI teacher&apos;s warmth
          calibration. Per ADR-0001, the Affective Filter proxy is an internal
          signal — not a feature exposed to Learners in v1.
        </p>
        <p className="mt-3 text-xs text-ink-mute">
          Toggle off in Settings → Privacy to stop recording check-ins.
        </p>
      </Card>
    </div>
  );
}
