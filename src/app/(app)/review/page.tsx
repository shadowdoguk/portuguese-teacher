import { Card } from "@/components/ui/Card";

const dueItems = [
  { prompt: "bom dia", meaning: "good morning", kind: "Vocabulary" },
  { prompt: "como você está?", meaning: "how are you?", kind: "Phrase" },
  { prompt: "ser vs. estar", meaning: "to be (essence) vs. to be (state)", kind: "Grammar" },
  { prompt: "obrigado / obrigada", meaning: "thank you (m / f)", kind: "Vocabulary" },
  { prompt: "Prazer em conhecê-lo.", meaning: "Pleased to meet you.", kind: "Phrase" },
];

export default function ReviewPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <span className="stage-stamp">Spaced repetition</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          {dueItems.length} items, ready to review.
        </h1>
        <p className="max-w-2xl text-pretty text-ink-soft">
          Each recall is logged. Again, Hard, Good, or Easy — the half-life
          scheduler tunes the next review to your answer.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ol className="space-y-3">
          {dueItems.map((item, i) => (
            <li key={item.prompt} className="card-surface flex items-start justify-between gap-4">
              <div>
                <span className="stage-stamp">{item.kind}</span>
                <p className="mt-1 font-display text-xl text-ink">{item.prompt}</p>
                <p className="text-sm text-ink-mute">{item.meaning}</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full border border-ink/10 font-mono text-xs text-ink-soft">
                {String(i + 1).padStart(2, "0")}
              </span>
            </li>
          ))}
        </ol>

        <Card eyebrow="How recall works" title="Half-life regression">
          When you answer, we update the half-life of that item for you: Again
          halves it, Good extends it 2.5×, Easy 4×. Items with shorter half-lives
          come back sooner — so you see them just before you’d forget.
        </Card>
      </section>
    </div>
  );
}