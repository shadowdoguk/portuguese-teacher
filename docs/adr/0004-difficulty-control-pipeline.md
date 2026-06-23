# ADR 0004 — LLM Difficulty-Control Pipeline (Generate → Re-rank)

**Status:** Accepted
**Date:** 2026-06-23
**Deciders:** Engineering lead, Pedagogy lead
**Related:** [`CONTEXT.md`](../../CONTEXT.md), [`ADR-0001`](0001-pedagogical-model.md), [`ADR-0002`](0002-voice-loop-architecture.md), [`ADR-0003`](0003-v1-scope-amendment.md), [`docs/research/language-acquisition-findings.md`](../research/language-acquisition-findings.md) §4, [`docs/requirements/portuguese-teacher-requirements.md`](../requirements/portuguese-teacher-requirements.md) §FR-AI-4

## Context

FR-AI-4 mandates modular difficulty control over the AI Teacher's NLG output.
ADR-0002 already sketches a "single structured-output call" producing both NLU
and NLG, then notes that "the difficulty-controlled re-rank (per ADR-0001) then
selects among *N* candidate payloads". ADR-0001 makes the same commitment:
"MiniMax LLM, re-ranked for difficulty, delivers feedback using the rubric
*error type → correction → rule → example → encouragement* (FR-AI-4)."

