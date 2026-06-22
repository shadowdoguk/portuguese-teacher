# ADR 0002 — Voice Loop Architecture

**Status:** Accepted
**Date:** 2026-06-22
**Deciders:** Engineering lead, Product, Pedagogy lead
**Related:** [`CONTEXT.md`](../../CONTEXT.md), [`docs/research/language-acquisition-findings.md`](../research/language-acquisition-findings.md), [`docs/requirements/portuguese-teacher-requirements.md`](../requirements/portuguese-teacher-requirements.md) §3.3, §3.4

## Context

The platform's Conversational Practice feature (FR-CP) requires a real-time
voice loop between the Learner and the AI Teacher. The end-to-end latency
target is **< 1.5 seconds** from end-of-Learner-speech to start-of-teacher-speech
at p95. The accuracy target is **≥ 95%** WER for common Portuguese patterns.

Browser-native constraints shape the design:

- **Web Speech API** is supported only on Chromium browsers (Chrome, Edge,
  Opera, Brave) with ~90–95% accuracy. Safari has partial support
  (≥ macOS 12.3 / iOS 14.5). Firefox has effectively no support due to
  privacy posture against Google-cloud routing.
- **Server-side ASR** (ElevenLabs Scribe 2.3% WER, Whisper 4.1% WER,
  Gemini 3.3% WER on FLEURS Portuguese) outperforms Web Speech API in
  accuracy but adds network latency.
- **MiniMax TTS** is the synthesis engine; **MiniMax LLM** is the
  reasoning engine.

## Decision

The platform implements a **two-tier Voice Loop** with browser-tier
selection at sign-in / capability detection:

### Browser Tier 1 — Chromium (full live mode)

```
mic ──► Web Speech API (live interim transcript, low latency)
            │
            ▼
        end-of-speech detect (silence ≥ 600 ms or hotkey)
            │
            ▼
        MediaRecorder audio blob ──► MiniMax ASR (canonical, high accuracy)
            │
            ▼
        MiniMax LLM (with difficulty-controlled re-rank)
            │
            ├──► teacher utterance ──► MiniMax TTS ──► speaker
            └──► feedback overlay ──► UI
```

### Browser Tier 2 — Safari (degraded live mode)

```
mic ──► MediaRecorder (WebM/Opus, batched on silence)
            │
            ▼
        MiniMax ASR (canonical transcript)
            │
            ▼
        MiniMax LLM ──► MiniMax TTS ──► speaker
```

### Browser Tier 3 — Firefox (text fallback)

```
keyboard input ──► MiniMax LLM ──► text + (optional MiniMax TTS)
```

### Detection

- On sign-in and on `navigator` change, run a capability probe.
- Persist Tier assignment in the Learner profile; allow manual override in
  Settings ("Force tier 1 / 2 / 3").

### Latency budget (Tier 1)

| Stage | Budget |
| --- | --- |
| End-of-speech detection | 600 ms |
| Audio upload (final blob) | 200 ms |
| MiniMax ASR | 300 ms |
| MiniMax LLM (incl. re-rank) | 400 ms |
| MiniMax TTS first-byte | 200 ms |
| **Total p95** | **~1.5 s** |

### ASR accuracy strategy

- Use **MiniMax ASR** as the canonical transcript for all scoring.
- Apply **language-model biasing** toward the Learner's current Unit's
  vocabulary and grammar to lift WER on common patterns.
- Reject utterances whose confidence < 0.6 and prompt the Learner to
  retry, or fall through to text input.

### Graceful degradation

- If MiniMax ASR is unreachable, fall back to Web Speech API (Tier 1)
  or text input (Tiers 2–3).
- If MiniMax LLM is unreachable, fall back to a rule-based tutor with
  canned feedback for the current Unit.
- If MiniMax TTS is unreachable, render teacher utterances as text only.
- All degradations visible via a status indicator; no silent breakage.

## Consequences

### Positive

- Tier-aware architecture maximises feature availability across browsers
  without sacrificing accuracy where it matters (canonical transcript
  always from MiniMax ASR).
- Latency budget is explicit and measurable; per-stage SLIs feed the
  observability dashboards.
- Browser support matrix in the requirements doc (FR-WEB-2) is achievable
  with this design.
- Graceful degradation preserves Learner session continuity.

### Negative

- Two ASR paths (Web Speech API + MiniMax ASR) on Tier 1 increase code
  complexity and surface area for divergence.
- Firefox users get a degraded experience in v1; product must accept this
  trade-off or invest in a server-side-only solution.
- ASR language-model biasing per Unit requires careful maintenance of
  biasing vocabularies.

### Neutral

- MiniMax suite is the sole provider; no multi-provider abstraction in
  v1. If the suite is unreachable, full Voice Loop degrades.
- All audio is uploaded to MiniMax ASR; this is the privacy trade-off
  Firefox explicitly refuses, hence the Tier 3 split.

## Alternatives considered

- **Web Speech API only.** Rejected: insufficient accuracy on Safari and
  blocked entirely on Firefox; unacceptable for the 95% WER target.
- **Server-side only (no Web Speech API).** Rejected: raises p95
  latency above the 1.5 s budget on Tier 1.
- **On-device Whisper for Firefox.** Rejected: 100–300 MB model download
  is a poor first-run experience; defer to v2.
- **Multi-provider abstraction.** Rejected: out of scope per
  constraints; defer to v1.1.

## References

- MDN Web Speech API documentation.
- AssemblyAI (2025). Speech recognition in the browser using Web Speech
  API.
- ElevenLabs Scribe Portuguese ASR benchmark.
- VoiceToTextOnline (2025). Browser compatibility for voice typing.
- Kamelabad et al. (2026). ICF timing. *Frontiers in Education*.
- Jin et al. (2026). Beginner-friendly LLMs. arXiv.