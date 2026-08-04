import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Accessibility · Portuguese Teacher",
  description:
    "Our commitment to WCAG 2.2 AA, the assistive technologies we test against, and how to report an accessibility issue.",
};

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-12" data-testid="accessibility-page">
      <header className="space-y-3">
        <span className="stage-stamp">Accessibility statement</span>
        <h1 className="text-pretty font-display text-display-lg font-light">
          Built for everyone learning Portuguese.
        </h1>
        <p className="max-w-2xl text-pretty text-ink-soft">
          Portuguese Teacher targets WCAG 2.2 Level AA conformance (FR-WEB-5). Every top-level
          route ships an automated axe-core scan in CI; manual audits run on a regular cadence. If
          you find an accessibility barrier, please report it — we will fix it.
        </p>
      </header>

      <section aria-labelledby="conformance-heading" className="space-y-4">
        <h2 id="conformance-heading" className="font-display text-2xl text-ink">
          Conformance
        </h2>
        <Card titleAs="h3" title="WCAG 2.2 AA">
          <p>
            All functional pages meet WCAG 2.2 Level AA. The automated axe-core scan in CI
            (tags: <code>wcag2a</code>, <code>wcag2aa</code>, <code>wcag22aa</code>,{" "}
            <code>best-practice</code>) must report zero violations on every PR. The
            colour-contrast rule is currently run as a Lighthouse audit instead, because jsdom
            cannot resolve computed background colours.
          </p>
        </Card>
        <Card titleAs="h3" title="Standards &amp; assistive technologies">
          <ul className="list-disc space-y-1 pl-5">
            <li>Keyboard-only navigation (Tab, Shift+Tab, Enter, Space, Escape)</li>
            <li>Screen readers: VoiceOver (macOS/iOS), NVDA (Windows), TalkBack (Android)</li>
            <li>
              Browser zoom up to 200% without horizontal scrolling, and up to 400% with
              reflow
            </li>
            <li>Windows High Contrast mode</li>
            <li>
              <code>prefers-reduced-motion: reduce</code> — global stylesheet suppresses
              non-essential motion
            </li>
            <li>
              <code>prefers-color-scheme</code> — light theme in v1; dark theme deferred
            </li>
          </ul>
        </Card>
      </section>

      <section aria-labelledby="features-heading" className="space-y-4">
        <h2 id="features-heading" className="font-display text-2xl text-ink">
          Accessibility features
        </h2>
        <Card titleAs="h3" title="Audio + text parity">
          <p>
            Every audio-first interaction (microphone capture, TTS playback) has a text
            substitute. Tier 3 (text-only) is always reachable via the textarea fallback in
            Conversational Practice; the Review card media is opt-in via the{" "}
            <code>retrievalMode</code> setting; the Conversational Practice page also has a
            text-only mode toggle that suppresses TTS playback while keeping the written
            utterance on screen.
          </p>
        </Card>
        <Card titleAs="h3" title="Captions &amp; transcripts">
          <p>
            Teacher utterances are always rendered as text on the screen. TTS audio is
            supplementary; never the only channel. Captions track the teacher&apos;s text
            (per FR-WEB-5) and the Captions setting (<code>on</code> by default) is reachable
            from the Settings page. Each teacher bubble also surfaces a manual replay button
            (with an accessible <code>aria-label</code>) so users can re-hear an utterance
            on demand.
          </p>
        </Card>
        <Card titleAs="h3" title="Focus &amp; keyboard">
          <p>
            Focus rings are visible on every interactive element via{" "}
            <code>:focus-visible</code>. The global stylesheet defines a 2 px outline with
            2 px offset that inherits the text colour (already contrast-checked). There are
            no keyboard traps: modals use the native <code>&lt;dialog&gt;</code> element
            where present, and the Tier 2 MediaRecorder path releases focus to the Send
            button on stop.
          </p>
        </Card>
        <Card titleAs="h3" title="Live regions &amp; errors">
          <p>
            Practice utterances announce interim transcripts in an{" "}
            <code>aria-live=&quot;polite&quot;</code> region. Microphone permission denials
            use <code>role=&quot;alert&quot;</code> with a static &quot;Microphone
            permission denied&quot; message. Form validation errors set{" "}
            <code>aria-invalid</code> on the offending input.
          </p>
        </Card>
        <Card titleAs="h3" title="Reduced motion">
          <p>
            <code>prefers-reduced-motion: reduce</code> collapses animation/transition
            durations to 0.01 ms globally. The Voice Loop&apos;s &quot;Drop difficulty on
            affective filter spike&quot; rule still fires — the UI change is just instant.
          </p>
        </Card>
      </section>

      <section aria-labelledby="report-heading" className="space-y-4">
        <h2 id="report-heading" className="font-display text-2xl text-ink">
          Report an accessibility issue
        </h2>
        <Card titleAs="h3" title="How to report">
          <p>
            Email <a href="mailto:accessibility@example.com">accessibility@example.com</a>{" "}
            with: the page URL, the assistive technology + browser version, the steps to
            reproduce, and what you expected vs. what happened. We respond within five
            business days and triage within ten.
          </p>
          <p>
            For urgent blockers (e.g. a screen reader cannot reach the Send-turn button),
            tag the email <code>urgent</code> in the subject line.
          </p>
        </Card>
        <Card titleAs="h3" title="Enforcement">
          <p>
            The automated axe-core scan in CI (<code>pnpm test:a11y</code>) is the contract
            for the next PR. Manual audits are tracked under{" "}
            <a href="https://github.com/shadowdoguk/portuguese-teacher/issues?q=is%3Aissue+label%3Aa11y">
              the <code>a11y</code> label
            </a>{" "}
            on GitHub.
          </p>
        </Card>
      </section>

      <footer className="border-t border-ink/10 pt-6 text-xs text-ink-mute">
        Last updated 2026-06-29. This page is generated from the accessibility stance in
        the v1 scope amendment (ADR-0003) and the test suite at{" "}
        <code>src/test/axe-a11y.test.tsx</code>.
      </footer>
    </div>
  );
}
