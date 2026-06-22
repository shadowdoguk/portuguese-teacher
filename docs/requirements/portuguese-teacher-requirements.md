# Portuguese Teacher — Requirements Document

**Status:** Draft v1.0
**Author:** platform team
**Date:** 2026-06-22
**Repo:** `shadowdog-dev/portuguese-teacher`
**AI provider:** MiniMax AI Suite

---

## 1. Purpose & Scope

### 1.1 Purpose

`portuguese-teacher` is a web-based, AI-driven Portuguese language-learning
platform that guides Learners from absolute beginner proficiency (CEFR A0) to
conversational fluency (CEFR B1) through interactive lessons, real-time
conversational practice, and spaced-repetition review — all delivered by an
AI Teacher powered by the MiniMax AI suite.

### 1.2 Scope (in)

- Single-learner accounts, browser-delivered, responsive web app.
- Two dialects at launch: **Brazilian Portuguese (pt-BR)** and **European
  Portuguese (pt-PT)**.
- AI Teacher powered by MiniMax models: foundation LLM for NLU/NLG, ASR for
  speech-to-text, TTS for speech synthesis.
- Curriculum covering CEFR **A0 → B1**, with milestone assessments at each
  level boundary.
- Voice-based Conversational Practice with real-time pronunciation,
  grammar, and vocabulary feedback.
- Progress tracking, learner profile, and review queue.

### 1.3 Scope (out, v1)

- Native mobile apps (the responsive web app is the v1 mobile surface).
- Teacher / classroom dashboards (single-learner model).
- Live tutoring marketplace.
- Curriculum for C1 / C2 mastery.
- Indigenous or creole variants of Portuguese (focus on standard pt-BR and
  pt-PT for v1).
- Offline mode.

### 1.4 Definitions

See [`CONTEXT.md`](../../CONTEXT.md) for the full domain glossary. Key terms:
**Learner**, **AI Teacher**, **Lesson**, **Unit**, **Level**, **Milestone**,
**Proficiency Assessment**, **SRS**, **TBLT**, **Comprehensible Input**,
**Affective Filter**, **Conversational Practice**, **Voice Loop**, **Dialect**,
**i+1 Target**, **Pronunciation Score**, **Lesson Material Library**.

---

## 2. Research Foundation

The platform's pedagogical and architectural choices are grounded in the
research synthesis in
[`docs/research/language-acquisition-findings.md`](../research/language-acquisition-findings.md).
In summary, the platform blends four evidence-based methodologies:

| Methodology | Source | Role in platform |
| --- | --- | --- |
| Spaced Repetition (SRS) | Ebbinghaus 1885; Settles & Meeder 2016 | Vocabulary & grammar retention scheduler |
| Comprehensible Input (i+1) | Krashen 1982; Nguyen & Doan 2025 | Dynamic difficulty of teacher utterances and reading material |
| Task-Based Language Teaching (TBLT) | Ellis 2003; Harris & Leeming 2021 | Goal-oriented scenario tasks inside each Unit |
| AI Conversational Tutoring | Jin et al. 2026; Kamelabad et al. 2026 | Conversational Practice layer with corrective feedback |

Cross-cutting non-negotiables from the literature:

1. **Modular LLM difficulty control** is required — prompt-only control
   suffers "alignment drift" (Jin et al. 2026).
2. **Immediate corrective feedback** improves learner experience (Kamelabad
   et al. 2026).
3. **Pedagogical design** matters more than technological sophistication
   (Weisi & Rezghi 2025).
4. **Affective Filter** monitoring is required — engagement drop signals
   should reduce difficulty and increase encouragement (Krashen 1982).

---

## 3. Functional Requirements

### 3.1 Core AI Capabilities (FR-AI)

#### FR-AI-1. Speech recognition (ASR) for Portuguese

- The platform **shall** capture the Learner's speech in **Brazilian
  Portuguese (pt-BR)** or **European Portuguese (pt-PT)**, matching the
  Learner-selected dialect.
- The platform **shall** transcribe speech using the **MiniMax ASR** model.
- Final transcripts **shall** include word-level timestamps, confidence
  scores, and detected non-target-language switches.
- The platform **shall** bias recognition toward the Learner's current
  Unit's vocabulary and grammar to reduce WER on common patterns
  (language-model biasing).
