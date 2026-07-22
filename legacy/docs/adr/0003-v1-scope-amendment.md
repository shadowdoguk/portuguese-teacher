# ADR 0003 — v1 Scope Amendment

**Status:** Accepted
**Date:** 2026-06-23
**Deciders:** Product, Pedagogy lead, Engineering lead
**Related:** [`CONTEXT.md`](../../CONTEXT.md), [`docs/requirements/portuguese-teacher-requirements.md`](../requirements/portuguese-teacher-requirements.md), [`ADR-0001`](0001-pedagogical-model.md), [`ADR-0002`](0002-voice-loop-architecture.md)

## Context

The v1.0 draft of the requirements document and ADR-0001 / ADR-0002 were
internally inconsistent in five places. Each inconsistency, left unresolved,
would force a forked spec, two competing implementations, or a re-papering
of the v1 release. The contradictions surfaced during a requirements grilling
session on 2026-06-23:

1. **Dialect scope.** §1.2 says *"One dialect at launch: pt-PT only"* but §1.3,
   §3.1, §3.4, §7.1, ADR-0001, and the codebase (`src/lib/auth/types.ts`)
   all assume *both* pt-BR and pt-PT. The pt-BR / pt-PT pair was the
   intended launch surface; §1.2 was a stale draft fragment.
2. **Proficiency ladder shape.** §3.2 FR-LP-1 describes a *"six-stage
   ladder"* with five rows including a mis-placed *"A1→A2 (A1.5)"* bridge
   row whose description duplicates the A2 row. The downstream math (30
   Units, 150 Lessons, three Milestone Assessments) is consistent only
   with five stages.
3. **Remediation in a DAG.** §3.2 FR-LP-2 claims *"Units are arranged in a
   directed acyclic graph"* but also *"alternative paths exist"* and FR-LP-5
   prescribes *"remedial Units drawn from the gap areas"*. Back-edges in a
   DAG are not a DAG. The mechanism was undefined.
4. **SC-5 sampling without opt-in.** §3.5 FR-DATA-2 sets the recording
   default to *"do not store"*; §5 SC-5 requires *"a randomly sampled 1% of
   utterances"* for production WER measurement. The two cannot both be true
   without a separate audio path.
5. **Above-A0 placement.** §3.4 lists a *"proficiency self-assessment"* at
   sign-up but no placement mechanism — and §3.2 forbids skipping ahead of
   the DAG. Above-A0 Learners had no defined path.
6. **OAuth at sign-up.** §3.4 sign-up surface #1 lists *"email + password
   (or OAuth: Google, Apple)"*; the v1 auth surface is otherwise email +
   password. OAuth adds third-party redirect flow, account-merging, and
   token-rotation work that is not justified for v1.

## Decision

Six amendments, applied together so the spec resolves as a single coherent
v1:

### 1. pt-PT only in v1; pt-BR deferred to v1.1

`requirements §1.3, §3.1, §3.4, §3.5, §5, §7.1, §7.2, §6.5; ADR-0001;
CONTEXT.md Glossary ("Dialect", "Variants"); src/lib/auth/types.ts;
src/app/page.tsx; src/components/layout/Footer.tsx.`

The Learner selects *pt-PT* at sign-up (no picker — the value is fixed).
`Dialect = "pt-PT"`. The dialect propagates through all AI Teacher output,
TTS, vocabulary, and orthography. The Voice Loop Tier detection is
dialect-agnostic; only the ASR/TTS endpoints are dialect-locked. SC-1
external assessment is **CAPLE** only (CELPE-Bras deferred with pt-BR).

### 2. Five-stage ladder, three Milestones

`requirements §3.2 FR-LP-1; ADR-0001; CONTEXT.md Glossary ("Level",
"Milestone", "Proficiency ladder").`

Drop the *"A1→A2"* row. The ladder is **A0 → A1 → A2 → B1** (B1 is the v1
ceiling; B2 stays out of scope). The prose is corrected from *"six-stage"*
to *"five-stage"*. Three Milestones at A0→A1, A1→A2, A2→B1 gate
progression. Total curriculum: ≈ 30 Units, ≈ 150 Lessons, ≈ 250–300 hours.

### 3. Remedial Anchors (no back-edges)

`requirements §3.2 FR-LP-2; CONTEXT.md Glossary ("Remedial Anchor",
"Curriculum").`

Remediation is implemented as **Remedial Anchors**: pointers from a Unit
to a prior Unit whose content the AI Teacher can re-present with
scaffolding. Anchors are not back-edges; the canonical curriculum DAG
remains acyclic. A failed Milestone routes the Learner to one or more
Remedial Anchors before re-attempt. Alternative grammar paths (per FR-LP-2)
are also expressed as anchors, not parallel DAG branches.

### 4. SC-5 Sampling Buffer (separate from opt-in storage)

`requirements §3.5 FR-DATA-2; CONTEXT.md Glossary ("SC-5 Sampling Buffer",
"Stored Recording").`

The platform maintains a separate **SC-5 Sampling Buffer** — an ephemeral
audio buffer (≤ 24 h retention, no learner-identifying metadata persisted
alongside) used solely to compute SC-5 production-WER on a 1% sample.
The SC-5 Sampling Buffer is *not* a Stored Recording and is *not* subject
to opt-in; the opt-in posture in FR-DATA-2 is preserved and applies only to
Stored Recordings.

### 5. Placement Lesson at sign-up

`requirements §3.2 FR-LP-1, §3.4; CONTEXT.md Glossary ("Placement Lesson").`

