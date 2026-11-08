# ADR-022: An analytical data model skill, routed as `analytics-model`

**Date:** 2026-11-08
**Status:** Accepted

## Context

ADR-015 added the analytical data platform principles (`rebuildable-derived-data`,
`historical-data-modeling`, `data-quality-gates`) and deferred a skill: "`greenfield-data-model-first`
is written for application data models; extending it to analytical models is separate work."
Implementation-level agent skills for analytics tooling exist (dbt Labs publishes some). Nothing
covers the expensive-to-reverse design decisions above them: layering, grain, history semantics,
quality gates, and backfills.

## Decision

- Add the phase skill `greenfield-analytical-data-model`, separate from `greenfield-data-model-first`.
  Application models and analytical models differ in what is expensive to reverse. An application
  model fixes ownership and consistency. An analytical model fixes grain, history (current vs.
  as-of, valid time vs. record time), and whether derived data can be rebuilt from raw.
- Its steps apply ADR-015's principles plus `data-ownership`, `schema-evolution`, and
  `idempotency-by-design`: sources and contracts, an immutable raw layer with deterministic derived
  layers (medallion is one layout, not the title), grain and keys, history per attribute, quality
  gates that block publishing, idempotent re-runs and backfills, and published contracts. Steps name
  no tools.
- **Command name: `analytics-model`.** It passes the naming test (ADR-016): it says what it produces
  and doesn't collide with `data-model`. `pipeline` was rejected because it reads as CI, and
  `warehouse` because it names one layout.
- The review page recognizes `# Analytical Data Model:` artifacts; lineage visuals reusing the ER
  renderer are follow-up work.

## Consequences

- The router can tell an application data model from an analytical one by the request, and the two
  skills compose: the application model feeds the analytical model's sources.
- Eval cases cover marketing attribution, finance as-of reporting (which must separate valid and
  record time), and a change-data-capture lakehouse.
