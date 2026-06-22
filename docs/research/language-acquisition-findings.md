# Language Acquisition Research — Findings for `portuguese-teacher`

**Purpose.** Synthesise the peer-reviewed research, platform practice, and
AI-instruction literature that informed the platform's pedagogical and
architectural choices. This document is the source of truth for evidence-based
design decisions and is cited from the requirements document.

**Scope.** SRS, comprehensible input, task-based learning, conversational
immersion / AI tutoring, CEFR proficiency levels for Portuguese, and web
speech-recognition constraints.

**Date.** 2026-06-22.

---

## 1. Spaced Repetition Systems (SRS)

### Evidence

- **Ebbinghaus (1885)** documented the forgetting curve and the spacing effect:
  distributed practice produces superior retention to massed practice for the
  same total study time.
- **Cepeda et al. (2006)** meta-analysis confirmed the spacing effect across
  materials and timescales. **Cepeda et al. (2008)** quantified the optimum:
  to retain something for time *T*, schedule reviews at roughly 10–20% of *T*.
- **Settles & Meeder (2016)** introduced Half-Life Regression (HLR) at
  Duolingo. HLR reduced recall-prediction error by 45%+ versus baselines and
  lifted daily active engagement by 12% in an operational study. Source:
  *ACL 2016*, https://aclanthology.org/P16-1174/.
- **Chukharev-Hudilainen & Klepikova (2016)** demonstrated in a double-blind
  CALL study that ~3 min/day of spaced repetition tripled long-term vocabulary
  retention in EFL learners. Source: *CALICO Journal* 33(3):334–354.
- **Zhang, Zou & Xie (2021)** surveyed 72 learners on nine commercial
  vocabulary apps and found preferred spacing windows: 6–7 sessions for unknown
  words, 3–4 for familiar-but-unsure, 2–3 for known — over 10–14 day windows.
  Source: *Computer Assisted Language Learning* 35(2):1–34.

### Implications for the platform

- Schedule reviews with an **HLR-style scheduler** trained on per-item,
  per-learner recall data.
- New items are introduced with short, dense intervals (minutes → hours);
  long-interval reviews kick in once half-life crosses ~7 days.
- Surface multimodal cues (text + audio + image) per Zhang et al.'s learner
  preferences.
- Combine SRS with **retrieval practice** (active recall) rather than
  re-reading for stronger retention (testing effect, Roediger & Karpicke 2006,
  not reviewed here in detail but widely accepted).

---

## 2. Comprehensible Input (Krashen)

### Evidence

- **Krashen (1982, 1985)** — the Input Hypothesis: acquisition happens when the
  learner receives **comprehensible input at i+1**, where *i* is current
  competence and *+1* is the next stage. Affective Filter modulates how much
  input is actually acquired.
- **Luo (2024)** literature review in *Journal of Education, Humanities and
  Social Sciences* confirms Krashen's continued influence on communicative
  language teaching while documenting ongoing definitional criticism.
- **Nguyen & Doan (2025)** — *Frontiers in Psychology* — provide a
  neuro-ecological critique: converging brain-imaging evidence shows
  acquisition is an active, embodied process, not a passive one. CI is
  necessary but not sufficient; interaction, feedback, and multimodal
  engagement matter. Adaptive AI tutors can deliver *dynamic* i+1 in ways
  static input cannot.
- **Clozemaster (2026)** summary notes the practical heuristic: learners
  acquire best when they understand ~70–90% of input; below that, the
  Affective Filter rises and acquisition stalls.

### Implications for the platform

- All AI Teacher utterances, reading passages, and listening material must be
  dynamically calibrated to the Learner's estimated level — not the lesson's
  nominal level. This is "dynamic i+1".
- The platform must track an **Affective Filter proxy**: drop-out signals,
  repeated mic-cancellations, response latency, and self-reported confidence.
  When the proxy spikes, the AI Teacher simplifies and encourages rather than
  advancing.
- Jin, Dugan & Callison-Burch (2026) showed that simple prompting cannot
  reliably control LLM output difficulty; **modular difficulty control** is
  needed (re-ranking, future-discriminators). See §5.

