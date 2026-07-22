# SC-5 Sampling Buffer

The SC-5 Sampling Buffer is the **separate** audio path that backs SC-5
production-WER measurement (NFR-1, FR-DATA-2, ADR-0003 §4). It is decoupled
from Learner identity by design.

## Why a separate path?

FR-DATA-2 says recording defaults to **off** (Stored Recordings are opt-in).
SC-5 requires **1 % of utterances** for production WER measurement. The two
postures can't both be true on the same audio path — the buffer exists so
that opt-in is honest (there is no per-Learner audio data subject to
right-to-access / right-to-erasure).

## Schema

```prisma
model Sc5Sample {
  id           String   @id @default(cuid())
  utteranceId  String   @unique  // server-generated; no Learner link
  audioBlobUrl String                // object-store path; short-TTL signed
  transcript   String?               // populated by the held-out reference ASR
  confidence   Float?
  dialect      String   @default("pt-PT")
  createdAt    DateTime @default(now())

  @@index([createdAt])
}
```

There is **no `learnerId` field**. See `docs/agents/sc5-gdpr-review.md` for
the recorded review conclusion (EU legitimate-interest framing).

## Module layout

| File | Purpose |
| --- | --- |
| `sampler.ts` | FNV-1a 32-bit hash + 1 % sample trigger (`shouldSample`). |
| `recorder.ts` | Fire-and-forget writer; off the Voice Loop latency-critical path. |
| `retention.ts` | 24 h hard-delete sweep (`runRetentionSweep`). |
| `aggregation.ts` | Weekly WER aggregation (`aggregateWeeklyWer`). |
| `health.ts` | Health snapshot (`getSc5Health`) consumed by `/api/sc5/health`. |

## Routes + scripts

- `GET /api/sc5/health` — sample count + oldest row + retention status.
- `pnpm tsx scripts/sc5-load-test.ts` — ≥ 10 k utterances → ~1 % sample,
  asserts ±0.5 pp drift from target.
- `pnpm tsx scripts/sc5-retention.ts [--dry-run]` — runs the 24 h hard-delete
  sweep. Intended for cron.

## Tests

- `src/test/sc5-sampler.test.ts` — distribution + edge cases.
- `src/test/sc5-retention.test.ts` — sweep + dry-run + idempotency.
- `src/test/sc5-recorder.test.ts` — fire-and-forget semantics + error
  swallowing.

The acceptance criterion "1 % of utteranceIds from the Voice Loop produce a
`Sc5Sample` row in a load test (≥ 10 k utterances)" is satisfied by
`pnpm sc5:load-test` — the synchronous sampler produces the same
distribution as the fire-and-forget recorder, and the script asserts the
async writes match.

## Voice Loop integration

The `/api/asr/transcribe` route accepts an optional `sc5Recorder` dep. The
route is wired in `src/instrumentation.ts` to bind the default recorder to
the shared Prisma client. After every successful ASR transcript, the route
generates a per-request `utteranceId`, runs it through `shouldSample`, and
on a hit enqueues the audio blob to the recorder. The recorder writes to
the object store + persists a `Sc5Sample` row, **all fire-and-forget** —
the route never awaits the write.

Issue #35 builds on this seam to add the Tier 1/2 capture-path hook and the
jurisdiction-specific opt-out toggle.