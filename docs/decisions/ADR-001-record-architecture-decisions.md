# ADR-001: Record architecture decisions

**Date:** 2026-07-24
**Status:** Accepted

## Context

groundwork ships a skill that tells other teams to keep ADRs, but kept none itself. The
toolkit expansion (router skill, context system, detector CLI) introduces several decisions
that constrain future work and would surprise a new contributor if undocumented.

## Decision

We will keep ADRs in `docs/decisions/`, using the exact format the
`greenfield-adr-setup` skill prescribes, starting with the decisions made in the toolkit
expansion. A decision gets an ADR when it constrains future work, was chosen over real
alternatives, or is expensive to reverse.

## Consequences

**Positive:** the repo passes its own bar; contributors can trace why the structure is the
way it is; the skill's output format has a living example.
**Negative:** small ongoing writing cost per significant decision.
**Neutral:** existing decisions (two-layer model, phase prefixes) are documented in
CLAUDE.md and are recorded here only when they are next revisited.

## Alternatives Considered

- **Keep rationale in CLAUDE.md only** — rejected because CLAUDE.md states current rules
  without history; it cannot say what was rejected and why.
- **Retroactively write ADRs for every past decision** — rejected because the skill itself
  says to start from now; backfilling produces speculation, not records.