---

## 3. Task-Based Language Teaching (TBLT)

### Evidence

- **Ellis (2003)** — canonical TBLT framework: pre-task → during-task →
  post-task cycles. Tasks are meaning-focused, goal-oriented, and
  real-world-relevant.
- **Sarıçoban & Karakurt (2016)** — varied task-based activities significantly
  improved EFL listening and speaking. Source: *Sino-US English Teaching*
  13(6).
- **Harris & Leeming (2021)** — longitudinal study: TBLT and PPP produced
  similar short-term gains, but TBLT was more effective for long-term
  retention.
- **Weisi & Rezghi (2025)** — systematic review of digital TBLT (2015–2025):
  digital TBLT produces gains in speaking, writing, and motivation;
  *pedagogical design quality matters more than technological sophistication*.
- **Lee (2025)** — TBLT raised classroom self-confidence in Japanese tertiary
  EFL learners but had limited transfer to spontaneous real-world
  conversation, reinforcing the need for **simulated authentic scenarios**.

### Implications for the platform

- Each Unit must contain at least one **goal-oriented task** (e.g. "order a
  meal at a Lisbon café and ask for the bill") rather than pure drill.
- Tasks follow the pre-/during-/post- structure, with **scaffolding that
  fades** as proficiency rises.
- Conversational Practice sessions are framed as **scenarios** drawn from real
  Portuguese-speaking contexts (Brazil, Portugal, Lusophone Africa), not as
  open chat.

---

## 4. Conversational Immersion & AI Tutoring

### Evidence

- **Duolingo** — published peer-reviewed efficacy work since 2020. Smith,
  Jiang & Peters (2024) showed receptive + productive gains after 3 months of
  Duolingo. Kittredge et al. (2024) found learners can start basic
  conversation after 4–6 weeks. Jiang et al. (2024) tied Duolingo English to
  above-A1 test scores. Source: https://www.duolingo.com/efficacy/studies.
- **Babbel** — independently validated speech-recognition quality and
  scenario-based curriculum structure. Industry comparisons cite Babbel's
  contextual, scenario-clustered vocabulary and stronger pronunciation
  feedback versus Duolingo.
- **Jin, Dugan & Callison-Burch (2026)** — *Toward Beginner-Friendly LLMs for
  Language Learning*, arXiv:2506.04072. Showed that controllable-generation
  techniques (re-ranking, future-discriminators) raised beginner
  comprehensibility of LLM conversation from 39.4% to 83.3%, while prompt-only
  approaches suffered "alignment drift" back to native-level output.
  Source: https://arxiv.org/abs/2506.04072.
- **Kamelabad et al. (2026)** — *Personalized language learning with an LLM
  chatbot*, *Frontiers in Education*. Immediate corrective feedback (ICF)
  improved user experience versus delayed CF; learning gains were comparable,
  but ICF had better engagement. Source:
  https://doi.org/10.3389/feduc.2026.1703664.
- **Meng (2025)** — customising ChatGPT for ESL speaking, grounded in CLT,
  Motivation Theory, Culturally Responsive Teaching, and the Affective Filter,
  produced more balanced feedback and stronger emotional support than the
  uncustomised baseline.
- **Commercial AI Portuguese tutors surveyed (2024–2026)**: Talkpal, Langua,
  Speak, Univerbal, Talkio, Gliglish. Common strengths: real-time
  pronunciation feedback, scenario roleplay, dialect choice (pt-BR vs pt-PT).
  Common weaknesses: shallow advanced content, repetitive scenarios, no
  spaced-repetition vocabulary layer, sometimes generic feedback.

### Implications for the platform

- Use the **MiniMax AI suite** (LLM + ASR + TTS) as the conversational backbone,
  with the LLM prompted using a pedagogy-aware system prompt grounded in CLT,
  TBLT, and the Affective Filter.
- **Modular difficulty control** for the LLM, per Jin et al. (2026): generate
  candidates, then re-rank by a difficulty estimator aligned with the Learner's
  CEFR level and recent performance. Plain prompt-based control is
  insufficient.
- **Immediate corrective feedback** by default, with a learner toggle for
  delayed feedback (cf. Kamelabad et al. 2026).
- Every feedback message follows a structured rubric: error type →
  correction → brief rule → example → encouragement.
- Embed the conversational layer inside a **structured curriculum** (Lessons,
  Units, Milestones). Pure free-form chat without progression logic is
  insufficient (consistent with the Weisi & Rezghi 2025 finding that
  *pedagogical design* matters more than *technological sophistication*).

---

## 5. CEFR Levels for Portuguese

### Evidence

- **Council of Europe CEFR** — six levels (A1–C2) with can-do descriptors.
  Adopted universally for Portuguese (both pt-BR and pt-PT). Source:
  https://www.coe.int/en/web/common-european-framework-reference-languages.
- **FSI estimates** (cited by Loci Language, 2026): Portuguese is a
  Category-I language for English speakers — ~600 classroom hours to B2.
  Per-level cumulative hours from zero: A1 ≈ 60–100h, A2 ≈ 180–200h,
  B1 ≈ 350–400h, B2 ≈ 600h.
- **Vocabulary targets** (Loci, 2026): A1 ≈ 500 word families, A2 ≈ 1,000,
  B1 ≈ 2,000, B2 ≈ 4,000.
- **Certification**: CAPLE (Centro de Avaliação e Certificação de Português
  Língua Estrangeira) for European Portuguese; CELPE-Bras for Brazilian.
- **University of Vienna Portuguese syllabus** (2024) provides A1/A2/B1
  topic-by-topic grammar inventories — useful as a curriculum backbone
  reference.

### Implications for the platform

- Curriculum maps to **CEFR A0 → B1** as the success corridor. "Conversational
  fluency" = CEFR B1 (Independent User can deal with most travel situations
  and express opinions on familiar topics).
