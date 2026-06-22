import { Card } from "@/components/ui/Card";

const modes = [
  {
    title: "Free-form",
    body: "Pick any topic. The AI teacher follows your lead and adapts difficulty to your level.",
  },
  {
    title: "Scenario",
    body: "Goal-oriented tasks: order a meal, ask for directions, make small talk. Pass to credit the unit.",
  },
  {
    title: "Drill",
    body: "Listen-and-repeat, minimal pairs, targeted pronunciation work. Short and intense.",
  },
];

export default function PracticePage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <span className="stage-stamp">Practice</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          Speak Portuguese. Right now.
        </h1>
        <p className="max-w-2xl text-pretty text-ink-soft">
          Your microphone is the input. The AI teacher listens, transcribes, replies in
          voice, and surfaces corrections the moment you make them.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        {modes.map((m) => (
          <Card key={m.title} eyebrow="Mode" title={m.title}>
            {m.body}
          </Card>
        ))}
      </section>

      <section className="card-surface">
        <p className="stage-stamp">Voice loop</p>
        <p className="mt-2 text-pretty text-ink-soft">
          The microphone surface and end-to-end voice pipeline arrive in issue #5.
          This page is the entry point — once that issue lands, each mode above
          becomes a live conversation with the AI teacher.
        </p>
      </section>
    </div>
  );
}