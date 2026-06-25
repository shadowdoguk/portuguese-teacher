# Portuguese Teacher — Domain Context

This document defines the domain vocabulary and key concepts for the
`portuguese-teacher` platform. Skills and contributors should use these terms
consistently and avoid inventing synonyms.

## Project in one sentence

A web-based, AI-driven Portuguese language teacher that takes a learner from
absolute beginner (CEFR A0) to conversational fluency (CEFR B1), powered by the
MiniMax AI suite.

## Glossary

| Term | Definition |
| --- | --- |
| **Learner** | The end user studying Portuguese. The platform serves one learner per account. |
| **Lead** | A person who has expressed interest in the platform by submitting the public contact form (email + marketing consent) but has not yet created a Learner account. A Lead is converted to a Learner on sign-up. *(Reserved term — no v1 surface; contact-form capture is deferred to v1.1.)* |
| **AI Teacher** | The pedagogical agent that explains, prompts, corrects, and converses with the Learner. Backed by MiniMax models (LLM, ASR, TTS). |
| **MiniMax AI Suite** | The suite of MiniMax models used by the platform: foundation LLM for NLU/NLG, speech-to-text (ASR) for capture, and text-to-speech (TTS) for playback. |
| **Lesson** | A single instructional unit (typically 5–15 min) covering a discrete objective (e.g. "greetings", "present-tense *ser*"). A Lesson is composed of a *Lesson body* (content delivery) plus one or more Practice Exercises. |
| **Practice Exercise** | A short interactive activity (flashcard, fill-in, listen-and-repeat, role-play, free-response, pronunciation drill, scenario turn) that targets a specific skill or item. Practice Exercises are the interactive components of a Lesson and the units of SRS scheduling. |
| **Unit** | A thematic cluster of 3–8 Lessons (e.g. "At the café"). |
| **Level** | A CEFR-aligned proficiency stage in the v1 ladder: A0 (absolute beginner), A1, A2, B1. v1 ceiling is B1; B2 is out of scope. |
| **Curriculum** | The ordered graph of Units mapped to Levels that the platform walks the Learner through. The graph is a DAG over the canonical sequence; remediation is via Remedial Anchors, not back-edges. |
| **Milestone** | A checkpoint within the Curriculum that gates progression and triggers a proficiency assessment. v1 has three Milestones at the A0→A1, A1→A2, and A2→B1 boundaries. |
| **Proficiency Assessment** | A short adaptive evaluation (multiple formats) that confirms readiness to advance to the next Level. |
| **Placement Lesson** | A single adaptive Lesson administered at sign-up when the Learner self-assesses above A0. Confirms or revises the Learner's starting Unit. |
| **Remedial Anchor** | A pointer from a Unit to a prior Unit whose content the AI Teacher can re-present with scaffolding when the Learner struggles. Anchors make remediation possible without back-edges in the curriculum DAG. |
| **Assessment Item** | A single adaptive question/prompt presented to the Learner during a Proficiency Assessment. Skill ∈ {listening, reading, writing, speaking}; one of 15–25 per Milestone. |
| **Proficiency Assessment Attempt** | The persisted record of one Proficiency Assessment run: `id`, `learnerId`, `boundary`, `attemptedAt`, `score`, `passed`, `recommendedAnchorUnitIds`, `perSkillScores`, optional `notes`. |
| **Tutor Referral** | The persisted record of a human-tutor referral triggered by three failed Proficiency Assessment Attempts at the same boundary after Remedial Anchor exhaustion: `id`, `learnerId`, `boundary`, `triggeredAt`, `attemptCount`, `reason`. v1 ships the data row and a placeholder UI; the marketplace integration is out of scope per the requirements §9 open-questions list. |
| **SRS (Spaced Repetition System)** | Half-life regression scheduler that surfaces vocabulary and grammar items at optimal review intervals. The SRS injects Practice Exercises, not full Lessons, into the active Unit. |
| **TBLT (Task-Based Language Teaching)** | Pedagogical pattern in which the Learner completes a goal-oriented communicative task in Portuguese. |
| **Comprehensible Input (CI)** | Krashen's i+1 principle: input slightly above the Learner's current level, ~70–90% comprehensible. |
| **Affective Filter** | Krashen's construct: anxiety/engagement modulates how much input the Learner actually acquires. |
| **Conversational Practice** | A free-form voice dialogue between the AI Teacher and the Learner, with real-time feedback. |
| **Voice Loop** | The end-to-end pipeline: microphone → ASR → LLM (NLU + NLG, structured output) → TTS → speaker, with corrections rendered as UI overlays. |
| **Dialect** | The Learner's selected Portuguese variant. **v1 supports pt-PT (European Portuguese) only.** Dialect is fixed at sign-up and propagated through all AI Teacher output, vocabulary, and audio. pt-BR is deferred to v1.1. |
| **i+1 Target** | A user-specific, dynamic target difficulty for LLM-generated teacher utterances and comprehension passages. |
| **Lesson Material** | Any structured artifact presented to the Learner: text, audio, image, dialogue prompt, exercise, or assessment. |
| **Feedback** | Output from the AI Teacher addressing a Learner utterance — corrective (errors), confirmatory (correct), or formative (suggestion). |
| **Pronunciation Score** | A per-utterance metric (0–100) measuring phoneme-level deviation from the target. v1 derives it from ASR word-level confidence plus a MiniMax phoneme-distance score. |
| **Lesson Material Library** | The curated corpus of Lessons, Units, vocabulary, dialogues, and audio assets that the Curriculum draws from. |
| **User Data** | Profile, lesson history, mastery state, voice recordings, and assessment results associated with a Learner account. |
| **SC-5 Sampling Buffer** | An ephemeral audio buffer (≤ 24 h retention, separate from opt-in "stored recordings") used solely to compute SC-5 production-WER on a 1% sample of utterances. |
| **Stored Recording** | A voice recording the Learner has explicitly opted in to retain. Encrypted at rest, deletable from Settings, default off. |
| **Settings** | Per-Learner preferences that shape how the AI teacher speaks and how the platform behaves: `voiceSpeed` (0.75–1.25×), `cfTiming` (immediate vs end-of-conversation), `captions` (on/off), `reducedMotion` (auto/reduce/no-preference), `textOnlyMode` (bool), `voiceRecordingOptIn` (bool), `confidenceCheckinOptIn` (bool), `weeklyGoalMinutes` (50–300). Persisted to localStorage keyed by Learner ID. |
| **Weekly Goal** | The Learner's self-selected weekly practice minutes (range 50–300, default 105), shown as a progress bar on the dashboard. |
| **Voice-Recording Opt-In** | Per-Learner toggle (default off) to retain voice recordings for personal review, encrypted at rest. **Independent from the SC-5 Sampling Buffer** — opt-in retention never runs without explicit consent; SC-5 sampling is always on (1% sample, ephemeral). |
| **Confidence Check-In Opt-In** | Per-Learner toggle (default off) for a 1–5 self-reported confidence rating fed into the Affective Filter proxy (per #18). Never surfaced on the dashboard. |
| **Account Deletion Request** | Explicit Learner-initiated request recorded in localStorage with a 30-day completion window (FR-DATA-3). The placeholder UI ships in v1; the marketplace / human-tutor integration is out of scope per requirements §9. |

## Key concepts

### Pedagogical model

The platform blends four evidence-based methodologies — see
[`docs/research/language-acquisition-findings.md`](docs/research/language-acquisition-findings.md)
for the full literature review:

1. **SRS** for vocabulary and grammar retention (Ebbinghaus; Settles & Meeder 2016).
2. **Comprehensible Input (i+1)** for reading and listening exposure (Krashen 1982; modernised by Nguyen & Doan 2025).
3. **TBLT** for goal-oriented speaking and writing practice (Ellis 2003; Harris & Leeming 2021).
4. **Conversational immersion with corrective feedback** via an LLM tutor (Jin et al. 2026; Kamelabad et al. 2026).

### Proficiency ladder

Curriculum progression follows CEFR can-do statements across **five stages**:
**A0 → A1 → A2 → B1**. B1 is the v1 ceiling. Each Level transition is gated
by a Milestone Assessment at the 75% threshold; failed Milestones route the
Learner to Remedial Anchors before re-attempt. Total curriculum ≈ 30 Units,
≈ 150 Lessons, ≈ 250–300 hours of guided practice.

### Voice architecture

Every conversational interaction runs through the **Voice Loop**. NLU (intent,
slots, grammar features, error categories) and NLG (teacher utterance) are
produced in a **single LLM call with structured output** — see
[`docs/adr/0002-voice-loop-architecture.md`](docs/adr/0002-voice-loop-architecture.md).

### Variants

**v1 supports pt-PT (European Portuguese) only.** All Lessons, audio, the AI
Teacher's voice, vocabulary, and orthography are pt-PT-locked. Cross-dialect
contamination is a defect. pt-BR is deferred to v1.1.

## Conventions for contributors

- Use the glossary terms above when writing issues, ADRs, or code identifiers.
- When introducing a new domain term, add it to this glossary in the same change.
- Don't invent synonyms for existing terms (e.g. don't call a "Lesson" an
  "exercise" or "module").
- Pedagogical claims must cite the research document; product claims must cite
  the requirements document.