- The platform **shall** support **browser Web Speech API** for live,
  interim transcription on Chromium browsers (Chrome, Edge, Opera, Brave)
  as a low-latency preview, and MiniMax ASR for the canonical transcript
  used for scoring.

#### FR-AI-2. Speech recognition (ASR) for English

- The platform **shall** also recognise English speech from the Learner for
  help-mode interactions (e.g. "How do I say 'good morning' in Portuguese?").
- English ASR **shall** use the same MiniMax ASR model with `lang=en`.
- The AI Teacher **shall** automatically detect mid-conversation code-switches
  to English and may respond in English (subject to level) before guiding the
  Learner back to Portuguese.

#### FR-AI-3. Natural Language Understanding (NLU)

- The platform **shall** parse the Learner's Portuguese utterance into a
  structured representation: intent, semantic slots, lexical items used,
  grammar features attempted (tense, gender, agreement), and detected error
  categories (phonology, morphology, syntax, lexicon).
- The NLU layer **shall** produce a per-utterance difficulty score against
  the Learner's current CEFR Level to drive the i+1 calibration loop.

#### FR-AI-4. Natural Language Generation (NLG)

- The platform **shall** generate teacher utterances (explanations,
  prompts, feedback, encouragement) using the **MiniMax LLM**.
- Every teacher utterance **shall** be produced through a **generate →
  re-rank** pipeline: the LLM emits *N* candidates, and a difficulty
  estimator selects the candidate closest to the Learner's i+1 target
  (per Jin et al. 2026).
- The teacher voice **shall** stay in the Learner's selected dialect
  (pt-BR vs pt-PT) — vocabulary, orthography, and prosody must match.
- The system prompt **shall** ground the LLM in: CLT, TBLT, the Affective
  Filter hypothesis, the CEFR can-do descriptors for the Learner's level,
  and a feedback rubric (error type → correction → rule → example →
  encouragement).
- The platform **shall** support an English fallback for explanations
  requested by the Learner or auto-triggered when the Learner's utterance
  is below A1.

#### FR-AI-5. Speech synthesis (TTS)

- The platform **shall** synthesise the AI Teacher's voice from generated
  text using the **MiniMax TTS** model.
- Dialect-matched voices **shall** be available for both pt-BR and pt-PT;
  voice selection is fixed per Learner at sign-up.
- The platform **shall** support adjustable playback speed (0.75×–1.25×)
  and a "slow then normal" repeat pattern for difficult utterances.

#### FR-AI-6. Pedagogical persona

- The AI Teacher **shall** embody a consistent persona: warm, encouraging,
  precise, and culturally aware. The persona is described in a system-prompt
  module and remains stable across sessions.
- The persona **shall** calibrate encouragement frequency based on the
  Affective Filter proxy: high-engagement learners get terse, efficient
  feedback; low-engagement or anxious learners get warmer, more
  encouraging feedback with extra scaffolding.

### 3.2 Learning Progression Framework (FR-LP)

#### FR-LP-1. CEFR-aligned ladder

The platform defines a six-stage ladder:

| Stage | CEFR | Description (can-do summary) |
| --- | --- | --- |
| A0 | pre-A1 | Recognises the alphabet, can say hello/goodbye, counts to 20. |
| A1 | A1 | Introduces self, asks/answers basic personal questions, handles routine interactions with rehearsed phrases. |
| A2 | A2 | Describes daily routine and immediate environment; handles simple transactions (shopping, directions). |
| A1→A2 | A1.5 | Bridges A1 to A2 with past-tense narration and connected sentences. |
| B1 | B1 | Expresses opinions on familiar topics, narrates experiences, deals with most travel situations. *(programme completion target)* |

