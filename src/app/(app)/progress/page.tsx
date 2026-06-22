import { Card } from "@/components/ui/Card";

const skills = [
  { name: "Reading", value: 72 },
  { name: "Listening", value: 64 },
  { name: "Writing", value: 58 },
  { name: "Speaking", value: 51 },
];

const milestones = [
  { stage: "A0", status: "passed", date: "2026-06-10" },
  { stage: "A1", status: "in-progress", date: null },
  { stage: "A2", status: "locked", date: null },
  { stage: "B1", status: "locked", date: null },
];

export default function ProgressPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <span className="stage-stamp">Progress</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          Four skills. One arc.
        </h1>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card eyebrow="Mastery" title="Per-skill breakdown">
          <ul className="space-y-3">
            {skills.map((s) => (
              <li key={s.name}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-ink">{s.name}</span>
                  <span className="font-mono text-ink-mute">{s.value}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-paper-deep">
                  <div
                    className="h-full rounded-full bg-terracotta"
                    style={{ width: `${s.value}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card eyebrow="Milestones" title="Where you are">
          <ol className="space-y-3 text-sm">
            {milestones.map((m) => (
              <li key={m.stage} className="flex items-center justify-between border-b border-ink/5 pb-2 last:border-0">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-mute">
                  {m.stage}
                </span>
                <span
                  className={
                    m.status === "passed"
                      ? "text-moss"
                      : m.status === "in-progress"
                        ? "text-terracotta"
                        : "text-ink-mute"
                  }
                >
                  {m.status === "passed"
                    ? `Passed · ${m.date}`
                    : m.status === "in-progress"
                      ? "In progress"
                      : "Locked"}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </div>
  );
}