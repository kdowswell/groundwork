# ADR-015: Add analytical data platform principles, and the test for adding a practice area

**Date:** 2026-10-28
**Status:** Accepted

## Context

The `data/` category covered the data behind an application: who owns a table, how replicas
agree, event logs, and changing a schema safely. It had nothing for analytical data, meaning
pipelines, warehouses and lakehouses, and datasets published for reporting, BI, or ML. A data
practice lead reviewing the library asked whether it should cover that work (medallion
architecture and slowly changing dimensions were the examples), or whether data teams should
fork it.

The question also raised a broader one: how to decide what a practice area adds without the
library turning into a catalog of every discipline's techniques. Principle selection is the part
that bears the load as the library grows. The router reads only the principle ids listed in a
project's context and loads files on demand, so more principles don't make a session heavier.
The selection skill does scan the whole library, though, and caps each signal's mandatory set
at eight.

## Decision

- **The test for adding content from a practice area.** A candidate is added as a principle only
  if it is (1) an architectural decision that is expensive to reverse and that an agent would
  make while building the system, (2) distilled from established, preferably vendor-neutral
  sources, and (3) one concept, independent of any tool. A technique or a vendor-named pattern
  that fails (3) goes inside the principle it serves, as an example.
- **Three new principles in `data/`, no new category:**
  - `rebuildable-derived-data`: immutable raw data, and every derived layer a deterministic,
    re-runnable transformation of it. The medallion architecture is presented as one layout
    of this principle, not its title.
  - `historical-data-modeling`: decide per attribute whether queries need current or as-of
    values, and know valid time from record time. Slowly changing dimension types are the
    techniques, described inside it.
  - `data-quality-gates`: declarative checks at pipeline boundaries that stop bad data before it
    is published, with data contracts and lineage.
- **Two existing principles extended rather than duplicated:** `data-ownership` gains data
  contracts for analytical data products, and `idempotency-by-design` gains pipeline re-runs and
  backfills.
- **Selection keeps these principles out of projects without a data platform.** The new domain
  value `data_platforms` marks them, and a new signal, `analytical_data_platform`, makes five
  principles mandatory only when the product includes pipelines, an analytical store, or
  datasets published for BI or ML: the three new ones plus `data-ownership` and
  `schema-evolution`.
- **No skill changes in this decision.** `greenfield-data-model-first` is written for
  application data models; extending it to analytical models is separate work.

## Consequences

**Positive:** data engineers using groundwork get principles for the decisions that are hardest
to reverse in their work, with checkable sources. Projects without a data platform see no new
mandatory principles. The inclusion test gives the next practice area (mobile, frontend, ML
platform) a precedent to argue against.
**Negative:** 53 principles is more to keep current, and the selection skill's signal table
grows by one row. If several more practice areas are added this way, the single signal table
will become hard to scan, and an opt-in grouping of principles by practice area may be needed.
**Neutral:** some of the sources are vendor material (Databricks on the medallion architecture)
or engineering papers from a single company (Amazon, Google). They are cited for the patterns
they describe, alongside vendor-neutral sources for the principles themselves.

## Alternatives Considered

- **A fork for data teams:** rejected. A fork would lose the selection, sync, validation, and
  eval tooling and drift from changes such as ADR-014, and data concerns overlap heavily with
  principles the library already has (ownership, schema evolution, idempotency, event sourcing).
- **A new `data-platform/` category:** rejected for the reason ADR-014 rejected an `ai/`
  category. It would separate analytical guidance from the principles it extends, so a reader of
  `event-sourcing` would not see that a raw data layer applies the same idea.
- **Principles named after techniques (medallion architecture, SCD types):** rejected. They name
  tools for a decision rather than the decision, and a medallion principle would be one vendor's
  layout presented as general guidance.
- **Separate principles for data contracts, lineage, and pipeline idempotency:** rejected. Each
  is part of an existing or new principle, and splitting them would break the one-concept rule.
