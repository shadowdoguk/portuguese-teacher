import { Card } from "@/components/ui/Card";
import { DialectPicker } from "@/components/ui/DialectPicker";

export default function ProfilePage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <span className="stage-stamp">Profile</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          Your learner profile.
        </h1>
        <p className="max-w-2xl text-pretty text-ink-soft">
          The teacher personalises to these settings. Change them and the next
          conversation shifts immediately.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card eyebrow="Dialect" title="Which Portuguese?">
          <DialectPicker />
        </Card>

        <Card eyebrow="Native language" title="English">
          We’ll explain tricky grammar points in your native language when asked.
        </Card>

        <Card eyebrow="Self-assessment" title="Where you think you are">
          The placement test will confirm. For now, this is your best guess.
        </Card>

        <Card eyebrow="Goals" title="Why are you learning?">
          Travel · Heritage · Work · Romance. The teacher tunes scenarios to match.
        </Card>
      </section>
    </div>
  );
}