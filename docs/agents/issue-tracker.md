# Issue tracker

Issues for this repo live in **GitHub Issues** for [`shadowdog-dev/portuguese-teacher`](https://github.com/shadowdog-dev/portuguese-teacher).

Skills that read or write this tracker: `to-issues`, `triage`, `to-prd`, `qa`.

## CLI

Uses the [`gh`](https://cli.github.com/) CLI. Authenticate once with `gh auth login`.

```bash
# Create an issue
gh issue create --repo shadowdog-dev/portuguese-teacher \
  --title "..." --body "..." --label "needs-triage"

# List issues by label
gh issue list --repo shadowdog-dev/portuguese-teacher \
  --label "ready-for-agent" --state open

# Apply a label
gh issue edit <number> --repo shadowdog-dev/portuguese-teacher \
  --add-label "ready-for-agent"

# View an issue
gh issue view <number> --repo shadowdog-dev/portuguese-teacher
```

## Default repo

When `gh` runs from inside a clone of this repo, `--repo` can be omitted — `gh` resolves the remote automatically. The explicit form above lets skills target the repo from any working directory.

## Conventions

- One issue per discrete unit of work.
- Title: short, imperative, present tense ("Add X", "Fix Y").
- Body: include Why / What / Acceptance. The `to-issues` and `to-prd` skills emit this shape by default.
- Apply exactly one triage label at a time. See `triage-labels.md`.

## Authentication check

Before any write, verify auth:

```bash
gh auth status --repo shadowdog-dev/portuguese-teacher
```

If unauthenticated, stop and tell the user to run `gh auth login`. Never embed or log tokens.