When a Learner's self-assessment at sign-up is above A0, the Learner is
routed to a single **Placement Lesson** — an adaptive Lesson that
confirms or revises the starting Unit before the regular sequence begins.
A0 self-assessments skip the Placement Lesson and start at Unit 1.

### 6. Defer OAuth sign-in to v1.1

`requirements §1.3, §3.4; CONTEXT.md Glossary ("Lead" annotated).`

v1 ships **email + password only**. OAuth (Google / Apple) is moved to the
§1.3 out-of-scope list. The auth implementation is correspondingly
simplified — no third-party redirect, no account-merging logic, no
OAuth-specific token-rotation paths. The `Lead` glossary entry is kept
(it's still meaningful for v1.1's marketing contact form) but annotated
as reserved.

## Consequences

### Positive

- Spec, ADRs, code, and marketing are now consistent on dialect (pt-PT
  only), ladder (5 stages), curriculum remediation (anchors), and
  sampling (ephemeral buffer separate from opt-in).
- Content production cost for v1 halves (one dialect track, not two);
  the saved budget funds deeper pt-PT scenario coverage.
- Marketing copy simplifies to a single-dialect value proposition.
- Single-region EU hosting in v1 (no Brazil region required); lower
  v1.0 ops surface.
- Email/password auth is enough for v1's learner-onboarding flow; OAuth
  can land in v1.1 alongside pt-BR.

### Negative

- **Brazilian Learners wait until v1.1.** This is a real opportunity
  cost; the pt-BR addressable market is larger than pt-PT. Mitigation:
  communicate the v1.1 timeline on the marketing page and capture pt-BR
  Leads (see §9 Open Questions — *Lead* entry reserved for v1.1).
- The 5-stage ladder drops the *A1→A2 bridge* scaffold. Content team
  must redistribute bridge-style scaffolding (past-tense narration,
  connected sentences) into Units at the A1→A2 boundary instead of a
  dedicated row.
- A *Placement Lesson* is new product surface work. Estimated: one
  designer + one content author for ≈ 1 week.
- A new *SC-5 Sampling Buffer* data path requires opt-in-agnostic
  retention (≤ 24 h) and an opt-out for jurisdictions that require it
  (review with legal before launch).
- The `Dialect` type narrowing and dialect-picker removal are code
  deletions, but they also force a re-test of the `Learner` profile flow.

### Neutral

- ADR-0001's *"maintaining two dialect tracks doubles Lesson Material
  Library production cost"* consequence is now superseded; v1 ships one
  track.
- The `Lead` glossary entry remains reserved (no v1 contact form);
  adding the contact form is part of v1.1 alongside OAuth and pt-BR.

## Alternatives considered

- **Ship both dialects in v1 (status quo of the draft spec).** Rejected:
  doubles content production cost, doubles TTS voice licensing,
  doubles the SC-1 assessment path (CAPLE + CELPE-Bras), and contradicts
  §1.2's stated pt-PT-only intent.
- **Ship pt-BR only.** Rejected: §1.2 was explicit about pt-PT, and the
  brand identity ("Português") is dialect-neutral — narrowing to pt-BR
  is a more aggressive scope cut than narrowing to pt-PT.
- **Six-stage ladder kept as-is.** Rejected: the *A1→A2* row was
  mis-placed, its description duplicated A2, and the downstream math
  (30 Units / 150 Lessons / 3 Milestones) is consistent only with five
  stages.
- **Back-edges in the curriculum DAG.** Rejected: re-introduces cycles,
  which breaks prerequisite bookkeeping (Unit-unlock predicates, mastery
  tracking) and complicates the i+1 difficulty signal. Anchors achieve
  the same pedagogical outcome with a strictly simpler graph.
- **Re-use Stored Recordings for SC-5 sampling.** Rejected: forces
  opt-in default-on (privacy regression) or makes SC-5 measurement
  sample-biased (only opted-in Learners contribute).
- **Placement Test as a separate scored product surface.** Rejected:
  one-off scoring is overkill; a single Lesson with adaptive scaffolding
  is sufficient for v1's A0/A1 self-assessment gap.
- **Ship OAuth in v1.** Rejected: third-party redirect flow, account
  merging, and token rotation are non-trivial and orthogonal to the
  platform's pedagogical mission. OAuth's main v1 benefit (lower
  sign-up friction) does not justify the v1.0 complexity.

## References

- `docs/requirements/portuguese-teacher-requirements.md` — amended
  §1.3, §1.4, §3.1, §3.2, §3.4, §3.5, §5, §6.2, §6.5, §7.1, §7.2, §8, §9.
- `docs/adr/0001-pedagogical-model.md` — amended *"Dialect-locked"* line
  and dialect-track cost consequence.
- `docs/adr/0002-voice-loop-architecture.md` — amended Voice Loop Tier 1
  diagram (NLU+NLG structured output), added *"NLU + NLG"* and
  *"Pronunciation Score"* sub-sections.
- `CONTEXT.md` — Glossary updated to: pt-PT-only Variants, five Levels,
  three Milestones, plus new terms *Placement Lesson*, *Remedial Anchor*,
  *SC-5 Sampling Buffer*, *Stored Recording*, plus Lesson composition
  rule (Lesson body + Practice Exercises).
- `src/lib/auth/types.ts`, `src/app/page.tsx`, `src/lib/auth/mockUsers.ts`,
  `src/components/ui/DialectChip.tsx`, `src/components/ui/DialectPicker.tsx`,
  `src/test/smoke.test.tsx`, `src/components/layout/Footer.tsx` —
  narrowed `Dialect` to `"pt-PT"`; removed dialect picker from profile;
  collapsed two DialectChips to one on the marketing page; updated copy.
