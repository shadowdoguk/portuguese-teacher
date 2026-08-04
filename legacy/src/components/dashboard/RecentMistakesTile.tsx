"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { RecentMistakesResult } from "@/lib/dashboard/recent-mistakes";

type Status = "loading" | "ready" | "empty" | "error";

type Fetched = {
  status: Status;
  result: RecentMistakesResult | null;
  error: string | null;
};

export function RecentMistakesTile({ learnerId }: { learnerId: string }) {
  const [data, setData] = useState<Fetched>({
    status: "loading",
    result: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await fetch(
          `/api/dashboard/recent-mistakes?learnerId=${encodeURIComponent(learnerId)}`,
        );
        if (!res.ok) {
          throw new Error(`Failed to load recent mistakes (${res.status})`);
        }
        const body = (await res.json()) as
          | { ok: true; result: RecentMistakesResult }
          | { ok: false; error?: string };
        if (!body.ok) {
          throw new Error(body.error ?? "Recent mistakes response was not ok");
        }
        if (cancelled) return;
        if (body.result.items.length === 0) {
          setData({ status: "empty", result: body.result, error: null });
        } else {
          setData({ status: "ready", result: body.result, error: null });
        }
      } catch (err) {
        if (cancelled) return;
        setData({
          status: "error",
          result: null,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [learnerId]);

  const title = (() => {
    if (data.status === "loading") return "Loading your recent slips…";
    if (data.status === "error") return "Recent mistakes unavailable";
    if (data.status === "empty") return "No recent slips";
    if (!data.result) return "Recent mistakes";
    const windowDays = Math.round(data.result.windowMs / (24 * 60 * 60 * 1000));
    return `${data.result.uniqueItems} item${data.result.uniqueItems === 1 ? "" : "s"} slipping`;
  })();

  const detail = (() => {
    if (data.status === "loading") {
      return "Pulling the last week's 'Again' grades from the review queue.";
    }
    if (data.status === "error") {
      return data.error ?? "Unknown error";
    }
    if (data.status === "empty") {
      return "No recent slips — keep going. Reopen a Lesson or drill a Scenario to lock in new vocabulary.";
    }
    if (!data.result) return "";
    const windowDays = Math.round(data.result.windowMs / (24 * 60 * 60 * 1000));
    return `${data.result.totalLapses} lapse${data.result.totalLapses === 1 ? "" : "s"} across the last ${windowDays} day${windowDays === 1 ? "" : "s"}. Open them in the review queue to relearn.`;
  })();

  return (
    <Card
      eyebrow="Recent mistakes"
      title={title}
      footer={
        data.status === "ready" || data.status === "empty" ? (
          <Link
            href="/review"
            className="text-terracotta-deep underline decoration-terracotta underline-offset-4"
          >
            Open review queue →
          </Link>
        ) : undefined
      }
    >
      <p
        className="text-sm text-ink-soft"
        data-testid="recent-mistakes-headline"
        data-status={data.status}
      >
        {detail}
      </p>
      {data.status === "ready" && data.result ? (
        <ol
          className="mt-4 space-y-2 text-sm"
          data-testid="recent-mistakes-list"
        >
          {data.result.items.map((item) => (
            <li
              key={item.itemId}
              className="flex items-baseline justify-between gap-3 hairline py-1"
              data-testid="recent-mistakes-item"
              data-item-kind={item.kind}
            >
              <span className="flex flex-col">
                <span className="font-medium text-ink">{item.pt}</span>
                <span className="text-xs text-ink-mute">{item.gloss}</span>
              </span>
              <span
                className="text-xs text-terracotta-deep"
                data-testid="recent-mistakes-lapses"
              >
                {item.lapses}×
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      {data.status === "error" ? (
        <p
          className="mt-3 text-xs text-terracotta-deep"
          data-testid="recent-mistakes-error"
        >
          {data.error ?? "Unknown error"}
        </p>
      ) : null}
    </Card>
  );
}