Each stage contains 4–8 Units. Each Unit contains 3–8 Lessons plus at least
one TBLT scenario task. Total estimated curriculum: 30 Units, ~150 Lessons,
~250–300 hours of guided practice (vs. FSI's ~350–400h to B1).

#### FR-LP-2. Curriculum sequencing

- Units are arranged in a **directed acyclic graph** with linear default
  ordering; alternative paths exist for Learners who struggle with specific
  grammar topics.
- A Unit is **unlocked** when the prior Unit is at ≥80% mastery.
- The Lesson order within a Unit is **adaptive**: the SRS scheduler may
  inject review Lessons if a Learner's half-life on prior material falls
  below threshold.

#### FR-LP-3. Lesson types

The platform supports the following Lesson types:

1. **Alphabet & pronunciation** — TTS-driven listening + shadowing.
2. **Vocabulary introduction** — image + audio + example sentence, with
   SRS enrolment.
3. **Grammar explanation** — rule + 3–5 examples + a guided production
   exercise.
4. **Listening comprehension** — short audio at i+1 difficulty, 3–5
   comprehension questions.
5. **Reading comprehension** — short text at i+1 difficulty, 3–5
   questions.
6. **Pronunciation drill** — listen-and-repeat, with pronunciation
   scoring against the target phoneme.
7. **Fill-in / multiple-choice** — grammar or vocabulary in context.
8. **Free production** — Learner writes 2–5 sentences responding to a
   prompt; AI Teacher returns structured feedback.
9. **Scenario task (TBLT)** — goal-oriented dialogue (e.g. "order a meal at
   a Lisbon café and ask for the bill"); pre-task planning, during-task
   dialogue, post-task debrief.
10. **Conversational Practice** — free-form voice dialogue, see §3.3.

#### FR-LP-4. Spaced Repetition System

- Every vocabulary item and key grammar pattern the Learner encounters is
  enrolled in an **HLR-style scheduler** trained on per-item, per-Learner
  recall data.
- Review sessions surface **5–20** due items per session, capped to avoid
  fatigue.
- Multimedia retrieval: items are presented in **text + audio + image**
  combinations per learner preference (Zhang et al. 2021).
- Each recall **shall** be classified as one of: *Again* (re-enrol
  immediately), *Hard* (re-enrol with 0.5× half-life), *Good* (extend
  half-life ×2.5), *Easy* (extend half-life ×4).

#### FR-LP-5. Proficiency assessments at milestones

- The platform **shall** trigger a **Milestone Assessment** at each
  level-boundary (A0→A1, A1→A2, A1→A2→B1).
- A Milestone Assessment contains 15–25 items across the four skills
  (reading, listening, writing, speaking) at the target CEFR level.
- The Learner must score **≥ 75%** to unlock the next stage; otherwise the
  AI Teacher prescribes **remedial Units** drawn from the gap areas.
- The Learner may retake a failed Milestone after 24 hours. After three
  failures, the AI Teacher offers a human-tutor referral (out of scope for
  v1 product but trackable in the data model).

#### FR-LP-6. Adaptive pacing

- The AI Teacher **shall** adjust pace based on:
  - Rolling accuracy on recent exercises
  - SRS half-life decay on prior material
  - Affective Filter proxy (engagement, response latency, drop-off rate)
  - Self-reported confidence (optional weekly check-in)
- When the proxy indicates struggle, the AI Teacher **shall** automatically
  inject remedial Lessons, simplify upcoming content, and increase
  encouragement frequency.

### 3.3 Interactive Conversational Practice (FR-CP)

#### FR-CP-1. Voice Loop

The platform's Conversational Practice **shall** run an end-to-end **Voice
Loop** for each turn:

```
mic → MediaRecorder / Web Speech API → MiniMax ASR → MiniMax LLM
                                                       │
                              ┌────────────────────────┴─────┐
                              ▼                              ▼
                       teacher utterance                feedback overlay
                              │                              │
                              ▼                              ▼
                         MiniMax TTS                      UI render
                              │
                              ▼
                            speaker
```

End-to-end latency target: **< 1.5 seconds** from end-of-Learner-speech to
start-of-teacher-speech at p95.

#### FR-CP-2. Real-time feedback categories

The AI Teacher **shall** mark each Learner utterance on four dimensions:

| Dimension | What is checked | Scoring |
| --- | --- | --- |
| **Pronunciation** | Phoneme-level deviation from target | 0–100 Pronunciation Score |
| **Grammar** | Tense, gender/number agreement, word order | Correct / minor / major error, with category |
| **Vocabulary** | Lexical choice, register, dialect appropriateness | OK / suggestion / wrong-register |
| **Fluency** | Hesitations, false starts, silence gaps | 0–100 fluency metric |

#### FR-CP-3. Correction delivery

- Corrections are surfaced as a **non-blocking overlay** below the dialogue;
  the conversation continues without halting.
- By default, **immediate corrective feedback (ICF)** is delivered. The
  Learner may toggle **delayed CF** (feedback at end-of-conversation) in
  settings.
- Each correction follows the rubric: *error type → correction → brief rule
  → example → encouragement* (FR-AI-4).

#### FR-CP-4. Scenario library

- The platform **shall** ship with **≥ 30 scenario templates** spanning:
  - Greetings & introductions
  - Café / restaurant
  - Shopping & bargaining
  - Asking for directions
  - At the doctor's
  - At the bank / post office
  - Job interview
  - Travelling (airport, taxi, hotel)
  - Social plans with friends
  - Cultural norms in Brazil and Portugal
- Each scenario specifies: target CEFR level, target vocabulary/grammar,
  expected dialogue depth, success criteria.

#### FR-CP-5. Conversation difficulty control

- The AI Teacher **shall** track an **i+1 target** per Learner (per FR-AI-4).
- During a conversation, the AI Teacher **shall** detect comprehension
  failures (Learner says "what?" or equivalent, or response is off-topic)
  and **drop difficulty** by 1 CEFR sub-level. After three consecutive
  successful exchanges, **raise difficulty** by 0.5 sub-level.

#### FR-CP-6. Free-form vs. structured modes

- **Free-form mode**: Learner picks any topic; AI Teacher adapts.
- **Scenario mode**: AI Teacher follows a scripted scenario scaffold
  (TBLT); Learner must complete the goal to score "pass".
- **Drill mode**: AI Teacher asks the Learner to repeat specific phrases
  for pronunciation practice.

### 3.4 Web Platform Requirements (FR-WEB)

#### FR-WEB-1. Responsive UI

- The platform **shall** be fully responsive across desktop (≥ 1024px wide),
  tablet (768–1023px), and mobile (≤ 767px) viewports.
- Layout **shall** use CSS Grid + Flexbox; no horizontal scroll at any
  breakpoint.
- Touch targets **shall** be ≥ 44×44 px on mobile.

#### FR-WEB-2. Browser support matrix

| Browser | Minimum version | Tier | Behaviour |
| --- | --- | --- | --- |
| Chrome | 110+ | 1 (full) | All features, live Web Speech API |
| Edge | 110+ | 1 (full) | All features, live Web Speech API |
| Opera | 96+ | 1 (full) | All features, live Web Speech API |
| Brave | 1.50+ | 1 (full) | All features, live Web Speech API |
| Safari | 16+ (macOS 13+) | 2 (degraded) | Batched ASR via MediaRecorder → MiniMax ASR |
| Safari iOS | 16.4+ | 2 (degraded) | Same as macOS Safari |
| Firefox | any current | 3 (fallback) | Text-only practice mode; banner suggests Chrome/Edge |

#### FR-WEB-3. Audio capture & playback

- Microphone capture via `navigator.mediaDevices.getUserMedia({ audio: true })`
  with explicit permission flow.
- Capture **shall** be 16 kHz mono PCM or Opus/WebM at the browser's default
  container.
- TTS playback via the MiniMax TTS client SDK; HTML5 `<audio>` for fallback.
- The platform **shall** request **HTTPS** for all audio paths; `localhost`
  is permitted for development.

#### FR-WEB-4. User interface surfaces

The platform **shall** provide the following UI surfaces:

1. **Sign-up / log-in** — email + password (or OAuth: Google, Apple).
2. **Learner profile** — name, native language (default English), dialect
   (pt-BR / pt-PT), proficiency self-assessment.
3. **Dashboard** — current Unit, streak, weekly goal, recommended next
   action, recent mistakes.
4. **Lesson player** — Lesson content + exercises + SRS review.
5. **Conversational Practice** — full-screen voice loop with feedback
   overlay.
6. **Vocabulary / SRS review queue** — daily review list.
7. **Progress & milestones** — per-skill mastery, assessment history.
8. **Settings** — voice speed, CF timing toggle, accessibility, data
   export, account deletion.

#### FR-WEB-5. Accessibility (WCAG 2.2 AA)

- All interactive elements keyboard-accessible; visible focus rings.
- Colour contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text.
- Captions for all TTS-rendered audio.
- Screen-reader labels on all icon-only buttons.
- Respects `prefers-reduced-motion`.
- Audio input **shall** be substitutable by text input throughout.

#### FR-WEB-6. Internationalisation-ready

- All UI strings externalised to a translation catalogue (English at launch;
  pt-BR / pt-PT UI translations deferred to v1.1).
- Dates/numbers/currency rendered via `Intl` APIs.

### 3.5 User Data & Privacy (FR-DATA)

#### FR-DATA-1. Account data

- The platform **shall** store: email, hashed password, dialect choice,
  Lesson history, mastery state, assessment results, Affective Filter
  proxy values, aggregate engagement metrics.

#### FR-DATA-2. Voice recordings

- Voice recordings are **opt-in**: default is **do not store**; if the
  Learner enables storage, recordings are encrypted at rest and retained
  for 30 days unless the Learner extends or deletes sooner.
- The Learner **shall** be able to delete all stored recordings from
  Settings at any time.

#### FR-DATA-3. Compliance

- The platform **shall** comply with **GDPR** (EU) and **LGPD** (Brazil)
  for user data.
- A privacy notice **shall** be presented at sign-up and accessible from
  Settings at all times.
- The platform **shall** support **right to access** (export JSON of all
  Learner data) and **right to erasure** (full account deletion) within
  30 days.

---

## 4. Non-Functional Requirements (NFR)

### NFR-1. Speech recognition accuracy

- ≥ **95% word accuracy** on common Portuguese and English speech patterns
  in clean audio (SNR ≥ 20 dB), measured on a held-out test set of 500
  utterances per dialect.
- ≥ **90%** word accuracy in moderate-noise audio (SNR 10–20 dB).
- WER **target**: ≤ 5% on pt-BR and pt-PT clean-audio benchmarks
  (parity with top-tier server-side ASR per ElevenLabs Scribe 2.3% WER on
  FLEURS, Whisper 4.1%, Gemini 3.3%).

### NFR-2. Platform load time

- First Contentful Paint (FCP) ≤ **1.5 seconds** on a 4G connection.
- Time to Interactive (TTI) ≤ **2.0 seconds** on 4G.
- Largest Contentful Paint (LCP) ≤ **2.0 seconds**.
- Cumulative Layout Shift (CLS) ≤ 0.1.
- Performance budgets enforced via Lighthouse CI in CI.

### NFR-3. Uptime & availability

- Platform availability ≥ **95%** monthly, measured from the
  user-perceived availability (successful response within 5s).
- API uptime ≥ 99.5% for MiniMax-dependent endpoints (with graceful
  degradation — see NFR-6).
- Status page published; incidents post-mortems within 5 business days.

### NFR-4. Scalability

- Support ≥ **10,000 concurrent Learners** at GA, with linear cost growth.
- Voice loop infrastructure must horizontally scale; no single point of
  failure for ASR or TTS paths.

### NFR-5. Security

- All traffic over HTTPS / TLS 1.3.
- Authentication via JWT with short TTL; refresh tokens rotated.
- Voice recordings encrypted at rest (AES-256).
- All user inputs sanitised; no raw user content written to logs.
- Annual third-party penetration test (target v1.1).

### NFR-6. Graceful degradation

- If MiniMax ASR is unreachable, fall back to Web Speech API
  (Chromium) or text-only input (Safari, Firefox).
- If MiniMax LLM is unreachable, fall back to a rule-based tutor with
  canned feedback.
- If MiniMax TTS is unreachable, render teacher utterances as text only.
- All degradations **shall** be visible to the Learner via a status
  indicator and **shall not** silently break a session.

### NFR-7. Data retention

- Account data: retained while account is active + 30 days post-deletion
  grace period; thereafter deleted within 30 days.
- Anonymised, aggregated engagement metrics may be retained indefinitely.

### NFR-8. Observability

- Structured logs for all server-side events; user-content logs disabled
  by default.
- Distributed tracing across the Voice Loop.
- Real-time dashboards for ASR latency, LLM latency, TTS latency, error
  rates, and Milestone Assessment pass rates.

---

## 5. Success Criteria

### SC-1. Learner proficiency outcome

- **≥ 90%** of Learners who complete the full A0→B1 curriculum **shall**
  demonstrate conversational Portuguese proficiency at **CEFR B1** as
  measured by an independent CEFR-aligned speaking assessment.
- *Measurement:* post-curriculum assessment administered to a sample of
  completers every quarter; rolling 12-month average must hit 90%.

### SC-2. Platform uptime

- ≥ **95%** monthly availability measured from the user-perceived
  availability metric defined in NFR-3.
- *Measurement:* continuous monitoring via synthetic probes from at
  least three geographic regions.

### SC-3. User satisfaction

- Average post-lesson rating ≥ **4.3 / 5.0** on a 5-point Likert item
  ("How effective was this lesson?").
- Net Promoter Score (NPS) ≥ **+30** measured monthly via in-app survey.
- ≤ **5%** of Learners who start a Unit fail to complete it (drop-off
  rate).

### SC-4. Pedagogical effectiveness signals

- Average **Pronunciation Score** trajectory: ≥ +10 points per Unit over
  the first 10 Units (improvement curve).
- **SRS retention rate** (proportion of items recalled at 30-day
  follow-up): ≥ 70% across enrolled vocabulary.
- **Milestone Assessment pass rate on first attempt** ≥ 60%; pass rate
  after at most two attempts ≥ 85%.

### SC-5. Speech recognition accuracy in production

- Production WER ≤ **5%** on a randomly sampled 1% of utterances, measured
  weekly by re-transcribing user audio through a held-out reference
  pipeline.

---

## 6. Testing Protocols

### 6.1 Test levels

| Level | Tooling | Cadence | Owner |
| --- | --- | --- | --- |
| Unit tests | Vitest / Jest | per commit | dev |
| Integration tests | Playwright | per PR | dev + QA |
| End-to-end voice loop | Playwright + audio fixtures | nightly | QA |
| ASR accuracy regression | held-out test set | per model upgrade | ML eng |
| LLM pedagogical review | human expert rubric | per prompt change | pedagogy lead |
| Performance (load) | k6 | per release | platform eng |
| Accessibility | axe + manual screen-reader | per release | accessibility lead |
| Penetration | external vendor | annual | security |

### 6.2 Speech recognition accuracy test (NFR-1)

- **Corpus**: 500 clean (SNR ≥ 20 dB) + 500 noisy (SNR 10–20 dB)
  utterances per dialect (pt-BR, pt-PT), balanced across phonemes,
  sentence lengths, and speaker demographics.
- **Speakers**: ≥ 50 speakers per dialect, balanced for gender and age.
- **Metric**: Word Error Rate (WER); pass criterion ≤ 5% clean, ≤ 10%
  noisy.
- **Procedure**: run on every MiniMax ASR model upgrade and monthly
  thereafter; results tracked in a model-evaluation dashboard.

### 6.3 Curriculum progression logic test

- **Unit test**: deterministic walkthrough of a synthetic Learner who
  scores 100% on every exercise → must reach Milestone in expected order
  without bypassing gating.
- **Unit test**: synthetic Learner who fails a Milestone → must be routed
  to a remedial Unit before re-attempt.
- **Property test**: any Lesson reachable from A0 must be reachable in
  ≤ N steps via the curriculum graph (no orphan nodes).
- **Manual review**: pedagogy lead audits 5 sampled Lessons per release
  for sequencing correctness.

### 6.4 Cross-device compatibility test

- **Device matrix**:
  - Desktop: Chrome on Windows, Chrome on macOS, Edge on Windows,
    Safari on macOS, Firefox on Linux.
  - Tablet: Safari on iPad, Chrome on Android tablet.
  - Mobile: Safari on iPhone 14+, Chrome on Android 13+.
- **Procedure**: per release, run a smoke suite (sign-up → first
  Lesson → first Conversational Practice → Milestone Assessment) on
  every device in the matrix.
- **Pass criterion**: 100% of smoke flows complete without manual
  intervention.

### 6.5 Learner outcome test (SC-1)

- **Procedure**: every quarter, recruit a sample of ≥ 50 Learners who
  have completed the curriculum and administer an independent CEFR B1
  speaking assessment (CAPLE or CELPE-Bras depending on dialect).
- **Pass criterion**: ≥ 90% score at or above B1.
- **Cadence**: quarterly, with rolling 12-month average reported in the
  product analytics dashboard.

### 6.6 Uptime test (SC-2)

- **Synthetic probes** from at least three regions (Americas, Europe,
  Asia-Pacific) hitting the sign-up, Lesson load, and Conversational
  Practice endpoints every 60 seconds.
- **Pass criterion**: ≥ 95% successful probes per calendar month,
  excluding announced maintenance windows.

### 6.7 User feedback test (SC-3)

- Post-lesson 5-point rating collected automatically.
- NPS survey triggered at 30-day and 90-day milestones.
- Drop-off funnel analysed per Unit; Units exceeding 5% drop-off
  flagged for pedagogy review.

### 6.8 Non-functional regression tests

- **Performance**: Lighthouse CI in CI; LCP regression > 10% blocks
  merge.
- **Accessibility**: axe-core in CI; any WCAG 2.2 AA violation blocks
  merge.
- **Security**: SAST (e.g. Semgrep) and dependency audit on every PR.

---

## 7. Constraints & Assumptions

### 7.1 Constraints

- AI services are **MiniMax-only** for v1; no multi-provider abstraction.
- v1 web-only — no native iOS/Android apps.
- Single-learner accounts; no classroom / teacher dashboards.
- pt-BR and pt-PT dialects; no African or Asian variants of Portuguese in
  v1.

### 7.2 Assumptions

- Learners have a modern browser (Chrome 110+, Safari 16+, Edge 110+) and
  a working microphone.
- Learners have ≥ 5 Mbps internet for Conversational Practice.
- The MiniMax AI suite is available with at least 99.5% monthly uptime
  and supports the languages listed in FR-AI-1 / FR-AI-2.
- The platform is operated from a single initial region (Brazil for
  pt-BR, EU for pt-PT) with global CDN distribution for static assets.

### 7.3 Out-of-scope explicit list (v1)

- Native mobile apps.
- Offline mode.
- Multi-Learner cohorts / teacher dashboards.
- C1 / C2 curriculum content.
- Indigenous or creole Portuguese variants.
- Live human tutoring marketplace integration.
- Marketplace of third-party lesson content.

---

## 8. Traceability

| Requirement | Research source | Design source |
| --- | --- | --- |
| FR-AI-1 / NFR-1 (ASR ≥ 95%) | ElevenLabs Scribe 2.3% WER; Whisper 4.1% | ADR-0002 |
| FR-AI-4 (modular difficulty control) | Jin et al. 2026 | ADR-0001 |
| FR-AI-4 (immediate CF) | Kamelabad et al. 2026 | ADR-0001 |
| FR-LP-1 (CEFR B1 target) | Loci 2026; FSI; CEFR | ADR-0001 |
| FR-LP-4 (HLR scheduler) | Settles & Meeder 2016 | ADR-0001 |
| FR-LP-5 (Milestone Assessments) | Harris & Leeming 2021 | ADR-0001 |
| FR-LP-6 (Affective Filter monitoring) | Krashen 1982; Nguyen & Doan 2025 | ADR-0001 |
| FR-CP-1 (Voice Loop latency < 1.5s) | TBLT literature; Kamelabad et al. 2026 | ADR-0002 |
| FR-CP-3 (ICF default) | Kamelabad et al. 2026 | ADR-0001 |
| FR-WEB-2 (browser matrix) | AssemblyAI 2025; VoiceToTextOnline 2025 | ADR-0002 |

---

## 9. Open Questions

The following require decisions before kickoff:

1. **Voice cloning / celebrity personas** for the AI Teacher — out of
   scope for v1; revisit in v1.1.
2. **Native mobile apps** — feasibility study after v1 GA.
3. **C1/C2 curriculum** — content team staffing plan.
4. **Pricing & subscription model** — owned by product, not engineering.
5. **Human handoff** — design of the referral flow when AI Teacher
   cannot make progress.

---

## 10. Sign-off

| Role | Name | Date |
| --- | --- | --- |
| Product owner | TBD | |
| Engineering lead | TBD | |
| Pedagogy lead | TBD | |
| Design lead | TBD | |
| QA lead | TBD | |
| Security | TBD | |

---

*This document is the source of truth for v1 functional and non-functional
requirements. Changes require an ADR and an updated traceability matrix.*