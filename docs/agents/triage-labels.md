# Triage labels

The `triage` skill moves issues through a five-state machine by applying these labels. **Exactly one triage label per issue at any time.**

| Canonical role | Label string | Meaning |
|---|---|---|
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate |
| `needs-info` | `needs-info` | Waiting on reporter |
| `ready-for-agent` | `ready-for-agent` | Fully specified, AFK-ready |
| `ready-for-human` | `ready-for-human` | Needs human implementation |
| `wontfix` | `wontfix` | Will not be actioned |

## Defaults

Each role's string equals its name. The skills create these labels on first use via `gh issue edit --add-label`.

## State transitions

```
   new issue
       │
       ▼
  needs-triage ─────► wontfix
       │
       ├──► needs-info ──► needs-triage (after reporter replies)
       │
       ├──► ready-for-agent
       │
       └──► ready-for-human
```

The `triage` skill is the only writer of these labels. Other skills (`to-issues`, `qa`) may read them but should not modify them.

## Overrides

If you rename a label in GitHub (e.g. `bug:triage` instead of `needs-triage`), update the table above. Skills read this file on every invocation.