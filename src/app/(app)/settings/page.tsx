import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <span className="stage-stamp">Settings</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          Make it yours.
        </h1>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card eyebrow="Voice" title="Playback speed">
          Slow the teacher down when an utterance is hard. Default 1.0×; range 0.75–1.25×.
        </Card>

        <Card eyebrow="Feedback" title="Immediate corrective feedback">
          We default to immediate. Toggle this off to receive feedback at the end
          of a conversation instead.
        </Card>

        <Card eyebrow="Accessibility" title="Captions, reduced motion, text-only">
          Captions on every TTS utterance. Honour `prefers-reduced-motion`. Text
          input substitutes audio everywhere.
        </Card>

        <Card eyebrow="Privacy" title="Voice recordings & data">
          Recordings are off by default. Toggle on to retain encrypted recordings
          for 30 days — useful if you want to review your own progress.
        </Card>

        <Card eyebrow="Data" title="Export & delete">
          Export everything we hold on you as JSON. Or delete your account and
          all associated data — within 30 days.
        </Card>
      </section>
    </div>
  );
}