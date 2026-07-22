# Playwright E2E — browser-tier matrix

This directory holds the cross-browser end-to-end suite required by issue #34
(Playwright E2E across Chromium + Safari + Firefox tiers) and FR-WEB-2 (browser
support matrix).

## Layout

| File | Scope |
| --- | --- |
| `fixtures.ts` | Demo-learner localStorage seed + UA-spoof helpers (chromium-only). |
| `practice-conversation.spec.ts` | 10-turn conversation + p95 latency + i+1 difficulty. |
| `tier-degradation.spec.ts` | UA spoofing for Tier 1 / 2 / 3 detection (chromium-only). |
| `smoke.spec.ts` | Single check used by the `firefox-smoke` project. |

## Browser projects

`playwright.config.ts` declares three projects:

- **`chromium`** — full suite. The natural UA maps to Tier 1 (live Tier 1
  Voice Loop). The `tier-degradation` UA-spoof tests run only on this project
  because `Navigator.prototype.userAgent` is overridable only on Chromium.
- **`webkit`** — full suite minus the UA-spoof tests. The natural UA maps to
  Tier 2 (batched Tier 2 Voice Loop).
- **`firefox-smoke`** — smoke-only (`smoke.spec.ts`). The natural UA maps to
  Tier 3 (text-only fallback). Kept smoke-only to keep CI fast.

## Commands

```bash
pnpm test:e2e:install    # one-time: install chromium, webkit, firefox
pnpm test:e2e            # full suite (uses `pnpm start` as the web server)
pnpm test:e2e:chromium   # chromium project only
pnpm test:e2e:webkit     # webkit project only
```

The test runner expects the app to be running with `NEXT_PUBLIC_MOCK=1` so the
MiniMax LLM/ASR/TTS wrappers all use their mock implementations. The
`playwright.config.ts` `webServer` block sets this env var automatically.

## CI

`.github/workflows/ci.yml` runs `pnpm test:e2e` in a dedicated `e2e` job,
separate from the `verify` job (which stays under the 15 min timeout). The
Playwright HTML report is uploaded as an artifact on failure for triage.

## Auth bypass

Tests use `signInAsDemoLearner(page)` from `fixtures.ts` to seed `localStorage`
with the demo learner profile before navigating. This bypasses the email/password
sign-in flow without touching the auth API or weakening the prod auth path.

## Why this is enough for #34

The acceptance criteria for #34 are:

- Playwright config: chromium + webkit projects, firefox as a smoke-only project ✓
- 10-turn conversation in Tier 1+2+3 with turn history + feedback overlays ✓
- p95 turn latency ≤ 1.5 s on Tier 1 (mock mode) ✓
- Tier degradation test: force tier override, assert UI switches ✓
- All three browser projects run green in CI ✓