## Agent skills

### Session start

At the **start of every session**, before opening an issue or touching code:

1. Read [`PROGRESS.md`](./PROGRESS.md) — the living tracker. It has the current focus, the in-progress branch/PR, the issue queue, the decisions log, and the conventions reminder.
2. Skim [`HANDOFF.md`](./HANDOFF.md) — the point-in-time snapshot from the previous session. It tells you what landed, what's queued, what's still pending.
3. Read [`CONTEXT.md`](./CONTEXT.md) — domain glossary and conventions. Use the glossary terms; don't invent synonyms.
4. Skim [`docs/adr/`](./docs/adr/) — existing architectural decisions. Surface relevant ADRs in any plan rather than re-deciding.
5. Run `pnpm progress:check` — confirms the tracker agrees with the live GitHub issue list. If it fails, update PROGRESS.md (or close the missing issue) before continuing.
6. `git checkout main && git pull` and `git status` — confirm a clean working tree on `main` before branching.

A new session that ignores this list will start with stale assumptions and will duplicate work or contradict the decisions log.



### Issue tracker

Issues for this repo live in **GitHub Issues** for
[`shadowdoguk/portuguese-teacher`](https://github.com/shadowdoguk/portuguese-teacher).
Skills that read or write this tracker: `to-issues`, `triage`, `to-prd`, `qa`.

#### CLI

Uses the [`gh`](https://cli.github.com/) CLI. Authenticate once with
`gh auth login`.

```bash
# Create an issue
gh issue create --repo shadowdoguk/portuguese-teacher \
  --title "..." --body "..." --label "needs-triage"

# List issues by label
gh issue list --repo shadowdoguk/portuguese-teacher \
  --label "ready-for-agent" --state open

# Apply a label
gh issue edit <number> --repo shadowdoguk/portuguese-teacher \
  --add-label "ready-for-agent"

# View an issue
gh issue view <number> --repo shadowdoguk/portuguese-teacher
```

#### Default repo

When `gh` runs from inside a clone of this repo, `--repo` can be omitted —
`gh` resolves the remote automatically. The explicit form above lets skills
target the repo from any working directory.

#### Conventions

- One issue per discrete unit of work.
- Title: short, imperative, present tense ("Add X", "Fix Y").
- Body: include Why / What / Acceptance. The `to-issues` and `to-prd` skills
  emit this shape by default.
- Apply exactly one triage label at a time. See *Triage labels* below.

#### Authentication check

Before any write, verify auth:

```bash
gh auth status --repo shadowdog-dev/portuguese-teacher
```

If unauthenticated, stop and tell the user to run `gh auth login`. Never embed
or log tokens.

### Triage labels

The `triage` skill moves issues through a five-state machine by applying
these labels. **Exactly one triage label per issue at any time.**

| Canonical role | Label string | Meaning |
|---|---|---|
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate |
| `needs-info` | `needs-info` | Waiting on reporter |
| `ready-for-agent` | `ready-for-agent` | Fully specified, AFK-ready |
| `ready-for-human` | `ready-for-human` | Needs human implementation |
| `wontfix` | `wontfix` | Will not be actioned |

#### Defaults

Each role's string equals its name. The skills create these labels on first
use via `gh issue edit --add-label`.

#### State transitions

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

The `triage` skill is the only writer of these labels. Other skills
(`to-issues`, `qa`) may read them but should not modify them.

#### Overrides

If you rename a label in GitHub (e.g. `bug:triage` instead of `needs-triage`),
update the table above. Skills read this file on every invocation.

### Domain docs

This repo uses a **single-context** layout. Skills that need the project's
domain language read `CONTEXT.md`; skills that need past decisions read
`docs/adr/`.

#### Layout

```
<repo root>/
├── CONTEXT.md           # Domain language, key concepts, glossary
└── docs/
    └── adr/             # Architectural Decision Records (one .md per decision)
```

#### Consumer rules

Skills that consume these docs (`improve-codebase-architecture`, `diagnose`,
`tdd`, `zoom-out`) follow these rules:

1. **Read `CONTEXT.md` first.** It defines the project's vocabulary. Use the
   terms it defines; do not invent synonyms.
2. **Skim `docs/adr/` for relevant decisions.** When proposing a change,
   check whether an existing ADR already covers it — surface that ADR rather
   than re-deciding.
3. **Propose new ADRs for non-trivial decisions.** If a change introduces a
   new architectural pattern, write `docs/adr/<NNNN>-<slug>.md` using
   Context / Decision / Consequences.
4. **Keep `CONTEXT.md` in sync.** When a change introduces a new domain
   term, add it to `CONTEXT.md`'s glossary in the same change.

#### When CONTEXT.md is missing

If `CONTEXT.md` does not exist yet, consumer skills will:

- Ask the user to draft one before deep architectural work, OR
- Proceed without it and flag the gap in their final report.

They will not invent domain terms on the user's behalf.

#### Migrating to multi-context

If this repo grows into a monorepo with separate frontend / backend / shared
contexts, replace this file with a `CONTEXT-MAP.md` at the repo root pointing
to per-context `CONTEXT.md` files. The consumer rules above then apply
per-context, scoped to the subtree being changed.
