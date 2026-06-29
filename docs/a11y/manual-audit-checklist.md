# Manual Accessibility Audit Checklist — v1

Audit cadence: per Milestone (A0→A1, A1→A2, A2→B1) and on every UI-affecting PR.
The automated axe-core scan in CI (`pnpm test:a11y`) covers the structural rules;
this checklist covers the perceptual and operational items that axe cannot measure.

Source of truth: [WCAG 2.2 AA Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/).
Acceptance gate: every item below must be ✅ before a Milestone ships.

## 1. Perceivable

### 1.1 Text alternatives
- [ ] Every `<img>` has meaningful `alt` text (or empty `alt=""` for decorative)
- [ ] Every icon-only button has `aria-label` or visually-hidden text
- [ ] All charts / graphs have a `<figcaption>` or `aria-describedby` text alternative
- [ ] No images of text (except logos)

### 1.2 Time-based media
- [ ] Every TTS utterance has a matching on-screen text rendering
- [ ] Captions are present and accurate for any pre-recorded audio in lessons
- [ ] No auto-playing audio with sound; auto-played video has captions and a pause control

### 1.3 Adaptable
- [ ] Reading order is logical without CSS (verify by disabling styles)
- [ ] Instructions do not rely on sensory characteristics alone (colour, shape, size)
- [ ] Page has a `<main>` landmark, plus `<header>` / `<nav>` / `<footer>` as appropriate
- [ ] Headings are nested without skipping levels (h1 → h2 → h3, not h1 → h3)
- [ ] Form fields have associated `<label>` elements (or `aria-label` / `aria-labelledby`)

### 1.4 Distinguishable
- [ ] Colour contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text (≥ 18 px or ≥ 14 px bold)
- [ ] Colour contrast ≥ 3:1 for UI components and focus rings
- [ ] `text-ink` on `bg-paper` ≥ 4.5:1 (verify in `globals.css` after design tweaks)
- [ ] Colour is not the only means of conveying information (icons + text + colour)
- [ ] Resize text to 200% without loss of content or functionality
- [ ] No horizontal scrolling at 320 px viewport (CSS viewport tag is set)
- [ ] `prefers-reduced-motion: reduce` honoured globally (animation/transition → 0.01 ms)
- [ ] Audio can be controlled independently from system volume where possible

## 2. Operable

### 2.1 Keyboard accessible
- [ ] Every interactive element is reachable and activatable with the keyboard
- [ ] No keyboard traps (Tab cycles through all controls and back out)
- [ ] Skip link "Skip to main content" appears on every page (first Tab stop)
- [ ] Modal dialogs trap focus and restore it on close (native `<dialog>` preferred)
- [ ] Custom widgets (push-to-talk mic, scenario player) have full keyboard parity

### 2.2 Enough time
- [ ] Session timeouts are announced ≥ 20 s before they fire
- [ ] Users can extend any timeout
- [ ] No content auto-refreshes without a user-initiated control

### 2.3 Seizures and physical reactions
- [ ] No content flashes more than 3 times per second
- [ ] No large parallax / motion effects that could trigger vestibular issues

### 2.4 Navigable
- [ ] Skip link present and visible on focus
- [ ] Page titles are descriptive and unique (`<page-name> · Portuguese Teacher`)
- [ ] Focus order matches visual order
- [ ] Link text is descriptive out of context (no "click here" / "read more")
- [ ] Multiple ways to find a page (nav + sitemap + breadcrumb where applicable)
- [ ] Headings and labels are descriptive; section landmarks labelled with `aria-label`
- [ ] Focus is not entirely obscured by sticky headers / overlapping panels (WCAG 2.4.11)

### 2.5 Input modalities
- [ ] All click targets ≥ 24 × 24 CSS px (WCAG 2.5.8, AA)
- [ ] No gesture-only interactions; every drag has a button alternative
- [ ] No motion-actuated inputs (shake, tilt)
- [ ] Target size exception: inline text links, browser-controlled inputs

## 3. Understandable

### 3.1 Readable
- [ ] `<html lang="en">` (UI) and `<span lang="pt-PT">` around Portuguese text
- [ ] Unusual words / idioms have a glossary entry or inline definition
- [ ] Abbreviations are expanded on first use

### 3.2 Predictable
- [ ] Navigation order is consistent across pages
- [ ] Components that appear on multiple pages appear in the same relative order
- [ ] No unexpected context changes on focus or input
- [ ] Consistent help mechanism (e.g. keyboard shortcut hints) on every relevant page

### 3.3 Input assistance
- [ ] Form errors are identified in text and pointed to with `aria-describedby`
- [ ] Labels and instructions persist after the user submits
- [ ] Error prevention on legal / financial / data-deletion actions: confirm or undo
- [ ] Pasted values are accepted in authentication fields (no paste-blocking)
- [ ] Redundant entry: don't re-ask for information already given in this session

## 4. Robust

### 4.1 Compatible
- [ ] No ARIA roles that conflict with native semantics
- [ ] Status messages use `role="status"` or `role="alert"` (live regions)
- [ ] All custom controls have the correct ARIA role + state (`aria-pressed`, `aria-checked`, etc.)

## 5. PT-specific / domain

- [ ] TTS voice matches the dialect (pt-PT) for every utterance (per FR-AI-3)
- [ ] Portuguese pronunciation is the default (not pt-BR) in every TTS call
- [ ] Learner-set voice speed is respected in TTS (no global override)
- [ ] Captions setting is on by default; user can opt out
- [ ] The Voice Loop's "Hold Space to talk" hotkey is disabled when focus is in a textarea or input

## 6. Test environment

Run on the smallest and most-used viewports + the assistive tech you have access to:

- [ ] Chrome (latest) on macOS — VoiceOver
- [ ] Safari (latest) on macOS — VoiceOver
- [ ] Firefox (latest) on Windows — NVDA
- [ ] Edge (latest) on Windows — Narrator
- [ ] iOS Safari (latest) — VoiceOver
- [ ] Android Chrome (latest) — TalkBack
- [ ] Chrome on Linux — keyboard-only (no AT)
- [ ] High-contrast mode toggle
- [ ] 200 % zoom in every browser

## 7. Lighthouse & axe

- [ ] `pnpm test:a11y` returns zero violations (runs in CI on every PR)
- [ ] Lighthouse accessibility ≥ 95 on /, /dashboard, /practice, /review, /scenarios, /accessibility
- [ ] No regressions vs. the previous Milestone's Lighthouse report

## 8. Reporting

Issues found during a manual audit are filed as GitHub issues with the `a11y` label
and a severity tag (`critical` / `serious` / `moderate` / `minor`). Critical issues block
the Milestone; the others are filed into the current Milestone's backlog.
