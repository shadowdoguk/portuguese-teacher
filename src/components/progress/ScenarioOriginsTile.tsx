"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type FetchedSources = {
  status: "loading" | "ready" | "empty" | "error";
  itemCount: number;
  distinctScenarios: ReadonlyArray<{ scenarioId: string; count: number }>;
  error: string | null;
};

export function ScenarioOriginsTile({ learnerId }: { learnerId: string }) {
  const [data, setData] = useState<FetchedSources>({
    status: "loading",
    itemCount: 0,
    distinctScenarios: [],
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await fetch(
          `/api/srs/state?learnerId=${encodeURIComponent(learnerId)}`,
        );
        if (!res.ok) {
          throw new Error(`Failed to load SRS state (${res.status})`);
        }
        const body = (await res.json()) as {
          ok: boolean;
          sources: ReadonlyArray<{ itemId: string; sourceScenarioId: string }>;
        };
        if (!body.ok) {
          throw new Error("SRS state response was not ok");
        }
        if (cancelled) return;
        const counts = new Map<string, number>();
        for (const source of body.sources ?? []) {
          counts.set(source.sourceScenarioId, (counts.get(source.sourceScenarioId) ?? 0) + 1);
        }
        const distinct = [...counts.entries()]
          .map(([scenarioId, count]) => ({ scenarioId, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        if (distinct.length === 0) {
          setData({ status: "empty", itemCount: 0, distinctScenarios: [], error: null });
        } else {
          setData({
            status: "ready",
            itemCount: body.sources?.length ?? 0,
            distinctScenarios: distinct,
            error: null,
          });
        }
      } catch (err) {
        if (cancelled) return;
        setData({
          status: "error",
          itemCount: 0,
          distinctScenarios: [],
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [learnerId]);

  const detail = (() => {
    if (data.status === "loading") return "Loading scenario-tagged items…";
    if (data.status === "error") return data.error ?? "Unknown error";
    if (data.status === "empty") {
      return "Complete a scenario to seed its vocabulary into your review queue.";
    }
    return `${data.itemCount} item${data.itemCount === 1 ? "" : "s"} tagged from scenarios.`;
  })();

  return (
    <Card eyebrow="Scenario origins" title="Vocabulary in context">
      <p
        className="text-sm text-ink-soft"
        data-testid="scenario-origins-detail"
        data-status={data.status}
      >
        {detail}
      </p>
      {data.status === "ready" ? (
        <ul className="mt-3 space-y-2 text-sm">
          {data.distinctScenarios.map((scenario) => (
            <li
              key={scenario.scenarioId}
              className="flex items-baseline justify-between gap-2"
              data-testid="scenario-origin-row"
              data-scenario-id={scenario.scenarioId}
            >
              <span className="font-mono text-xs text-ink-soft">{scenario.scenarioId}</span>
              <span className="font-mono text-xs text-ink-mute">{scenario.count}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {data.status === "error" ? (
        <p className="mt-3 text-xs text-terracotta-deep" data-testid="scenario-origins-error">
          {data.error}
        </p>
      ) : null}
    </Card>
  );
}