Jin, Dugan & Callison-Burch (2026) showed that prompt-only control of LLM
output difficulty suffers *alignment drift* back toward native-level output
even when the prompt explicitly demands beginner output. Their
controllable-generation techniques (re-ranking, future-discriminators) raised
beginner comprehensibility from 39.4% to 83.3% in their evaluation.
The requirements doc (issue #6 acceptance) sets the same target shape for us:
raise beginner comprehensibility from ~40% (prompt-only) to ≥75% (re-ranked) on
a 100-utterance test set.

For v1 we ship a re-ranking pipeline (no future-discriminator — that requires
training a separate model and is out of scope per the research doc). The
re-ranker is **lexical-coverage-based**: every candidate's `utterance` is
scored against a curated per-CEFR-level pt-PT vocabulary, and the candidate
closest to the Learner's i+1 target wins.

## Decision

### 1. Pipeline shape

For each Learner turn in Conversational Practice (Tier 1 + Tier 2), the
orchestrator runs:

```
system prompt (CLT/TBLT/AF/CEFR-can-do/rubric/dialect)
   + learner utterance
        │
        ▼
   MiniMax LLM  ──►  { candidates: [VoiceLoopLLMPayload × 4] }
        │
        ▼
   for each candidate:
     parse → scoreUtterance(candidate.utterance, level, vocabByLevel)
     detectDialectDefects(candidate.utterance)
     drop if dialect-defective
        │
        ▼
   pick the candidate whose estimator score is closest to i+1 target
   tie-break by LLM's own difficulty_estimate proximity to target
        │
        ▼
   chosen turn → TTS + UI feedback overlay
```

Tier 3 (text fallback) still uses the single-payload `runTurn` from ADR-0002 —
the re-rank pipeline is reserved for paths with audio budget.

### 2. N = 4 candidates

N is configurable via `RerankDeps.candidateCount`; default is 4. Higher N
trades latency for tighter adherence to the target. The Voice Loop latency
budget (ADR-0002) allots 400 ms to "LLM (incl. re-rank)"; with N=4 the
re-ranker adds <5 ms of CPU work, so the LLM round-trip dominates.

### 3. Difficulty estimator

`src/lib/voice-loop/difficulty-estimator.ts` exposes:

- `tokenize(text)` — accent-safe, phrase-preserving tokenizer.
- `lexicalCoverage(text, vocab)` — fraction of tokens covered, with greedy
  longest-match (up to 5 tokens) against the vocabulary set. Returns 1 for
  empty input (vacuously covered).
- `tokenMissRate(text, vocab)` = 1 − coverage. The Token Miss Rate (TMR) is
  the primary signal per Jin et al. 2026.
- `scoreUtterance(text, level, vocabByLevel)` = `DIFFICULTY_MAX × TMR`,
  clamped to [0, 3]. Aligned numerically with the LLM's own
  `difficulty_estimate` field so the LLM and estimator are comparable.
- `detectDialectDefects(text)` — flags pt-BR-only tokens (`você`, `vocês`,
  `tá`, `tão`, `pra`, `pro`) with positions for UI highlighting.

The estimator is **pure-functional** with no I/O. Score and defect detection
are both O(n) over the utterance.

### 4. Level vocabulary fixture

`src/lib/voice-loop/level-vocabulary.ts` ships curated pt-PT word lists per
CEFR level. Vocabulary is **strictly monotonic**: every A0 word is also in
A1, A2, and B1. This is the contract that lets `scoreUtterance` work with a
single `vocabByLevel` map.

The fixture is intentionally small for v1 minimum-viable slice (A0 ~70 words,
A1 ~150, A2 ~200, B1 ~150 distinct additions). Issue #23 expands A0 seed
content; a follow-up issue (#40, filed with this ADR) will grow the B1 list
and add the A2.1/A2.2 sub-level distinctions CEFR recognises. Until then the
estimator's precision is bounded by the fixture size; the harness makes the
limitation explicit in its report.

### 5. System prompt

`src/lib/voice-loop/system-prompt.ts` produces the multi-section prompt that
instructs the LLM to emit `{candidates: [...]}`. Sections:

1. Persona + dialect lock (pt-PT, forbids pt-BR markers).
2. Learner's current CEFR level + can-do descriptor.
3. Pedagogical grounding (CLT, TBLT, Affective Filter, i+1, CEFR).
4. Feedback rubric (error type → correction → rule → example → encouragement).
5. Output schema with the N=4 envelope.
6. Per-candidate self-rating instructions (`difficulty_estimate` must reflect
   the candidate's own difficulty, not the LLM's average confidence).
7. Dialect enforcement — forbidden tokens listed by name.
8. Orthography hints (European spelling) + prosody hints (short, spoken-register
   sentences, one idea per utterance).

The prompt is regenerated per turn; there is no static template. The
candidateCount parameter (default 4) lets the caller tune the LLM call.

### 6. Re-ranker selection rule

```
chosen = argmin_c |scoreUtterance(c.utterance, level) - i+1_target|
tie-break:  argmin_c |c.llmDifficultyEstimate - i+1_target|
final tie:  first by original order (stable)
```

Candidates that fail parsing or contain pt-BR dialect defects are dropped
**before** selection. If no candidate survives, `generateAndRerankTurn`
throws — this is a sign of a deeper problem (LLM is broken, prompt is wrong,
or fixture is leaking pt-BR words). We never silently fall back to a
defective utterance.

### 7. A/B harness

`src/lib/voice-loop/ab-harness.ts` exposes `runAbHarness({corpus, vocabByLevel, mode})`.
The harness iterates the 100-utterance A0→A1 corpus (`ab-corpus.ts`),
runs both prompt-only and re-ranked modes per entry, scores both with the
estimator, and produces an `AbHarnessReport` summarising mean score and
in-band rate per mode plus the delta.

A separate `ab-mocks.ts` provides deterministic mock LLMs for `mode: "mock"`:

- `buildMockPromptOnlyLlm()` returns utterances with high TMR
  (Jin et al.'s "alignment drift" — vocabulary like *hodierno*, *transversalidade*,
  *outrossim*).
- `buildMockRerankLlm()` returns 4 candidates spanning low/mid/high TMR plus
  one pt-BR-marked candidate (which the re-ranker drops as a dialect defect).

Mock harnesses let CI catch re-ranker regressions without a live LLM key.
The harness markdown report (`tmp/difficulty-ab-report.md`) carries an
explicit "this run used a mock LLM" note so the pedagogy lead is never
misled about the source of the numbers.

`formatAbReport(report)` writes a markdown table with summary stats and one
row per learner input, including both prompt-only and re-ranked columns.

### 8. Live mode (deferred wiring)

`mode: "live"` is reserved for production runs with a real MiniMax LLM. The
`runAbHarness` contract takes the `llm` and `pronunciationFromAsr` deps
through `generateAndRerankTurn`, so a future wiring against the MiniMax LLM
client requires no harness changes. The harness is invoked by the pedagogy
lead's weekly QA workflow once the live LLM key is provisioned (follow-up
issue #40).

## Consequences

### Positive

- Implements the **modular difficulty control** mandated by FR-AI-4 and
  ADR-0001, grounding it in Jin et al. 2026.
- Dialect enforcement is a **hard filter** (candidates with pt-BR markers
  are dropped), not a soft preference — making pt-PT contamination a
  defect-class signal rather than a metric on the chosen utterance.
- Pure-functional estimator + monotonic vocabulary fixture → trivially
  testable, no I/O, no hidden state.
- The A/B harness runs in CI with mocks (regression-safe) **and** with the
  real LLM in production (issue #40 wires the live mode).
- The N=4 envelope is a single LLM call — no extra latency vs the existing
  single-payload `runTurn`. The re-rank step is <5 ms of CPU work.

### Negative

- The re-ranker adds a **strict pt-BR → reject** filter which can drop
  every candidate if the LLM consistently emits pt-BR. The system prompt
  mitigates this, but if the LLM misbehaves, the orchestrator throws rather
  than falling back to a defective utterance. Acceptable: the alternative
  (silent degradation) violates FR-AI-4's dialect constraint.
- N=4 increases prompt-token cost roughly linearly vs N=1; this is
  deliberate and bounded. The Voice Loop latency budget (ADR-0002) covers it.
- The fixture is small at v1; the estimator's precision improves as the
  vocabulary grows (issue #40 + future CEFR granularity work).
- The harness's mock mode does **not** validate the ≥75% acceptance
  criterion; that requires a live LLM run (issue #40). The mock exists for
  CI regression coverage and to demonstrate the mechanism, not to certify
  the SLO.

### Neutral

- The estimator is **lexical-coverage-only** for v1. A future-discriminator
  (Jin et al.'s stronger signal) requires training a separate model and is
  deferred to v1.1 per the research doc.
- The system prompt grows with each pedagogy refinement. It is intentionally
  a single function (`buildVoiceLoopSystemPrompt`) so unit tests can pin its
  shape and any new pedagogy term triggers a test update.
- We do not yet route the re-ranked turn through TTS in the orchestrator —
  the existing `runTurn` path is unchanged. Issue #41 (filed with this ADR)
  wires `generateAndRerankTurn` into the API route once a real LLM is
  provisioned. Until then, the harness is the integration point.

## Alternatives considered

- **Prompt-only control.** Rejected: Jin et al. 2026's evidence that prompt
  control drifts back to native-level; issue #6's acceptance criterion
  (≥75% in-band) is unlikely to be met without re-ranking.
- **Future-discriminator re-ranker.** Rejected for v1: requires a trained
  model; defer to v1.1.
- **LLM-self-estimated difficulty as the only signal.** Rejected: LLMs are
  poorly calibrated on this dimension (Jin et al. 2026); we use the LLM's
  `difficulty_estimate` only as a tie-breaker.
- **Fine-tune a small LM to score candidates.** Rejected for v1: dataset +
  training infra cost exceeds the lexical-coverage baseline's quality for
  v1 minimum-viable slice.
- **Larger candidate pool (N > 4).** Considered; deferred — diminishing
  returns + latency cost. Re-evaluate once the live LLM is wired (issue
  #40).
- **Per-Unit vocabulary overlay instead of per-Level.** Rejected for v1
  re-ranking: the i+1 target is per-Level (per ADR-0001), not per-Unit. A
  per-Unit biasing layer is a separate concern (#38 ASR LM biasing).

## References

- Jin, Dugan & Callison-Burch (2026). *Toward Beginner-Friendly LLMs for
  Language Learning*. arXiv:2506.04072.
- Krashen (1982). *Input Hypothesis*.
- Council of Europe. CEFR can-do descriptors.
- ADR-0001 (pedagogical model), ADR-0002 (voice loop), ADR-0003 (v1 scope).
- Issue #6: LLM difficulty control pipeline (generate → re-rank).
- Follow-up issues: #40 (re-rank orchestrator integration), #41 (expanded
  vocabulary fixture), #42 (live LLM wiring + harness acceptance).