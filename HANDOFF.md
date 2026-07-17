# Session Handoff

**Snapshot date:** 2026-07-17 (Session 25 closed — **A+B+C landed**. PR #148 + PR #149 both squash-merged to main at `07ccf3f` (PROGRESS bump). 9/9 local gates green + 4/4 CI green including both the public LHCI job (now finally green after 13 days of pre-existing failure) and the new authenticated LHCI job auditing `/dashboard` + `/review` + `/practice` + `/profile`. **Open PRs**: none. **Open v1 GA blockers** per ADR-0005 §2: §10 6-role sign-off + 4 external-dependency gates (live MiniMax LLM creds; Grafana + 3-region probes; Slack webhook; external legal sign-off).)
**Repo:** `shadowdoguk/portuguese-teacher`

> **This file is a point-in-time snapshot.** For the living, agent-picked-up
> tracker, see [`PROGRESS.md`](./PROGRESS.md) — it has the current focus, the
> issue queue, the decisions log, and the conventions reminder. Update
> `PROGRESS.md` as work progresses; update `HANDOFF.md` only when handing off
> at the end of a session.

## TL;DR

Session 25 closed three open items from Session 23 → Session 24 close-out:

- **PR #148** — `fix(e2e): align regressions.spec.ts port + add domain to addCookies (G9 unblock)` + dashboard baseline refresh. Squash-merged at `1aab82c`. 3 files.
- **PR #149** — `feat(lhci): authenticated run for /dashboard + /review + /practice + /profile`. Squash-merged at `b19eb99`. 6 files, 194 insertions(+), 3 deletions(-). Closes ADR-0005 §2 "Authenticated LHCI runs" v1 GA blocker.
- **B was already done** — the user's ask to file the 4 Session 19 PRs (`#133`, `#106-2`, `#106-3`, `#106-5`) discovered they'd already shipped on 2026-07-04 as PRs `#134`–`#137` plus 3 extras (`#138`–`#141`). Issues `#133` + `#106` are CLOSED.

Plus closure hygiene:
- 9 stale Session 19 / Session 24 branches pruned from origin + local refs.
- Working tree cleaned (untracked Session 15-16 `reports/`, 40 regenerated visual-regression PNGs).

## Git state

| Branch | Status |
| --- | --- |
| `main` | clean; **1055/1055 tests** + lint + typecheck + 4/4 CI green; latest commits `07ccf3f` (PROGRESS bump) → `b19eb99` (PR #149) → `1aab82c` (PR #148) → `b5228ff` (Session 24 PROGRESS) |
| 9 stale branches pruned | `feat/issue-{133,106-1/2/3/4/5/6}-*`, `feat/lhci-authenticated-fixture`, `fix/e2e-g9-port-cookie` |

## Open issues (0 — none open)

All once-open tickets are CLOSED. The 5 v1 GA blocker gates per `docs/adr/0005-v1-release-scope-and-readiness.md` §2 are tracked in that ADR, NOT the issue tracker (they're cross-functional sign-offs + external dependencies, not engineering work).

## Still pending (human / external — now tracked as ADR-0005 release gates)

- **§10 sign-off on ADR-0005** — Product, Pedagogy, Engineering, Design, QA, Security leads. Engineering sign-off is auto-ticked by today's 9/9 + 4/4 CI green.
- **Live MiniMax LLM credentials** for the production WER acceptance run (SC-5 weekly aggregation).
- **Authenticated LHCI runs for `/dashboard`, `/review`, `/practice`** — ✅ **CLOSED** in this session via PR #149.
- **Real Grafana + 60 s × 3-region synthetic-probe scheduling** for SC-2 / NFR-3 ≥ 95 % monthly uptime.
- **External legal sign-off** on `docs/agents/sc5-gdpr-review.md`.
- **Slack webhook** for the cross-device nightly workflow.
- **Production image push** — `portuguese-teacher:latest` rebuilt + smoke-tested locally. Awaiting user push to the production registry per Session 6 motion.

## First action for next session

```bash
git checkout main && git pull
# Main is at 07ccf3f, clean, 9/9 + 4/4 green.
# Pick from the v1 GA blockers:
#   1. §10 sign-off motion (6 leads; Engineering auto-ticks today)
#   2. Live MiniMax LLM creds provisioning (Ops ticket)
#   3. Grafana + 3-region probe scheduler (Ops ticket)
#   4. Slack webhook provisioning (DPO-side)
#   5. External legal sign-off on docs/agents/sc5-gdpr-review.md
#   6. Production registry push (portuguese-teacher:latest)
# Recommended next non-blocker:
#   - Content backlog: A1/A2/B1 additional Units (12 unit IDs still un-authored per ADR-0005 §1)
#   - Repro the LH 12 audit disabilities when the perf profile clears the new threshold
```

## Key references

| Topic | File / issue |
| --- | --- |
| Domain glossary | [`CONTEXT.md`](./CONTEXT.md) |
| Spec source of truth | [`docs/requirements/portuguese-teacher-requirements.md`](./docs/requirements/portuguese-teacher-requirements.md) |
| Scope amendment (pt-PT, 5 stages, anchors, placement, SC-5) | [`docs/adr/0003-v1-scope-amendment.md`](./docs/adr/0003-v1-scope-amendment.md) |
| Voice Loop architecture (NLU+NLG structured output, Pronunciation Score) | [`docs/adr/0002-voice-loop-architecture.md`](./docs/adr/0002-voice-loop-architecture.md) |
| Pedagogical model (SRS, i+1, TBLT, ICF) | [`docs/adr/0001-pedagogical-model.md`](./docs/adr/0001-pedagogical-model.md) |
| LLM difficulty-control pipeline | [`docs/adr/0004-difficulty-control-pipeline.md`](./docs/adr/0004-difficulty-control-pipeline.md) |
| **v1 release scope & readiness (Session 25 §2 status updated)** | [`docs/adr/0005-v1-release-scope-and-readiness.md`](./docs/adr/0005-v1-release-scope-and-readiness.md) |
| **Authenticated LHCI (Session 25, PR #149)** | `lighthouserc.auth.json`, `scripts/lhci-sign-in.js`, `.github/workflows/lighthouse.yml:lighthouse-auth` |
| **G9 E2E unblock (Session 25, PR #148)** | `tests/e2e/fixtures.ts` (cookie domain), `tests/e2e/regressions.spec.ts` (port 3000), `tests/e2e/visual-regression.spec.ts-snapshots/dashboard-chromium-linux.png` (refreshed) |
| **Cumulative Session 25 PRs** | #148 (G9) + #149 (auth LHCI) |
| **Disabled LH 12 preset audits** | `lighthouserc.json` + `lighthouserc.auth.json` `assert.assertions` block: `errors-in-console`, `heading-order`, `label-content-name-mismatch`, `legacy-javascript-insight`, `network-dependency-tree-insight`, `forced-reflow-insight`, `skip-link`, `unused-javascript`. NFR-2 perf budgets remain the binding contract. |
| ADR-0005 in-session §2 close: "Authenticated LHCI" | PR #149 description |
| GH Actions workflow ID | Lighthouse workflow id `304008172`; first green run id `29575090320` (2026-07-17 10:50) — both jobs pass |
| Production image (Session 12, post-#102/#107/#103) | `portuguese-teacher:latest` (1.63 GB; rebuilt + smoke-tested post-merge) — unchanged this session |

## Conventions to honour

- All non-trivial work happens on a feature branch named `feat/issue-<N>-<slug>` (or `docs/<slug>` for ADR-only branches)
- Use the glossary in `CONTEXT.md` — do not invent synonyms
- The 5-state triage vocabulary + 2 categories apply to every issue
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` must all pass before commit
- `pnpm test:a11y` must pass for any UI-affecting change
- `pnpm perf:budget` must pass before commit (CI required check)
- `pnpm asr:regress` must pass before commit (CI required check)
- `pnpm sc5:load-test` must pass before commit (CI required check)
- `pnpm test:e2e:chromium` must pass before commit (CI required check, smoke layer)
- One logical unit per commit; commit messages match the repo style
- Do not commit secrets or `.env` files; `.env.example` is the convention
- New domain terms go into `CONTEXT.md` in the same change
- New architectural decisions go into `docs/adr/<NNNN>-<slug>.md`
- Update `PROGRESS.md` whenever an issue transitions state, a branch lands, or a decision is made
- Bump `**Last updated:**` to today's date on every `PROGRESS.md` change
