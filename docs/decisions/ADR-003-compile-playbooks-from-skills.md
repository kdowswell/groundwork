# ADR-003: Compile router playbooks from standalone skills

**Date:** 2026-07-24
**Status:** Accepted

## Context

ADR-002 creates two shapes of the same content: standalone `skills/<phase>-<name>/SKILL.md`
files and router playbooks in `skills/groundwork/reference/`. Maintaining both by hand
guarantees drift.

## Decision

We will treat the standalone skills as the single source of truth and generate the router
playbooks with `scripts/sync-router-references.ts` (`npm run sync:router`). The script strips
skill frontmatter, injects a generated header (phase, time box, entry/exit criteria, context
preamble), syncs the union of referenced principles into `reference/principles/` so relative
links keep working, and emits `cli/data/principles.json` for the CLI. Generated files are
committed, and CI fails if they are out of sync with their sources.

## Consequences

**Positive:** zero-drift by construction; the same pattern as the existing
`sync:principles` script; installed router skills are self-contained.
**Negative:** contributors must remember to run the sync (enforced by CI, mirrored by the
existing sync:principles convention).
**Neutral:** hand-authored playbooks (`init.md`, `doctor.md`) live beside generated ones and
are never touched by the sync.

## Alternatives Considered

- **Hand-maintain both copies** — rejected: guaranteed drift.
- **Router playbooks as thin pointers ("read skills/x/SKILL.md")** — rejected because an
  installed router skill must be self-contained; consumers do not have the full repo.
- **Symlinks** — rejected: not portable across install targets and zip distribution.
