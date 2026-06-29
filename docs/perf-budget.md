# Performance Budget

The platform ships with strict performance budgets (NFR-2). The budgets are
enforced in CI via two complementary mechanisms:

1. **`pnpm perf:budget`** — per-route First Load JS alarm.
   Runs after every `pnpm build` and on every PR. Reads
   `.next/app-build-manifest.json`, sums the JS + CSS bytes for every page
   route, and asserts against the per-route budgets in `scripts/perf-budget.ts`.
   Wired into the `verify` job in `.github/workflows/ci.yml`.
2. **Lighthouse CI** — `lighthouserc.json` asserts FCP, LCP, TTI, CLS, and
   the Performance score against the limits below on the public top-level
   routes. Runs on every push to `main` and nightly via
   `.github/workflows/lighthouse.yml`.

## Why two mechanisms

`pnpm perf:budget` is fast (~50 ms) and deterministic — it only reads the
manifest — so it can run on every PR without spinning up a browser. The
Lighthouse run needs a real Chromium and serves the build, so it runs on
`main` and nightly rather than on every PR.

## Budgets (NFR-2)

| Metric                 | Limit          | Source     |
| ---------------------- | -------------- | ---------- |
| FCP                    | ≤ 1.5 s        | NFR-2      |
| LCP                    | ≤ 2.0 s        | NFR-2      |
| TTI                    | ≤ 2.0 s        | NFR-2      |
| CLS                    | ≤ 0.1          | NFR-2      |
| Total Blocking Time    | ≤ 200 ms (warn)| NFR-2      |
| Performance (mobile)   | ≥ 90           | NFR-2      |
| Performance (desktop)  | ≥ 95           | NFR-2      |

### Per-route First Load JS budgets (`pnpm perf:budget`)

Numbers are **gzipped** First Load JS bytes — they match what Next.js
prints for `First Load JS` and what users actually download on a slow
network. The current build sits at 85–117 kB; the budgets below leave
~10–15 kB of headroom for new features.

| Group   | Budget     | Routes                                                                |
| ------- | ---------- | --------------------------------------------------------------------- |
| public  | 100 kB     | `/`, `/accessibility`                                                 |
| auth    | 110 kB     | `/log-in`, `/sign-up`                                                 |
| app     | 130 kB     | `/dashboard`, `/review`, `/practice`, `/progress`, `/profile`, `/placement`, `/settings`, `/confidence`, `/lesson/[lessonId]`, `/assess/[boundary]` |

The `app` group gets the largest budget because it includes the
Conversational Practice page (the heaviest route in the codebase — it
ships the voice capture state machine, the dialogue UI, and the rerank
orchestrator). Tune via `PER_ROUTE_BUDGETS` in `scripts/perf-budget.ts`.

## Regression detection

`pnpm perf:budget` also reads a baseline at
`.lighthouseci/bundle-baseline.json` (if present) and flags any metric
that grew by more than 10 % since the baseline. The baseline is seeded on
the first CI run and refreshed with `pnpm perf:budget:update` whenever
the budgets need to be re-baselined after a deliberate change.

This satisfies the acceptance criterion "Any regression > 10 % on a
metric blocks merge" without requiring every PR to do a Lighthouse run.

## Bundle analyzer

`pnpm perf:analyze` runs `next build` with `ANALYZE=true` and writes the
webpack-bundle-analyzer report to `.next/analyze/`. The HTML reports are
gitignored. Run it locally when a route starts creeping toward its
budget to find the offending chunks.

## Lighthouse CI

`.github/workflows/lighthouse.yml` runs `pnpm exec lhci autorun` on:

- every push to `main`
- a nightly cron at 06:00 UTC

The job boots `pnpm start` in mock mode (`NEXT_PUBLIC_MOCK=1`) and audits
the four public top-level routes that render without a learner session:
`/`, `/log-in`, `/sign-up`, `/accessibility`. Reports are uploaded to
[lighthouse-ci temporary public storage][lhci-tmp] so the diff is visible
in the workflow run. The LHCI assertions in `lighthouserc.json` block
the workflow on a budget miss.

[lhci-tmp]: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md#upload-results

Authenticated routes (`/dashboard`, `/review`, …) are audited manually for
now; see [follow-up issue: Authenticated LHCI runs](#) for the plan to
extend the LHCI run with a learner fixture and cookies.

## Asset strategy

- **TTS audio** — emitted by `pnpm assets:tts` to
  `public/assets/tts/{unitId}/{assetId}.mp3`. Manifest versioned via
  `manifest.json`. Cache-Control is `public, max-age=31536000, immutable`
  (one-year TTL, content-addressed filenames).
- **Static assets** — Next.js's default `_next/static` already serves with
  hashed filenames + immutable Cache-Control. No additional config.
- **Fonts** — three display families loaded via `next/font/google`
  (`Fraunces`, `DM Sans`, `JetBrains Mono`). Self-hosted via the Next.js
  font pipeline, no third-party fetch at runtime.

## Critical CSS

Next.js 14's built-in CSS extraction handles critical CSS automatically
for every route. There is no additional `critters` step. We may revisit
this if a specific route's CSS payload starts dominating the budget.

## Local workflow

```bash
# Quick check (reads the manifest, no browser required).
pnpm build && pnpm perf:budget

# Refresh the baseline after a deliberate change.
pnpm perf:budget:update

# Visualise bundle composition.
pnpm perf:analyze    # open .next/analyze/client.html

# Full Lighthouse run locally (requires pnpm start + lhci autorun).
pnpm build && pnpm start &  # in mock mode
pnpm perf:lighthouse
```