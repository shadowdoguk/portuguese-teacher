import Link from "next/link";
import { Card } from "@/components/ui/Card";

const nextLesson = {
  unit: "Unit 2 · Greetings & first conversations",
  lesson: "Lesson 3 of 8",
  title: "Saying where you’re from",
  blurb: "Learn ‘sou de…’, practice the difference between ‘ser’ and ‘estar’.",
};

const queue = {
  due: 18,
  estMinutes: 7,
};

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <span className="stage-stamp">Today</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          Bom dia. <span className="text-ink-mute">You’re four days in.</span>
        </h1>
        <p className="max-w-2xl text-pretty text-ink-soft">
          Your review queue is ready and your next lesson is short. Today’s plan
          should take about fifteen minutes — including two turns with the AI teacher.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card
          eyebrow="Next lesson"
          title={nextLesson.title}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-mute">
                {nextLesson.unit} · {nextLesson.lesson}
              </span>
              <Link href="/lesson/greetings-3" className="btn-primary px-4 py-2 text-xs">
                Start lesson
              </Link>
            </div>
          }
        >
          {nextLesson.blurb}
        </Card>

        <Card eyebrow="Spaced repetition" title={`${queue.due} due today`}>
          Items you learned earlier are about to fade. A quick review locks them in.
          <Link href="/review" className="mt-4 inline-block text-sm text-terracotta-deep underline decoration-terracotta underline-offset-4">
            Open review queue →
          </Link>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card eyebrow="Practice" title="Conversational practice">
          Speak Portuguese with the AI teacher. Free-form, scenario, or drill.
          <Link href="/practice" className="mt-4 inline-block text-sm text-terracotta-deep underline decoration-terracotta underline-offset-4">
            Open practice →
          </Link>
        </Card>

        <Card eyebrow="Progress" title="Your arc">
          See per-skill mastery and your retention curve.
          <Link href="/progress" className="mt-4 inline-block text-sm text-terracotta-deep underline decoration-terracotta underline-offset-4">
            Open progress →
          </Link>
        </Card>

        <Card eyebrow="Streak" title="4 days">
          Don’t break the chain. Fifteen minutes tomorrow keeps it alive.
        </Card>
      </section>
    </div>
  );
}