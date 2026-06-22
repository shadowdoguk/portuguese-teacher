import Link from "next/link";

type Params = { lessonId: string };

const lessons: Record<string, { title: string; unit: string; steps: string[] }> = {
  "greetings-3": {
    title: "Saying where you’re from",
    unit: "Unit 2 · Greetings & first conversations",
    steps: [
      "Listen to ‘sou de São Paulo, Brasil’.",
      "Repeat the phrase; the AI teacher will score your pronunciation.",
      "Complete the fill-in exercise.",
      "Hold a 30-second conversation with the AI teacher about where you live.",
    ],
  },
};

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { lessonId } = await params;
  const lesson = lessons[lessonId] ?? {
    title: "Lesson",
    unit: "Curriculum",
    steps: ["Lesson content will appear here once the lesson material library is connected."],
  };

  return (
    <div className="space-y-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ink-mute">
        <Link href="/dashboard" className="hover:text-ink">
          Dashboard
        </Link>
        <span aria-hidden>/</span>
        <span className="text-ink">{lesson.unit}</span>
      </nav>

      <header className="space-y-3">
        <span className="stage-stamp">Lesson</span>
        <h1 className="text-display-lg font-display font-light text-pretty">{lesson.title}</h1>
      </header>

      <ol className="space-y-3">
        {lesson.steps.map((step, i) => (
          <li
            key={i}
            className="card-surface flex items-start gap-4"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink/15 bg-paper font-mono text-xs text-ink-soft">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="text-pretty text-ink-soft">{step}</p>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/practice" className="btn-primary">
          Practice with the AI teacher
          <span aria-hidden>→</span>
        </Link>
        <Link href="/dashboard" className="btn-ghost">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}