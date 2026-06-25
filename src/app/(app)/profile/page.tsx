"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { DialectPicker } from "@/components/ui/DialectPicker";
import { useAuth } from "@/lib/auth/useAuth";

export default function ProfilePage() {
  const { user } = useAuth();
  const hasCurrentUnit = Boolean(user?.currentUnitId);
  const aboveA0 = Boolean(user?.selfAssessedLevel);

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
          {user?.selfAssessedLevel ? (
            <p>
              You chose <strong>{user.selfAssessedLevel}</strong> at sign-up.
              {aboveA0
                ? " Your Placement Lesson confirmed or revised your starting Unit."
                : " A0 skips the Placement Lesson — you started at the entry Unit."}
            </p>
          ) : (
            <p>
              If you&apos;re above A0, a single Placement Lesson will confirm or revise
              your starting Unit before the regular sequence begins.
            </p>
          )}
          {aboveA0 ? (
            <div className="mt-4">
              <Link href="/placement" className="btn-soft inline-flex">
                {hasCurrentUnit ? "Re-take placement →" : "Skip to my level →"}
              </Link>
            </div>
          ) : null}
        </Card>

        <Card eyebrow="Goals" title="Why are you learning?">
          Travel · Heritage · Work · Romance. The teacher tunes scenarios to match.
        </Card>
      </section>
    </div>
  );
}
