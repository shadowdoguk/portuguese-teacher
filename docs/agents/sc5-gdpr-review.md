# SC-5 Sampling Buffer — GDPR Art. 6 / 9 review conclusion

**Decision date:** 2026-06-30
**Reviewer:** Engineering lead (with reference to ADR-0003 §4 + requirements FR-DATA-2)
**Status:** Accepted — ship under EU legitimate-interest framing with the
mitigations below.

## What is the SC-5 Sampling Buffer?

Per ADR-0003 §4, the platform maintains a **separate audio path** from the
opt-in Stored Recordings: the SC-5 Sampling Buffer captures ≤ 24 h of audio
blobs from a deterministic 1 % sample of Voice Loop utterances. The buffer
exists solely to compute production-WER on the held-out reference ASR pipeline
(NFR-1, SC-5). It is **decoupled from Learner identity** — see §"Schema
posture" below.

## Legal basis (GDPR Art. 6)

**Art. 6(1)(f) — legitimate interests.** The legitimate interests are:

1. **Service-quality measurement.** SC-5 is the only signal that lets the
   platform validate the WER acceptance target (≥ 95 % per ADR-0002
   §"ASR accuracy strategy") on real production traffic rather than the
   deterministic simulator from issue #13. Without it, regressions in
   MiniMax ASR accuracy would be invisible until Learners complained.
2. **Dialect-quality regression detection.** pt-PT is the v1 dialect
   (ADR-0003 §1); measuring WER on real Learner audio is the only way to
   catch a regression in dialect-specific accuracy before it ships to the
   whole cohort.

These interests are not overridden by the Learner's fundamental rights
because the data is collected, stored, and processed under the
mitigations in §"Mitigations" — the data is **not used for any other
purpose**, **does not carry Learner identity**, and **is hard-deleted
within 24 h**.

## Art. 9 (special categories)

SC-5 audio does **not** contain special-category data (health, political
opinions, religious beliefs, etc.). Voice content alone is not a special
category under Art. 9. No Art. 9 review is required.

## Schema posture

The `Sc5Sample` Prisma model is intentionally **decoupled from Learner
identity**:

```prisma
model Sc5Sample {
  id           String   @id @default(cuid())
  utteranceId  String   @unique  // server-generated, no Learner link
  audioBlobUrl String              // object-store path; short-TTL signed
  transcript   String?
  confidence   Float?
  dialect      String   @default("pt-PT")
  createdAt    DateTime @default(now())

  @@index([createdAt])
}
```

There is **no `learnerId` field**. There is no foreign key to `Learner`,
no session identifier, no IP, no User-Agent. The `utteranceId` is a
server-generated random token with no Learner linkage. The buffer is
therefore outside the scope of the right-to-access / right-to-erasure
requests (FR-DATA-3) — there is no per-Learner audio data to produce or
to delete.

## Mitigations

| Risk | Mitigation |
| --- | --- |
| Re-identification via voice fingerprint | The buffer is used **only** for ASR + transcript comparison; voice fingerprints are never computed, stored, or shared. The held-out reference ASR pipeline is internal. |
| Data retention beyond purpose | Hard delete at 24 h via `scripts/sc5-retention.ts` (cron). The retention sweep is idempotent and runs on every scheduled tick. |
| Scope creep | The `Sc5Sample` schema has no fields that could later be repurposed (no Learner link, no metadata). Any new field requires a fresh review. |
| Cross-jurisdiction variance | Some jurisdictions (notably DE under BDSG, FR under CNIL guidance) may require explicit consent. v1 ships the buffer on the legitimate-interest basis; jurisdiction-specific opt-out toggles are a v1.1 follow-up. See the **Follow-up** section. |

## Recording posture summary

| Path | Default | Retention | Learner-link |
| --- | --- | --- | --- |
| Stored Recordings (FR-DATA-2) | opt-in only, default off | Indefinite (Learner-controlled) | yes |
| SC-5 Sampling Buffer (FR-DATA-2 + ADR-0003 §4) | always on, 1 % sample | ≤ 24 h, hard-deleted | **no** |

The two paths are independent. Opt-out from Stored Recordings does **not**
affect the SC-5 Sampling Buffer. Opt-out from SC-5 (jurisdiction-specific,
see Follow-up) does **not** affect Stored Recordings.

## Follow-up

- **Jurisdiction-specific opt-out toggle** (v1.1). Some regulators may
  require an opt-out path even for non-identifying sampling buffers. The
  Platform Settings surface ships the toggle; the toggle is wired into the
  sampler (a `Learner`-scoped deny-list that the route consults before
  calling `shouldSample`). Captured as the v1.1 follow-up to this review.
- **External legal sign-off**. This internal review records the
  engineering posture. The final pre-launch sign-off requires external
  counsel (DPA + DPO). Captured in `PROGRESS.md` §"Blockers".

## References

- ADR-0003 §4 (SC-5 Sampling Buffer rationale + retention posture)
- Requirements FR-DATA-2 (recording default), §5 SC-5 (1 % sample), NFR-1
  (≥ 95 % WER)
- ADR-0002 §"ASR accuracy strategy" (MiniMax ASR as canonical transcript)
- Issue #16 (this slice), issue #35 (the wire-up to the audio capture path)