- Vocabulary targets above are **upper bounds** for completion. The platform
  measures Lexical Coverage against these targets and gates Unit completion.
- Dialect choice (pt-BR vs pt-PT) is set at sign-up and propagated to lesson
  content, ASR/TTS voice, and the AI Teacher's lexicon.

---

## 6. Web Speech API & ASR Constraints

### Evidence

- **Web Speech API** is the only browser-native API for ASR. Support is
  uneven:
  - Chrome / Edge / Opera / Brave (Chromium): full support, ~90–95% accuracy
    in clean audio, ~85–90% with moderate noise. Audio is sent to Google
    cloud servers for transcription.
  - Safari: partial support (macOS 12.3+ / iOS 14.5+), ~85–90% accuracy.
  - Firefox: limited/no Web Speech API support — Firefox explicitly avoids
    Google-cloud routing for privacy.
- **Server-side ASR benchmarks for Portuguese (FLEURS benchmark)**:
  - ElevenLabs Scribe v1: 2.3% WER
  - OpenAI Whisper Large v3: 4.1% WER
  - Google Gemini Flash 2: 3.3% WER
  - Deepgram Nova 2: 10.5% WER
- **Audio capture**: `navigator.mediaDevices.getUserMedia({ audio: true })` is
  the standard; needs HTTPS (except `localhost`).

### Implications for the platform

- Browser support tier:
  - **Tier 1 (full feature)** — Chromium browsers (Chrome, Edge, Opera, Brave).
    Use Web Speech API for low-latency live transcription; send finalised
    audio to MiniMax ASR for higher-accuracy post-hoc scoring.
  - **Tier 2 (degraded feature)** — Safari. Use MediaRecorder → audio blob →
    MiniMax ASR for batched transcription. Slightly higher latency.
  - **Tier 3 (unsupported)** — Firefox. Show a banner suggesting Chrome or
    Edge; degrade gracefully to text-only practice mode.
- Target ASR accuracy ≥ 95% on common patterns. Achieve this by:
  - Routing finalised audio through MiniMax ASR (or comparable
    server-side engine) rather than relying on Web Speech API alone.
  - Constraining recognition to a **closed grammar / vocabulary** matching
    the Learner's current Unit (language model biasing).
  - Allowing the Learner to retry, or to switch to text input if speech fails
    repeatedly.
