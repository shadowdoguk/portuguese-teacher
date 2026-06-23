"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  AGAIN_RESET_HALF_LIFE_MS,
  RECALL_GRADES,
  allReviewableRefs,
  applyRecall,
  consoleRecallSink,
  countDue,
  dueQueue,
  enrollMany,
  loadPersisted,
  savePersisted,
  type RecallGrade,
  type SrsState,
} from "@/lib/srs";

const SESSION_LEARNER_ID = "demo-learner";

function formatRelativeDue(dueAt: number, now: number): string {
  const delta = dueAt - now;
  if (delta <= 0) return "due now";
  const minutes = Math.round(delta / 60_000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.round(hours / 24);
  return `in ${days} d`;
}

function formatHalfLife(ms: number): string {
  if (ms < 60_000) return "< 1 min";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;
  const days = Math.round(hours / 24);
  return `${days} d`;
}

const GRADE_LABELS: Record<RecallGrade, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

const GRADE_DESCRIPTIONS: Record<RecallGrade, string> = {
  again: "Forgot — see it again soon",
  hard: "Tricky — half-life × 0.5",
  good: "Solid — half-life × 2.5",
  easy: "Trivial — half-life × 4",
};

type Sink = (event: import("@/lib/srs").SrsRecallEvent) => void;

export function ReviewQueue({ onRecall = consoleRecallSink }: { onRecall?: Sink } = {}) {
  const refs = useMemo(() => allReviewableRefs(), []);
  const [state, setState] = useState<SrsState | null>(null);
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    const persisted = loadPersisted();
    const initial = enrollMany(persisted.state, refs, Date.now());
    const next = {
      ...persisted,
      state: initial,
    };
    if (!persisted.state || Object.keys(persisted.state.items).length === 0) {
      savePersisted(next);
    }
    setState(next.state);
    setNow(Date.now());
  }, [refs]);

  const queue = useMemo(() => {
    if (!state || now === 0) return [];
    return dueQueue(state, { refs, now, limit: 20 });
  }, [state, refs, now]);

  const dueToday = useMemo(() => {
    if (!state) return 0;
    return countDue(state, refs, Date.now());
  }, [state, refs]);

  const handleGrade = useCallback(
    (grade: RecallGrade) => {
      if (!state || queue.length === 0) return;
      const head = queue[0]!;
      const at = Date.now();
      const result = applyRecall(state, SESSION_LEARNER_ID, head.ref.itemId, grade, at);
      const persisted = loadPersisted();
      const next = {
        ...persisted,
        state: result.state,
        recallLog: [...persisted.recallLog, result.event],
      };
      savePersisted(next);
      onRecall(result.event);
      setState(result.state);
      setNow(at);
    },
    [state, queue, onRecall],
  );

  if (state === null) {
    return (
      <div className="space-y-6">
        <Card eyebrow="Loading" title="Preparing your queue…">
          Enrolling the A0 vocabulary set.
        </Card>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="space-y-6">
        <header className="space-y-3">
          <span className="stage-stamp">Spaced repetition</span>
          <h1 className="text-pretty font-display text-display-lg font-light">
            Nothing due. <span className="text-ink-mute">Catch you later.</span>
          </h1>
          <p className="max-w-2xl text-pretty text-ink-soft">
            You&apos;ve reviewed every item whose half-life has elapsed. New items surface as their
            half-lives decay — usually minutes for the first round, days once you&apos;re stable.
          </p>
        </header>
        <Card eyebrow="Next due" title={`${dueToday} item${dueToday === 1 ? "" : "s"} ready`}>
          <p>
            The scheduler found <strong>{dueToday}</strong> due item
            {dueToday === 1 ? "" : "s"} and <strong>{Object.keys(state.items).length}</strong> total
            enrolled.
          </p>
          <p className="mt-3 text-xs text-ink-mute">
            Items reset their half-life when graded <em>Again</em> (back to{" "}
            {formatHalfLife(AGAIN_RESET_HALF_LIFE_MS)}).
          </p>
        </Card>
      </div>
    );
  }

  const head = queue[0]!;
  const halfLifeMs = state.items[head.ref.itemId]?.halfLifeMs ?? 0;
  const totalReviews = queue.length;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <span className="stage-stamp">Spaced repetition</span>
        <h1 className="text-pretty font-display text-display-lg font-light">
          {totalReviews} item{totalReviews === 1 ? "" : "s"}, ready to review.
        </h1>
        <p className="max-w-2xl text-pretty text-ink-soft">
          Each recall is logged. Again, Hard, Good, or Easy — the half-life scheduler tunes the next
          review to your answer.
        </p>
      </header>

      <article
        className="card-surface flex flex-col gap-6 p-8"
        aria-live="polite"
        data-testid="srs-card"
        data-item-id={head.ref.itemId}
      >
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-ink-mute">
          <span className="stage-stamp">
            {head.ref.kind === "vocabulary" ? "Vocabulary" : "Grammar"}
          </span>
          <span>Half-life · {formatHalfLife(halfLifeMs)}</span>
        </div>

        <div className="grid gap-6 sm:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="font-display text-4xl text-ink" lang="pt-PT">
              {head.ref.pt}
            </p>
            <p className="mt-2 text-pretty text-ink-soft">{head.ref.gloss}</p>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-ink/10 bg-paper-warm/40 p-4">
              <dt className="stage-stamp">Item</dt>
              <dd className="mt-1 font-mono text-xs text-ink-soft">{head.ref.itemId}</dd>
            </div>
            <div className="rounded-lg border border-ink/10 bg-paper-warm/40 p-4">
              <dt className="stage-stamp">Unit</dt>
              <dd className="mt-1 font-mono text-xs text-ink-soft">{head.ref.unitId}</dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {RECALL_GRADES.map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => handleGrade(grade)}
              className="card-surface flex flex-col gap-1 px-4 py-3 text-left transition hover:border-terracotta hover:bg-paper-warm focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
              data-testid={`srs-grade-${grade}`}
            >
              <span className="font-display text-lg text-ink">{GRADE_LABELS[grade]}</span>
              <span className="text-xs text-ink-mute">{GRADE_DESCRIPTIONS[grade]}</span>
            </button>
          ))}
        </div>
      </article>

      <Card eyebrow="How recall works" title="Half-life regression">
        When you answer, we update the half-life of that item for you. <em>Again</em> resets it to{" "}
        {formatHalfLife(AGAIN_RESET_HALF_LIFE_MS)} (you&apos;ll see it on the next round);{" "}
        <em>Hard</em> × 0.5; <em>Good</em> × 2.5; <em>Easy</em> × 4. Items with shorter half-lives
        come back sooner — so you see them just before you&apos;d forget. The full review queue
        currently shows <strong>{formatRelativeDue(head.record.dueAt, Date.now())}</strong> as the
        next encounter for this card.
      </Card>
    </div>
  );
}
