# ADR-005: Deterministic detector CLI in dependency-free ESM

**Date:** 2026-07-24
**Status:** Accepted

## Context

groundwork's skills advise but nothing verifies. Impeccable's highest-leverage component is
a deterministic detector (no LLM, no API key) that runs as a CLI, in CI, and in editor
hooks. groundwork needs the architecture-quality analog: rules that catch production-readiness
gaps and AI-slop code tells, each traceable to a principle.

## Decision

We will ship `npx groundwork` (`detect`, `doctor`, `install`, `update`) implemented in plain
ESM (`cli/**/*.mjs`) with zero runtime dependencies. Every detector rule carries a
`principle` field naming the principle id it enforces, a severity, and a rationale; findings
support inline waivers (`groundwork-disable[-line|-next-line] <rule>: reason`) and
config-based ignores in `.groundwork/config.json`. `--json` output makes it CI-consumable.
Rules are covered by vitest tests with fixtures.

## Consequences

**Positive:** enforcement without token cost; findings link back to the principle library
(which impeccable cannot do — it has no principle layer); `npx` works with no build step.
**Negative:** CLI code is `.mjs`, outside `tsc --noEmit` strict coverage — mitigated by
vitest coverage and JSDoc types.
**Neutral:** regex/posture heuristics will have false positives by design; the waiver
mechanism is the pressure valve, and rules must degrade toward silence when unsure.

## Alternatives Considered

- **TypeScript CLI with a build step** — rejected: adds dist artifacts and publish complexity
  the repo doesn't otherwise need; scripts stay TS via tsx where they are dev-only.
- **LLM-based checks** — rejected for this layer: cost, latency, and non-determinism; LLM
  judgment already lives in the eval harness.
- **Adopt an existing linter framework (ESLint plugin)** — rejected: rules span languages
  and repo-level posture (lockfiles, CI presence, Dockerfiles), not one AST.