- Microphone capture over HTTPS only.

---

## 7. Synthesis — Design Principles

The platform's design rests on seven principles, each traceable to the
research above:

1. **SRS-driven retention.** Half-life regression scheduler for vocabulary
   and grammar items.
2. **Dynamic i+1 exposure.** All teacher utterances, readings, and listening
   material are difficulty-controlled to the Learner's level.
3. **Task-based practice.** Every Unit has at least one goal-oriented
   scenario task; pure drill is the exception, not the rule.
4. **LLM conversational tutor with modular difficulty control.** Generate →
   re-rank → deliver. Prompt-only control is insufficient.
5. **Immediate corrective feedback by default.** Toggle for delayed CF.
6. **CEFR-aligned progression** with milestone assessments. Success criterion
   "conversational fluency" = CEFR B1.
7. **Cross-browser parity with graceful degradation.** Chromium full,
   Safari batched, Firefox text-only fallback.

These principles are codified in
[`docs/adr/0001-pedagogical-model.md`](../adr/0001-pedagogical-model.md) and
[`docs/adr/0002-voice-loop-architecture.md`](../adr/0002-voice-loop-architecture.md).

---

## References

- Cepeda, N. J., et al. (2006). Distributed practice in verbal recall tasks.
  *Psychological Bulletin*.
- Cepeda, N. J., et al. (2008). Spacing effects in learning: A temporal
  ridgeline of optimal retention. *Psychological Science*.
- Chukharev-Hudilainen, E. & Klepikova, T. (2016). The effectiveness of
  computer-based spaced repetition in foreign language vocabulary instruction.
  *CALICO Journal* 33(3).
- Ellis, R. (2003). *Task-Based Language Learning and Teaching*. Oxford.
- Harris, J. & Leeming, P. (2021). The impact of TBLT on L2 writing. *Language
  Teaching Research*.
- Jin, M., Dugan, L. & Callison-Burch, C. (2026). Toward Beginner-Friendly LLMs
  for Language Learning. arXiv:2506.04072.
- Kamelabad, A. M., et al. (2026). Personalized language learning with an LLM
  chatbot. *Frontiers in Education* 11.
- Krashen, S. (1982). *Principles and Practice in Second Language Acquisition*.
  Pergamon.
- Luo, Z. (2024). A review of Krashen's Input Theory. *JEHSS* 26.
- Meng, F. (2025). Customizing ChatGPT for Second Language Speaking Practice.
  *ICLS 2025 Proceedings*.
- Nguyen, Q. N. & Doan, D. T. H. (2025). Beyond comprehensible input: a
  neuro-ecological critique of Krashen's hypothesis in language education.
  *Frontiers in Psychology* 16:1636777.
- Sarıçoban, A. & Karakurt, L. (2016). The use of task-based activities to
  improve listening and speaking skills in EFL context. *Sino-US English
  Teaching* 13(6).
- Settles, B. & Meeder, B. (2016). A trainable spaced repetition model for
  language learning. *ACL 2016*.
- Weisi, H. & Rezghi, A. (2025). Digital Task-Based Language Teaching
  (TBLT): A Systematic Review. *Qualitative Inquiry as Praxis in L2 Studies*
  1(2).
- Zhang, R., Zou, D. & Xie, H. (2021). Spaced repetition for authentic
  mobile-assisted word learning. *CALL* 35(2).
- Duolingo Research. https://www.duolingo.com/efficacy/studies
- Council of Europe. *Common European Framework of Reference for Languages*.
  https://www.coe.int/en/web/common-european-framework-reference-languages
- Loci Language (2026). CEFR Portuguese Levels: A1 to C2.
- University of Vienna Sprachenzentrum. Portuguese A1/A2/B1 syllabus.
- ElevenLabs Scribe Portuguese ASR benchmark.
- AssemblyAI (2025). Speech recognition in the browser using Web Speech API.
- VoiceToTextOnline (2025). Browser compatibility for voice typing.