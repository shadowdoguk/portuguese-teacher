# Portuguese Teacher — Domain Context

This document defines the domain vocabulary and key concepts for the
`portuguese-teacher` platform. Skills and contributors should use these terms
consistently and avoid inventing synonyms.

## Project in one sentence

A web-based, AI-driven Portuguese language teacher that takes a learner from
absolute beginner (A0) to conversational fluency (CEFR B1–B2), powered by the
MiniMax AI suite.

## Glossary

| Term | Definition |
| --- | --- |
| **Learner** | The end user studying Portuguese. The platform serves one learner per account. |
| **AI Teacher** | The pedagogical agent that explains, prompts, corrects, and converses with the Learner. Backed by MiniMax models (LLM, ASR, TTS). |
| **MiniMax AI Suite** | The suite of MiniMax models used by the platform: foundation LLM for NLU/NLG, speech-to-text (ASR) for capture, and text-to-speech (TTS) for playback. |
| **Lesson** | A single instructional unit (typically 5–15 min) covering a discrete objective (e.g. "greetings", "present-tense *ser*"). |
| **Unit** | A thematic cluster of 3–8 Lessons (e.g. "At the café"). |
| **Level** | A CEFR-aligned proficiency stage: A0 (absolute beginner), A1, A2, B1, B2. |
| **Curriculum** | The ordered graph of Units mapped to Levels that the platform walks the Learner through. |
| **Milestone** | A checkpoint within the Curriculum that gates progression and triggers a proficiency assessment. |
| **Proficiency Assessment** | A short adaptive evaluation (multiple formats) that confirms readiness to advance to the next Level. |
| **SRS (Spaced Repetition System)** | Half-life regression scheduler that surfaces vocabulary and grammar items at optimal review intervals. |
| **TBLT (Task-Based Language Teaching)** | Pedagogical pattern in which the Learner completes a goal-oriented communicative task in Portuguese. |
| **Comprehensible Input (CI)** | Krashen's i+1 principle: input slightly above the Learner's current level, ~70–90% comprehensible. |
| **Affective Filter** | Krashen's construct: anxiety/engagement modulates how much input the Learner actually acquires. |
| **Conversational Practice** | A free-form voice dialogue between the AI Teacher and the Learner, with real-time feedback. |
| **Voice Loop** | The end-to-end pipeline: microphone → ASR → NLU/LLM → TTS → speaker, with corrections rendered as UI overlays. |
| **Dialect** | Either Brazilian Portuguese (pt-BR) or European Portuguese (pt-PT). The Learner picks one at sign-up; the AI Teacher stays consistent. |
| **i+1 Target** | A user-specific, dynamic target difficulty for LLM-generated teacher utterances and comprehension passages. |
| **Lesson Material** | Any structured artifact presented to the Learner: text, audio, image, dialogue prompt, exercise, or assessment. |
| **Practice Exercise** | A short interactive activity (flashcard, fill-in, listen-and-repeat, role-play, free-response) that targets a specific skill or item. |
| **Feedback** | Output from the AI Teacher addressing a Learner utterance — corrective (errors), confirmatory (correct), or formative (suggestion). |
| **Pronunciation Score** | A per-utterance metric (0–100) produced by an ASR + phoneme-distance pipeline. |
| **Lesson Material Library** | The curated corpus of Lessons, Units, vocabulary, dialogues, and audio assets that the Curriculum draws from. |
| **User Data** | Profile, lesson history, mastery state, voice recordings, and assessment results associated with a Learner account. |

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

Curriculum progression follows CEFR can-do statements. "Conversational fluency"
as the success criterion maps to **CEFR B1** (Independent User) — see
[`docs/requirements/portuguese-teacher-requirements.md`](docs/requirements/portuguese-teacher-requirements.md)
§4 for the level definitions.

### Voice architecture

Every conversational interaction runs through the **Voice Loop**:

```
mic → MediaRecorder/WebM ──► MiniMax ASR ──► MiniMax LLM ──► MiniMax TTS ──► speaker
                                  │                │
                                  ▼                ▼
                            transcript      feedback + corrections
                                  │                │
                                  └────► UI overlay ◄┘
```

### Variants

Two language variants are first-class: **pt-BR** (Brazilian) and **pt-PT**
(European). Lessons, audio, and the AI Teacher's voice/lexicon are
dialect-specific. Cross-dialect contamination is a defect.

## Conventions for contributors

- Use the glossary terms above when writing issues, ADRs, or code identifiers.
- When introducing a new domain term, add it to this glossary in the same change.
- Don't invent synonyms for existing terms (e.g. don't call a "Lesson" an
  "exercise" or "module").
- Pedagogical claims must cite the research document; product claims must cite
  the requirements document.