import { describe, expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import axe from "axe-core";

type AxeResults = {
  violations: ReadonlyArray<{
    id: string;
    impact: "minor" | "moderate" | "serious" | "critical" | null;
    description: string;
    help: string;
    helpUrl: string;
    nodes: ReadonlyArray<{
      target: ReadonlyArray<string>;
      html: string;
    }>;
  }>;
};

async function runAxe(container: Element): Promise<AxeResults> {
  const result = (await axe.run(container, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag22aa", "best-practice"],
    },
    rules: {
      "color-contrast": { enabled: false },
    },
    resultTypes: ["violations"],
  })) as unknown as AxeResults;
  return result;
}

function summarise(label: string, results: AxeResults): void {
  if (results.violations.length === 0) return;
  const lines = results.violations.map((v) => {
    const targets = v.nodes
      .slice(0, 3)
      .map((n) => `  - ${n.target.join(" ")}`)
      .join("\n");
    return `[${v.impact ?? "unknown"}] ${v.id} — ${v.help}\n${targets}`;
  });
  // eslint-disable-next-line no-console
  console.warn(`\n[${label}] ${results.violations.length} violation(s):\n${lines.join("\n\n")}\n`);
}

describe("axe accessibility — core components", () => {
  it("the practice session page (Tier 3 fallback) has no axe violations", async () => {
    const { PracticeSession } = await import("@/components/practice/PracticeSession");
    const { AuthProvider } = await import("@/lib/auth/AuthProvider");
    const { SettingsProvider } = await import("@/lib/settings");
    const { container } = render(
      <AuthProvider>
        <SettingsProvider>
          <PracticeSession />
        </SettingsProvider>
      </AuthProvider>,
    );
    const results = await runAxe(container);
    summarise("PracticeSession", results);
    expect(results.violations.map((v) => v.id).sort()).toEqual([]);
    cleanup();
  });

  it("the teacher bubble (text-only mode) has no axe violations", async () => {
    const { TeacherBubble } = await import("@/components/practice/TeacherBubble");
    const { DEFAULT_TTS_VOICE } = await import("@/lib/settings");
    const { container } = render(
      <TeacherBubble
        utterance="Olá! Tudo bem?"
        voice={DEFAULT_TTS_VOICE}
        textOnly
      />,
    );
    const results = await runAxe(container);
    summarise("TeacherBubble", results);
    expect(results.violations.map((v) => v.id).sort()).toEqual([]);
    cleanup();
  });

  it("the tier badge has no axe violations", async () => {
    const { TierBadge } = await import("@/components/practice/TierBadge");
    const { container } = render(
      <TierBadge
        capabilities={{
          tier: 3,
          webSpeechApi: false,
          mediaRecorder: false,
          reason: "Test fallback",
        }}
      />,
    );
    const results = await runAxe(container);
    summarise("TierBadge", results);
    expect(results.violations.map((v) => v.id).sort()).toEqual([]);
    cleanup();
  });

  it("the feedback overlay has no axe violations", async () => {
    const { FeedbackOverlay } = await import("@/components/practice/FeedbackOverlay");
    const { container } = render(
      <FeedbackOverlay
        turn={{
          turnId: "test",
          utteranceId: "u1",
          teacherUtterance: "Olá! Como estás?",
          comprehensionOk: true,
          pronunciationScore: 85,
          feedback: [],
          mock: true,
          generatedAt: Date.now(),
          nextDifficultyTarget: 1.0,
        }}
      />,
    );
    const results = await runAxe(container);
    summarise("FeedbackOverlay", results);
    expect(results.violations.map((v) => v.id).sort()).toEqual([]);
    cleanup();
  });

  it("the scenario library list is axe-clean when rendered with one scenario", async () => {
    const { ScenarioLibrary } = await import("@/components/practice/ScenarioLibrary");
    const { container } = render(
      <ScenarioLibrary
        progress={{}}
        onSelect={() => undefined}
      />,
    );
    const results = await runAxe(container);
    summarise("ScenarioLibrary", results);
    expect(results.violations.map((v) => v.id).sort()).toEqual([]);
    cleanup();
  });

  it("the /accessibility statement page is axe-clean", async () => {
    const AccessibilityPage = (await import("@/app/accessibility/page")).default;
    const { container } = render(<AccessibilityPage />);
    const results = await runAxe(container);
    summarise("AccessibilityPage", results);
    expect(results.violations.map((v) => v.id).sort()).toEqual([]);
    cleanup();
  });

  it("the review card (review-queue card) is axe-clean", async () => {
    const { container } = render(
      <article
        className="card-surface flex flex-col gap-6 p-8"
        aria-live="polite"
        data-testid="srs-card"
      >
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-ink-mute">
          <span className="stage-stamp">Vocabulary</span>
          <span>Half-life · 4h</span>
        </div>
        <p className="font-display text-4xl text-ink" lang="pt-PT">
          água
        </p>
        <p className="text-pretty text-ink-soft">water</p>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border border-ink/10 bg-paper-warm/40 p-4">
            <dt>Item</dt>
            <dd>água</dd>
          </div>
        </dl>
      </article>,
    );
    const results = await runAxe(container);
    summarise("ReviewCard", results);
    expect(results.violations.map((v) => v.id).sort()).toEqual([]);
    cleanup();
  });
});

describe("axe accessibility — page language", () => {
  it("the document html declares a lang attribute", () => {
    const layout = readFileSync(
      join(process.cwd(), "src/app/layout.tsx"),
      "utf8",
    );
    expect(layout).toMatch(/<html[^>]*\blang=/);
  });
});

describe("axe accessibility — reduced motion", () => {
  it("the global stylesheet honours prefers-reduced-motion", () => {
    const css = readFileSync(
      join(process.cwd(), "src/app/globals.css"),
      "utf8",
    );
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});
