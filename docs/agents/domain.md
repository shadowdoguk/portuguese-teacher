# Domain docs

This repo uses a **single-context** layout. Skills that need the project's domain language read `CONTEXT.md`; skills that need past decisions read `docs/adr/`.

## Layout

```
<repo root>/
├── CONTEXT.md           # Domain language, key concepts, glossary
└── docs/
    └── adr/             # Architectural Decision Records (one .md per decision)
```

## Consumer rules

Skills that consume these docs (`improve-codebase-architecture`, `diagnose`, `tdd`, `zoom-out`) follow these rules:

1. **Read `CONTEXT.md` first.** It defines the project's vocabulary. Use the terms it defines; do not invent synonyms.
2. **Skim `docs/adr/` for relevant decisions.** When proposing a change, check whether an existing ADR already covers it — surface that ADR rather than re-deciding.
3. **Propose new ADRs for non-trivial decisions.** If a change introduces a new architectural pattern, write `docs/adr/<NNNN>-<slug>.md` using Context / Decision / Consequences.
4. **Keep `CONTEXT.md` in sync.** When a change introduces a new domain term, add it to `CONTEXT.md`'s glossary in the same change.

## When CONTEXT.md is missing

If `CONTEXT.md` does not exist yet, consumer skills will:

- Ask the user to draft one before deep architectural work, OR
- Proceed without it and flag the gap in their final report.

They will not invent domain terms on the user's behalf.

## Migrating to multi-context

If this repo grows into a monorepo with separate frontend / backend / shared contexts, replace this file with a `CONTEXT-MAP.md` at the repo root pointing to per-context `CONTEXT.md` files. The consumer rules above then apply per-context, scoped to the subtree being changed.