# ADR-004: Durable project context in .groundwork/context.md

**Date:** 2026-07-24
**Status:** Accepted

## Context

`context/project-context.template.md` and `context/discovery-questions.md` existed but
nothing wrote, loaded, or freshness-checked them — principle selection had no operational
input. Impeccable demonstrated the mechanism: an init command writes durable context files,
a zero-dependency loader script surfaces them each session, and a doctor command repairs
drift only on request.

## Decision

We will store per-project context at `.groundwork/context.md` in the consumer's repository,
written by `/groundwork init` and read at session start via
`skills/groundwork/scripts/context.mjs` (zero-dependency Node, machine-readable
`CONTEXT_OK|MISSING|STALE|NO_PRINCIPLES` directives, always exit 0). Drift is reported by any
command but repaired only by `/groundwork doctor` with user approval.

## Consequences

**Positive:** `applies_when` principle selection finally has real input; commands stop
re-asking known facts; staleness is detected mechanically (90-day threshold).
**Negative:** consumers gain a dotfile directory; the file can lie until doctor runs.
**Neutral:** groundwork's own repo dogfoods the format at `.groundwork/context.md`.

## Alternatives Considered

- **Reuse CLAUDE.md / AGENTS.md** — rejected: harness-specific, unstructured, and often
  gitignored user config; groundwork needs one cross-harness, versioned artifact.
- **Store context inside the installed skill directory** — rejected: skill directories are
  overwritten on update; project data must outlive tool versions.
- **No loader script, prose instruction only** — rejected: behavior tests need a
  deterministic, observable load step to assert against.
