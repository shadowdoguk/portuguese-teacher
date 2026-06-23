# ADR 0001 — Pedagogical Model

**Status:** Accepted (amended by ADR-0003)
**Date:** 2026-06-22 (amended 2026-06-23)
**Deciders:** Product, Pedagogy lead, Engineering lead
**Related:** [`CONTEXT.md`](../../CONTEXT.md), [`docs/research/language-acquisition-findings.md`](../research/language-acquisition-findings.md), [`docs/requirements/portuguese-teacher-requirements.md`](../requirements/portuguese-teacher-requirements.md), [`ADR-0003`](0003-v1-scope-amendment.md)

## Context

The platform needs a single pedagogical model that the AI Teacher, the SRS
scheduler, and the curriculum graph all conform to. Multiple methodologies are
viable: pure comprehensible input (Krashen), explicit grammar instruction,
TBLT, pure conversation, and SRS-driven vocabulary drilling. Each is supported
by evidence; none is sufficient on its own.

The 2026 research synthesis
([`docs/research/language-acquisition-findings.md`](../research/language-acquisition-findings.md))
shows:

- Pure CI without interaction/feedback is insufficient (Nguyen & Doan 2025).
- Pure drill without communicative tasks underprepares Learners for real use
  (Harris & Leeming 2021).
- LLM tutors need **modular difficulty control** beyond prompt engineering
  (Jin et al. 2026).
- Immediate corrective feedback (ICF) improves user experience vs. delayed CF
  (Kamelabad et al. 2026).

The product target is "conversational fluency", which the requirements doc
maps to **CEFR B1**. Learners come from absolute beginner (A0). The platform
is AI-only — no human tutor fallback in v1.

## Decision

The platform will implement a **hybrid pedagogical model** combining four
methodologies, each owning a distinct layer:

1. **Spaced Repetition (SRS)** — owns the **retention** layer.
   Half-Life Regression scheduler (Settles & Meeder 2016) surfaces
   vocabulary and grammar items at per-Learner, per-item optimal intervals.

2. **Comprehensible Input (i+1)** — owns the **exposure** layer.
   Reading passages, listening material, and AI Teacher utterances are
   difficulty-controlled to the Learner's dynamic i+1 target. Below 70%
   comprehension or above 90% comprehension for two consecutive units, the
   target shifts by one CEFR sub-level.

3. **Task-Based Language Teaching (TBLT)** — owns the **production** layer.
   Every Unit contains at least one goal-oriented scenario task with
   pre-task planning, during-task execution, and post-task debrief.

4. **AI Conversational Tutoring** — owns the **dialogue** layer.
   MiniMax LLM, re-ranked for difficulty, delivers feedback using the rubric
   *error type → correction → rule → example → encouragement* (FR-AI-4).

Cross-cutting principles:

- **Immediate corrective feedback** by default; toggle for delayed CF.
- **Affective Filter monitoring**: the platform tracks an engagement proxy
  (response latency, drop-off, repeat-cancellation) and adapts the AI
  Teacher's warmth and difficulty in response.
- **CEFR-aligned ladder** with Milestone Assessments at each level
  boundary; ≥ 75% to advance.
- **Dialect-locked** (per ADR-0003): pt-PT only in v1; the dialect is
  fixed at sign-up and propagated throughout. pt-BR is deferred to v1.1.

## Consequences

### Positive

- Evidence-based: every layer traces to peer-reviewed work, surfaced in
  [`docs/research/language-acquisition-findings.md`](../research/language-acquisition-findings.md).
- Layered: each methodology has a clear owner, reducing pedagogical
  ambiguity for content authors.
- The generate-then-re-rank pipeline makes LLM output controllable even
  for absolute beginners (Jin et al. 2026).
- ICF default improves user experience without sacrificing learning gains
  (Kamelabad et al. 2026).

### Negative

- Higher content production cost: every Unit must produce at least one
  scenario task plus SRS items plus i+1-graded exposure material.
- The difficulty-control pipeline adds latency (~100–300 ms) on top of
  base LLM latency. Voice Loop latency budget must accommodate this.
- Maintaining two dialect tracks doubles Lesson Material Library
  production cost. **Superseded by ADR-0003**: v1 ships pt-PT only,
  halving content production cost; pt-BR cost deferred to v1.1.
- Pedagogical claims about efficacy must be validated empirically
  (SC-1); first measurement at end of cohort 1.

### Neutral

- The SRS scheduler will be re-trainable per-Learner, but the initial
  launch uses a static HLR model with online updates deferred to v1.1.
- The Affective Filter proxy is an internal signal, not a feature
  exposed to Learners in v1.

## Alternatives considered

- **Pure CLT / immersion.** Rejected: insufficient for absolute beginners
  without scaffolding, and no retention layer.
- **Grammar-translation pedagogy.** Rejected: weak evidence for
  conversational outcomes (Ellis 2003; Harris & Leeming 2021).
- **Pure LLM chat without a curriculum.** Rejected: research shows that
  without pedagogical structure, LLM tutors drift toward native-level
  output (Jin et al. 2026) and produce shallow engagement (Weisi & Rezghi
  2025).
- **Duolingo-style skill tree only, no dialogue.** Rejected: would not
  meet the conversational-fluency target at B1.

## References

- Settles & Meeder (2016). HLR. ACL.
- Krashen (1982). Input Hypothesis.
- Nguyen & Doan (2025). Neuro-ecological critique. *Frontiers in
  Psychology*.
- Ellis (2003). TBLT.
- Harris & Leeming (2021). TBLT vs PPP longitudinal.
- Jin, Dugan & Callison-Burch (2026). Beginner-friendly LLMs. arXiv.
- Kamelabad et al. (2026). LLM chatbot ICF vs DCF. *Frontiers in
  Education*.
- Council of Europe. CEFR.