"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RECALL_GRADES,
  allReviewableRefs,
  enrollMany,
  dueQueue,
  type RecallGrade,
  type SrsItemRef,
  type SrsRecallEvent,
  type SrsReviewRecord,
  type SrsState,
} from "@/lib/srs";
import {
  DEFAULT_MAX_INJECTED,
  interleaveSrsItems,
  type LessonExercise,
} from "@/lib/lesson/player";
import type { Lesson, PracticeExercise } from "@/lib/curriculum";

const SESSION_LEARNER_ID = "demo-learner";

function formatHalfLife(ms: number): string {
  if (ms < 60_000) return "< 1 min";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;
  const days = Math.round(hours / 24);
  return `${days} d`;
}

function describePracticeExercise(exercise: PracticeExercise): string {
  switch (exercise.kind) {
    case "flashcard":
      return exercise.expectedAnswer
        ? `Gloss: ${exercise.expectedAnswer}`
        : "Look at the prompt and recall the answer.";
    case "fill-in":
      return exercise.expectedAnswer
        ? `Fill in the blank. Answer: "${exercise.expectedAnswer}"`
        : "Fill in the blank.";
    case "listen-and-repeat":
      return "Listen and repeat the phrase out loud.";
    case "role-play":
      return "Take the role and respond.";
    case "free-response":
      return "Write a free response in Portuguese.";
    case "pronunciation-drill":
      return "Pronounce the phrase; the AI teacher will score.";
    case "scenario-turn":
      return "Take your turn in the scenario.";
    default:
      return exercise.kind;
  }
}

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const baseRefs = useMemo(() => allReviewableRefs(), []);
  const [refs, setRefs] = useState<SrsItemRef[]>(baseRefs);
  const [srsState, setSrsState] = useState<SrsState | null>(null);
  const [stream, setStream] = useState<LessonExercise[]>(() =>
    interleaveSrsItems(lesson.exercises, [], { maxInjected: DEFAULT_MAX_INJECTED }),
  );
  const [error, setError] = useState<string | null>(null);
  const [authoredRevealed, setAuthoredRevealed] = useState<Record<string, boolean>>({});
  const [authoredDone, setAuthoredDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await fetch(
          `/api/srs/state?learnerId=${encodeURIComponent(SESSION_LEARNER_ID)}`,
        );
        if (!res.ok) {
          throw new Error(`Failed to load SRS state (${res.status})`);
        }
        const body = (await res.json()) as {
          ok: boolean;
          state: SrsState;
        };
        if (!body.ok) {
          throw new Error("SRS state response was not ok");
        }
        if (cancelled) return;
        setRefs(baseRefs);
        const enrolled = enrollMany(body.state, baseRefs, Date.now());
        setSrsState(enrolled);
        const due = dueQueue(enrolled, {
          refs: baseRefs,
          now: Date.now(),
          limit: DEFAULT_MAX_INJECTED,
        });
        setStream(
          interleaveSrsItems(lesson.exercises, due, {
            maxInjected: DEFAULT_MAX_INJECTED,
          }),
        );
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [baseRefs, lesson.exercises]);

  const handleReviewGrade = useCallback(
    async (review: LessonExercise & { kind: "review" }, grade: RecallGrade) => {
      try {
        const res = await fetch("/api/srs/recalls", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            learnerId: SESSION_LEARNER_ID,
            itemId: review.ref.itemId,
            kind: review.ref.kind,
            grade,
            timestamp: Date.now(),
            pt: review.ref.pt,
            gloss: review.ref.gloss,
            unitId: review.ref.unitId,
            refs,
          }),
        });
        if (!res.ok) {
          const message = await readError(res);
          throw new Error(message);
        }
        const body = (await res.json()) as {
          ok: boolean;
          record: SrsReviewRecord;
          event: SrsRecallEvent;
        };
        if (!body.ok) throw new Error("Recall response was not ok");
        if (srsState) {
          setSrsState({
            items: { ...srsState.items, [review.ref.itemId]: body.record },
          });
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      }
    },
    [refs, srsState],
  );

  const authoredCompleted = Object.values(authoredDone).filter(Boolean).length;
  const authoredTotal = stream.filter((item) => item.kind === "authored").length;
  const reviewTotal = stream.filter((item) => item.kind === "review").length;

  return (
    <div className="space-y-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ink-mute">
        <Link href="/dashboard" className="hover:text-ink">
          Dashboard
        </Link>
        <span aria-hidden>/</span>
        <span className="text-ink">{lesson.unitId}</span>
      </nav>

      <header className="space-y-3">
        <span className="stage-stamp">Lesson</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          {lesson.title}
        </h1>
        <p className="max-w-2xl text-pretty text-ink-soft">{lesson.body.introduction}</p>
        <p className="text-xs text-ink-mute" data-testid="lesson-stream-summary">
          {authoredCompleted}/{authoredTotal} authored complete · {reviewTotal} review
          {reviewTotal === 1 ? "" : "s"} injected
        </p>
      </header>

      {lesson.body.blocks.map((block, idx) => (
        <article
          key={idx}
          className="card-surface space-y-3"
          data-testid="lesson-block"
        >
          {block.kind === "paragraph" || block.kind === "rule" ? (
            <p className="text-pretty text-ink-soft">{block.text}</p>
          ) : null}
          {block.kind === "example" ? (
            <div>
              <p lang="pt-PT" className="font-display text-lg text-ink">
                {block.pt}
              </p>
              {block.gloss ? (
                <p className="mt-1 text-sm text-ink-soft">{block.gloss}</p>
              ) : null}
            </div>
          ) : null}
          {block.kind === "audio" ? (
            <p className="text-pretty text-ink-soft">
              <span className="stage-stamp mr-2">Audio</span>
              <span className="font-mono text-xs">{block.assetId}</span>
              {block.caption ? (
                <span className="ml-2 text-xs text-ink-mute">{block.caption}</span>
              ) : null}
            </p>
          ) : null}
          {block.kind === "image" ? (
            <p className="text-pretty text-ink-soft">
              <span className="stage-stamp mr-2">Image</span>
              <span className="font-mono text-xs">{block.assetId}</span>
              <span className="ml-2 text-xs text-ink-mute">{block.alt}</span>
            </p>
          ) : null}
        </article>
      ))}

      <section aria-label="Practice exercises" className="space-y-4">
        <h2 className="font-display text-2xl text-ink">Practice</h2>
        <ol className="space-y-3">
          {stream.map((item) => (
            <li
              key={item.id}
              data-testid="lesson-exercise"
              data-kind={item.kind}
              data-position={item.position}
              data-completed={
                item.kind === "authored" && authoredDone[item.exercise.id] ? "true" : "false"
              }
            >
              {item.kind === "authored" ? (
                <article className="card-surface flex flex-col gap-4 p-5">
                  <header className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-ink-mute">
                    <span className="stage-stamp">
                      Authored · {item.exercise.kind}
                    </span>
                    <span>{item.exercise.difficulty}</span>
                  </header>
                  <p className="text-pretty text-ink-soft">
                    <span lang="pt-PT" className="font-display text-lg text-ink">
                      {item.exercise.prompt}
                    </span>
                  </p>
                  <p className="text-xs text-ink-mute">
                    {describePracticeExercise(item.exercise)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() =>
                        setAuthoredRevealed((prev) => ({
                          ...prev,
                          [item.exercise.id]: !prev[item.exercise.id],
                        }))
                      }
                      data-testid="lesson-authored-reveal"
                    >
                      {authoredRevealed[item.exercise.id] ? "Hide answer" : "Reveal answer"}
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() =>
                        setAuthoredDone((prev) => ({
                          ...prev,
                          [item.exercise.id]: true,
                        }))
                      }
                      data-testid="lesson-authored-mark-done"
                      disabled={authoredDone[item.exercise.id] === true}
                    >
                      {authoredDone[item.exercise.id] === true ? "Marked done" : "Mark done"}
                    </button>
                  </div>
                  {authoredRevealed[item.exercise.id] && item.exercise.expectedAnswer ? (
                    <p
                      className="rounded-md bg-paper-warm/60 px-3 py-2 text-sm text-ink-soft"
                      data-testid="lesson-authored-answer"
                    >
                      <span className="stage-stamp mr-2">Answer</span>
                      <span lang="pt-PT" className="font-display text-ink">
                        {item.exercise.expectedAnswer}
                      </span>
                    </p>
                  ) : null}
                </article>
              ) : (
                <article className="card-surface flex flex-col gap-4 border-terracotta/30 p-5">
                  <header className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-ink-mute">
                    <span className="stage-stamp text-terracotta">Review · SRS</span>
                    <span>Half-life · {formatHalfLife(item.record.halfLifeMs)}</span>
                  </header>
                  <p className="font-display text-2xl text-ink" lang="pt-PT">
                    {item.ref.pt}
                  </p>
                  <p className="text-sm text-ink-soft">{item.ref.gloss}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {RECALL_GRADES.map((grade) => (
                      <button
                        key={grade}
                        type="button"
                        className="card-surface px-3 py-2 text-sm transition hover:border-terracotta"
                        onClick={() => void handleReviewGrade(item, grade)}
                        data-testid={`lesson-review-grade-${grade}`}
                      >
                        {grade[0]?.toUpperCase()}
                        {grade.slice(1)}
                      </button>
                    ))}
                  </div>
                </article>
              )}
            </li>
          ))}
        </ol>
      </section>

      {error ? (
        <p className="text-xs text-terracotta-deep" data-testid="lesson-error">
          {error}
        </p>
      ) : null}

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

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}