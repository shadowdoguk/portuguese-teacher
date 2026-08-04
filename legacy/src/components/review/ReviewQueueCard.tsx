"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { allReviewableRefs, countDue, loadPersisted } from "@/lib/srs";

export function ReviewQueueCard() {
  const refs = allReviewableRefs();
  const [due, setDue] = useState<number | null>(null);

  useEffect(() => {
    const persisted = loadPersisted();
    setDue(countDue(persisted.state, refs, Date.now()));
  }, [refs]);

  const label = due === null ? "…" : `${due} due today`;
  const estMinutes = due === null ? 0 : Math.max(5, Math.min(20, due));

  return (
    <article className="card-surface flex flex-col gap-3 p-6">
      <span className="stage-stamp">Spaced repetition</span>
      <h3 className="font-display text-2xl text-ink">{label}</h3>
      <p className="text-sm text-ink-soft">
        Items you learned earlier are about to fade. A quick review locks them in.
      </p>
      <dl className="grid grid-cols-2 gap-3 text-xs text-ink-mute">
        <div>
          <dt className="stage-stamp">Estimated</dt>
          <dd className="font-mono text-ink-soft">~{estMinutes} min</dd>
        </div>
        <div>
          <dt className="stage-stamp">Half-life</dt>
          <dd className="font-mono text-ink-soft">HLR</dd>
        </div>
      </dl>
      <Link
        href="/review"
        className="mt-1 inline-block text-sm text-terracotta-deep underline decoration-terracotta underline-offset-4"
        data-testid="dashboard-review-link"
      >
        Open review queue →
      </Link>
    </article>
  );
}
