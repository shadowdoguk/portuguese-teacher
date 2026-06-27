import { Card } from "@/components/ui/Card";
import { DialectPicker } from "@/components/ui/DialectPicker";
import { ProfileForm } from "@/components/profile/ProfileForm";

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
        <Card
          eyebrow="Why a read-only card?"
          title="v1 ships European Portuguese only"
        >
          <p className="text-sm text-ink-soft">
            Per ADR-0003 the platform locks dialect to <strong>pt-PT</strong> at
            sign-up. Brazilian Portuguese is on the v1.1 roadmap. Cross-dialect
            contamination would degrade the AI Teacher&apos;s voice and vocabulary.
          </p>
        </Card>
      </section>

      <ProfileForm />
    </div>
  );
}
