# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (this repo):

```
/
├── AGENTS.md
├── HANDOFF.md
├── PROGRESS.md
├── CONTEXT.md                  # Domain glossary, key concepts, conventions
├── docs/
│   ├── adr/                    # Architectural Decision Records (one .md per decision)
│   │   ├── 0001-workspace-and-atomic-publish.md
│   │   └── 0002-shared-credentials-and-android-secure-storage.md
│   ├── agents/                 # Skill setup (issue tracker, triage labels, this file)
│   ├── superpowers/
│   │   ├── specs/              # Approved rebuild specs
│   │   └── plans/              # Phase-level implementation plans
│   └── reports/                # Time-bounded research documents
└── legacy/                     # Archived A0–B1 application; reference only, never imported
```

The rebuild product itself (apps/web, apps/api, packages/contracts, packages/domain, packages/content, packages/tooling) lives at the repo root once Phase A lands; it is single-context.

Multi-context repo (presence of `CONTEXT-MAP.md` at the root):

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_

## Where the rebuild's ADR numbering restarts

The legacy project (`legacy/docs/adr/0001-*.md` through `0005-*.md`) is archived reference material. New ADRs for the rebuild start at `0001` again; never re-use the legacy numbers.