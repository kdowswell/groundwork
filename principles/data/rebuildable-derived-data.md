---
id: rebuildable-derived-data
title: Immutable Raw Data, Rebuildable Derived Data
category: data
sources:
  - name: "Designing Data-Intensive Applications, Chapters 10–12 (Martin Kleppmann)"
    url: "https://dataintensive.net/"
  - name: "Apache Airflow — Best Practices"
    url: "https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html"
  - name: "Jay Kreps — Questioning the Lambda Architecture (O'Reilly Radar, 2014)"
    url: "https://www.oreilly.com/radar/questioning-the-lambda-architecture/"
  - name: "Tyler Akidau — Streaming 101: The world beyond batch (O'Reilly, 2015)"
    url: "https://www.oreilly.com/radar/the-world-beyond-batch-streaming-101/"
  - name: "Microsoft Learn — What is the medallion lakehouse architecture? (Azure Databricks)"
    url: "https://learn.microsoft.com/en-us/azure/databricks/lakehouse/medallion"
  - name: "Databricks — What is Medallion Architecture?"
    url: "https://www.databricks.com/glossary/medallion-architecture"
tags: [data, data-platforms, pipelines, medallion, lakehouse, warehouse, backfill, reproducibility, immutability]
applies_when:
  scope: [new_build, epic, feature]
  scale: [team, enterprise]
  stage: [discovery, refinement, build, maintain]
  domains: [data_platforms]
---

# Immutable Raw Data, Rebuildable Derived Data

## Principle
Land source data once, unchanged, in an append-only raw layer, and treat every table built from it as derived data: the output of a deterministic transformation that can be thrown away and recomputed. Cleaned, conformed, and aggregated layers are caches of a function over the raw layer, not records in their own right. When a transformation has a bug or a business rule changes, the fix is to change the code and re-run it over the affected range, not to patch rows in place.

Layered layouts such as the medallion architecture (bronze for raw, silver for cleaned and conformed, gold for consumption-ready) are one common shape of this principle. The layer names don't matter. What matters is that each layer can be rebuilt from the one below it, and the bottom layer is never edited.

## When This Matters
- You are building pipelines that feed a warehouse, lakehouse, BI dashboards, ML features, or data exports to other teams
- Business logic in transformations changes often (metric definitions, attribution rules, deduplication rules) and history has to be restated when it does
- Source systems overwrite or delete their own records, so the copy you took is the only record of what they said at the time
- A transformation bug has to be fixed for past data, not just going forward
- Several consumers want different shapes of the same source data, and each shape should be traceable back to it

## When This Doesn't Matter
- A one-off analysis or exploratory notebook whose output nobody will depend on
- The source system already keeps complete, immutable, queryable history that you can re-read at any time, so a second raw copy adds cost without adding recoverability
- Data volumes or retention rules (for example, a legal duty to delete personal data) make keeping raw data indefinitely impossible; even then, keep it for the longest window the rules allow and design deletion as an explicit, logged step

## Questions the Agent Should Ask
- Where does raw data land, and is anything allowed to update or delete it after it lands? Who has write access to that layer?
- If this transformation had a bug in it for the last three months, what are the exact steps to correct every downstream table? Can you run them today?
- Does each run of the transformation produce the same output for the same input? Does it read the wall clock, call "latest" on an external service, or depend on the order rows arrive in?
- Is the work partitioned so a re-run replaces one partition (a day, an hour, a batch) in full, rather than appending to it?
- Does the logic use event time (when the thing happened) or processing time (when the pipeline saw it)? How are late-arriving records handled, and how far back can a re-run reach?
- How long is raw data retained, and is that window longer than the longest plausible gap between a bug being introduced and being noticed?
- Which tables are hand-edited or patched with one-off fixes? Those edits will be lost on the next rebuild unless they are moved into code or reference data.
- How much does a full rebuild of each layer cost in time and compute, and is that cost known before you need to pay it during an incident?

## What Good Looks Like
- The raw layer is append-only, keeps source data as received (including fields you don't use yet), and records when and from where each batch arrived
- Every derived table is produced by versioned transformation code; there are no manual edits, and corrections that must be manual live in versioned reference data the transformation reads
- Each run targets an explicit partition or time range and overwrites that range completely, so running it twice gives the same result as running it once
- Transformations are deterministic: the run date is passed in as a parameter, not read from the clock, and external lookups are pinned to a snapshot
- Backfills are a routine operation with a documented command, not a project; the team has rebuilt at least one layer from raw and knows how long it takes
- Late-arriving data is handled by a stated policy (re-process the last N partitions, or a watermark with a defined lateness bound) rather than silently dropped
- Lineage from each consumption-ready table back to its raw sources is recorded, so a bad source batch can be traced to every table it touched

## What Goes Wrong When You Skip This
- A deduplication bug inflates revenue for six weeks; the cleaned tables were patched in place over that time, and nobody can say which numbers are original and which were corrected
- A source system purges records after 90 days, and the only copy you kept was already aggregated, so a new metric that needs row-level history can't be computed for the past
- A re-run after a partial failure appends a second copy of the day's data; every downstream total for that day doubles, and it shows up in an executive dashboard first
- A transformation reads the current exchange rate rather than the rate on the transaction date, so re-running last quarter gives different numbers than the original run, and the two reports can't be reconciled
- An analyst fixes a few bad rows by hand in a reporting table; the next scheduled rebuild silently reverts the fix and the bad numbers come back
- Late events for yesterday arrive after yesterday's partition was finalized and are dropped, so daily counts are consistently low by a few percent and nobody knows why

## Further Reading
Kleppmann's chapters on batch processing, stream processing, and "the future of data systems" in *Designing Data-Intensive Applications* make the core distinction between systems of record and derived data, and argue for treating derived datasets as recomputable views. Apache Airflow's best practices turn that into pipeline rules: treat a task like a database transaction that produces the same outcome on every re-run, never compute with the current time or read "the latest" data inside a task, and replace inserts with upserts so a re-run doesn't duplicate rows. Kreps's *Questioning the Lambda Architecture* makes the same argument for streams, with reprocessing done by replaying a retained log through new code. Akidau's *Streaming 101* is the clearest explanation of event time versus processing time and why the difference decides whether a re-run reproduces the original answer. Microsoft's guidance on the medallion architecture describes the bronze layer as appended incrementally and retained so data can be reprocessed and audited, and recommends partition overwrite for batch loads; Databricks' overview adds that tables can be recreated from raw data at any time. The same idea in an operational system is *Event Sourcing*, where the log is the system of record and every read model is a projection; *Idempotency by Design* covers why a re-run must replace rather than append.
