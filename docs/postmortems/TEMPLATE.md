# Incident Post-Mortem

> **When to use.** Open this template whenever a P0/P1 incident lands on the
> Voice Loop or any service whose degradation is user-visible. Aim to fill it
> in within 24 h of the incident closing, even if some sections are still
> incomplete — the structure forces the right conversations.

## Summary

| Field | Value |
| --- | --- |
| Incident ID | `YYYY-MM-DD-<slug>` |
| Severity | P0 / P1 / P2 |
| Started at | UTC timestamp |
| Detected at | UTC timestamp + source (alert, user report, synthetic probe) |
| Mitigated at | UTC timestamp |
| Closed at | UTC timestamp |
| Owner | (incident commander) |
| Status page | (link to public summary, if any) |

## Impact

- **Learners affected**: count, geographies, dialect (pt-PT is the only v1 dialect)
- **User-visible behaviour**: what a Learner actually saw — text-only teacher utterances, status banner, fallback to text input, etc.
- **Duration of impact**: time from first user-visible failure to last
- **NFRs / SLOs touched**: NFR-3 (uptime), NFR-6 (graceful degradation), NFR-8 (observability), SC-2 (≥ 95% uptime), SC-4 (Milestone pass rate), SC-5 (production WER)
- **Estimated recall / scenario completions lost**: from `SrsRecallEvent` + `ScenarioCompletion` rows in the window

## Timeline (UTC)

| Time | Event | Source |
| --- | --- | --- |
| T+0 | First failed MiniMax probe (region, service) | `/api/probes/heartbeat` |
| T+30 s | Health snapshot flipped to `degraded` / `down` | `/api/health` |
| T+1 m | First `DegradationBanner` mount observed | client telemetry |
| T+2 m | First user-visible fallback fired | `voice_loop_error` events |
| T+? m | On-call paged | pager |
| T+? m | Mitigation deployed | deploy SHA |
| T+? m | Health snapshot recovered | `/api/health` |
| T+? m | Banner cleared | client telemetry |

## Root cause

- **What broke**: (one-paragraph technical explanation)
- **Why it broke**: (the deeper reason — config drift, capacity, race, dependency)
- **What we missed in design**: (which assumption turned out wrong)

## Resolution

- Immediate mitigation: (rollback, flag flip, scaling, failover)
- Permanent fix: (commit / PR, deploy SHA)
- Detection improvement: (alert that should have fired, didn't)

## Lessons

- What worked
- What didn't
- What surprised us

## Action items

| Action | Owner | Due | Tracked in |
| --- | --- | --- | --- |
| (concrete, scoped, time-boxed) | (person or team) | (date) | (issue / PR link) |

## Appendix

### Telemetry references

- Dashboard snapshot (link)
- Query: `pnpm scripts/availability --service <id> --windowMs <window>`
- Sample `voice_loop_latency` events around the incident (JSON lines)

### Related

- ADR-0002 (Voice Loop architecture)
- ADR-0003 (v1 scope amendment)
- ADR-0004 (Difficulty-control pipeline)
- Issue #12 (this feature)