import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";
import { Wordmark } from "@/components/brand/Wordmark";
import { DialectChip } from "@/components/ui/DialectChip";

const principles = [
  {
    label: "01",
    title: "Spaced repetition",
    body: "Half-life regression surfaces vocabulary at the moment you’re about to forget it. You retain, you don’t cram.",
  },
  {
    label: "02",
    title: "Comprehensible input",
    body: "Every reading passage, listening clip, and teacher utterance is calibrated to your level — slightly above, never overwhelming.",
  },
  {
    label: "03",
    title: "Real voice practice",
    body: "Speak to the AI teacher in Portuguese. Get corrections the moment you mispronounce, mis-conjugate, or hesitate.",
  },
];

const stages = [
  { code: "A0", name: "First words", milestone: "Olá, mundo." },
  { code: "A1", name: "Daily life", milestone: "Ordering coffee, asking for help." },
  { code: "A2", name: "Connected sentences", milestone: "Telling a story in past tense." },
  { code: "B1", name: "Conversational fluency", milestone: "Holding an opinion, disagreeing kindly." },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader variant="marketing" />
      <main>
        <Hero />
        <Marquee />
        <PrincipleSection />
        <StageSection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

function Hero() {
  return (
    <section className="grain relative overflow-hidden">
      <div className="container-edge relative grid gap-12 pb-24 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-32 lg:pt-28">
        <div className="relative flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <span className="pill">
              <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
              Powered by MiniMax
            </span>
            <DialectChip variant="pt-BR" />
            <DialectChip variant="pt-PT" />
          </div>

          <h1 className="text-display-xl font-display font-light text-pretty text-ink">
            <span className="block">Aprenda português</span>
            <span className="block text-balance">
              do <em className="font-display italic text-terracotta">zero</em> até à
              <span className="underline-ink ml-2">conversa.</span>
            </span>
          </h1>

          <p className="max-w-xl text-pretty text-lg leading-relaxed text-ink-soft">
            An AI teacher who listens, corrects, and chats — in Brazilian or European Portuguese.
            From the alphabet to a held opinion at dinner, in the time you actually have.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className="btn-primary">
              Start learning
              <span aria-hidden>→</span>
            </Link>
            <Link href="#how-it-works" className="btn-ghost">
              See how it works
            </Link>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-x-6 gap-y-2 border-t border-ink/10 pt-6 text-sm">
            <div>
              <dt className="stage-stamp">Stages</dt>
              <dd className="font-display text-2xl text-ink">A0 → B1</dd>
            </div>
            <div>
              <dt className="stage-stamp">Practice</dt>
              <dd className="font-display text-2xl text-ink">15 min / day</dd>
            </div>
            <div>
              <dt className="stage-stamp">Dialects</dt>
              <dd className="font-display text-2xl text-ink">pt-BR · pt-PT</dd>
            </div>
          </dl>
        </div>

        <HeroPlate />
      </div>
    </section>
  );
}

function HeroPlate() {
  return (
    <div className="relative">
      <div className="absolute -right-6 top-6 hidden h-full w-full rounded-xl border border-ink/10 bg-paper-warm/80 shadow-soft sm:block" />
      <div className="absolute -right-3 top-3 hidden h-full w-full rounded-xl border border-ink/10 bg-paper-deep/80 shadow-soft sm:block" />
      <article className="relative rounded-xl border border-ink/10 bg-paper p-6 shadow-soft sm:p-8">
        <header className="flex items-center justify-between border-b border-ink/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-paper">
              <Wordmark className="h-3.5 w-auto" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
              Today · 07:42
            </span>
          </div>
          <span className="pill">Lesson 3 of 8</span>
        </header>

        <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-ink-soft">
          <SpeechBubble side="teacher" text="Bom dia! Como você está hoje?" />
          <SpeechBubble
            side="learner"
            text="Eu estou… bom. Eu tenho uma pergunta."
          />
          <SpeechBubble
            side="teacher"
            text="Ótimo. ‘Estou bom’ funciona, mas soa mais natural dizer ‘estou bem’ ou ‘estou bem, obrigado’. Vamos treinar?"
          />
          <SpeechBubble side="learner" text="Sim. Obrigado." />
        </div>

        <footer className="mt-6 flex items-center justify-between border-t border-ink/10 pt-4 text-xs text-ink-mute">
          <span className="stage-stamp">Pronunciation 87 · Grammar 92</span>
          <span className="stage-stamp">Mic · Tap to speak</span>
        </footer>
      </article>
    </div>
  );
}

function SpeechBubble({ side, text }: { side: "teacher" | "learner"; text: string }) {
  const isTeacher = side === "teacher";
  return (
    <div className={`flex ${isTeacher ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-2.5 ${
          isTeacher
            ? "bg-ink text-paper"
            : "border border-ink/10 bg-paper-warm text-ink"
        }`}
      >
        <p className="text-pretty">{text}</p>
      </div>
    </div>
  );
}

const phrases = [
  "Bom dia",
  "Olá, tudo bem?",
  "Prazer em conhecer",
  "Com licença",
  "Muito obrigado",
  "Por favor",
  "Desculpe",
  "Até logo",
  "Boa noite",
  "Saúde!",
];

function Marquee() {
  const doubled = [...phrases, ...phrases];
  return (
    <section
      aria-label="Vocabulary in motion"
      className="border-y border-ink/10 bg-paper-warm/40 py-6"
    >
      <div className="relative overflow-hidden">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap font-display text-2xl text-ink-soft">
          {doubled.map((phrase, i) => (
            <span key={i} className="flex items-center gap-12">
              <span className="text-pretty">{phrase}</span>
              <span aria-hidden className="text-terracotta">
                ✦
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrincipleSection() {
  return (
    <section id="how-it-works" className="container-edge py-24 lg:py-32">
      <header className="mb-16 max-w-2xl">
        <span className="stage-stamp">Method</span>
        <h2 className="mt-3 text-display-lg font-display font-light text-pretty">
          Three evidence-based layers, working together.
        </h2>
        <p className="mt-4 text-pretty text-ink-soft">
          Português doesn’t pick a single theory of language learning and call it done.
          It blends spaced repetition, comprehensible input, and a real conversational
          tutor — each method owning the layer it’s best at.
        </p>
      </header>

      <ol className="grid gap-px overflow-hidden rounded-xl border border-ink/10 bg-ink/10 lg:grid-cols-3">
        {principles.map((p) => (
          <li key={p.label} className="card-surface flex flex-col gap-3 rounded-none border-0 bg-paper">
            <span className="stage-stamp">{p.label}</span>
            <h3 className="font-display text-2xl text-ink">{p.title}</h3>
            <p className="text-pretty text-ink-soft">{p.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StageSection() {
  return (
    <section className="bg-ink py-24 text-paper lg:py-32">
      <div className="container-edge">
        <header className="mb-12 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-terracotta-soft">
              The arc
            </span>
            <h2 className="mt-2 text-display-lg font-display font-light text-pretty">
              Four stages. One teacher. No shortcuts.
            </h2>
          </div>
          <p className="max-w-md text-pretty text-paper/70">
            Each stage ends with a milestone assessment. Pass at 75% and the next stage
            unlocks. Need more time? The teacher prescribes remedial units from your gaps.
          </p>
        </header>

        <ol className="grid gap-px overflow-hidden rounded-xl border border-paper/15 bg-paper/10 lg:grid-cols-4">
          {stages.map((s) => (
            <li
              key={s.code}
              className="flex flex-col gap-3 bg-ink p-6 lg:p-8"
            >
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-terracotta-soft">
                {s.code}
              </span>
              <h3 className="font-display text-xl text-paper">{s.name}</h3>
              <p className="text-sm leading-relaxed text-paper/70">{s.milestone}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="container-edge py-24 lg:py-32">
      <div className="grid items-center gap-10 rounded-xl border border-ink/10 bg-paper-warm/60 p-8 shadow-soft lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:p-16">
        <div>
          <span className="stage-stamp">Begin</span>
          <h2 className="mt-3 text-display-lg font-display font-light text-pretty">
            Your first lesson is{" "}
            <em className="font-display italic text-terracotta">cinco minutos</em>.
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-ink-soft">
            The alphabet, a greeting, and a single short conversation. We meet you at
            zero and stay with you until dinner-table fluency.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <Link href="/sign-up" className="btn-primary">
            Start learning
            <span aria-hidden>→</span>
          </Link>
          <Link href="/log-in" className="btn-ghost">
            I already have an account
          </Link>
        </div>
      </div>
    </section>
  );
}