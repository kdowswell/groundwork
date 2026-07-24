# ADR-002: Router skill as the single entry point

**Date:** 2026-07-24
**Status:** Accepted

## Context

groundwork had 15 standalone skills, each with its own description competing for
auto-invocation in agent runtimes. Nothing routed a vague request to the right skill, and a
user who didn't know the catalog had no menu. Impeccable (pbakaus/impeccable) demonstrated a
router pattern: one small SKILL.md that routes verb commands to on-demand reference
playbooks, keeping the always-loaded context tiny.

## Decision

We will ship a `groundwork` router skill (`/groundwork <command>`) whose SKILL.md holds only
the command table, routing rules, and phase guidance, and whose per-command playbooks live in
`reference/` and load one at a time. The 15 standalone skills remain installable on their
own; the router is the recommended front door.

## Consequences

**Positive:** one memorable namespace; a no-argument menu; progressive disclosure (one
playbook loaded per request); verb vocabulary (`spec`, `plan`, `retro`) instead of long skill
names.
**Negative:** two installable shapes (router vs. standalone) must stay in sync — mitigated by
ADR-003's compile step.
**Neutral:** normative router sentences carry `<!-- rule:... -->` markers so behavior tests
can reference them.

## Alternatives Considered

- **Standalone skills only (status quo)** — rejected because runtime skill selection
  degrades as the catalog grows and there is no discovery path for users.
- **Router only, delete standalone skills** — rejected because per-skill installation and
  per-skill eval cases both depend on the standalone layout, and the Agent Skills standard
  favors self-contained skills.
