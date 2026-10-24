<!-- source: principles/scalability/data-partitioning.md -->

# Data Partitioning and Sharding

## Principle
Split a dataset across multiple nodes by a chosen key so that storage, throughput, and query load scale beyond what any single node can handle. The key choice and rebalancing strategy determine whether the system scales smoothly or develops hot spots that perform worse than the unpartitioned version.

## When This Matters
- A single primary database is approaching its disk, IOPS, write-throughput, or connection-count ceiling
- Query latency on a large table is dominated by index size or working-set memory pressure rather than CPU
- Compliance requires data to live in specific geographic regions (data residency by tenant or by user)
- A single tenant or single hot key is consuming a disproportionate share of capacity, starving the rest
- You need to scale writes, not just reads — read replicas alone won't help

## When This Doesn't Matter
- Datasets that fit comfortably on one machine and have no projected growth path that would change that
- Read-heavy workloads where read replicas, caching, or a CDN solve the actual bottleneck
- Early-stage products where the partition key would be a guess — premature partitioning locks in a key you can't easily change

## Questions the Agent Should Ask
- What is the access pattern — which fields appear in nearly every query, and which queries are rare or analytical?
- What partition key keeps related data co-located for the dominant query, and does it distribute load evenly across keys?
- Are there obvious hot keys (a few large customers, a single popular product, a handful of celebrity users) that would make any naive sharding scheme degenerate?
- Range partitioning, hash partitioning, or directory-based — what trade-off matches the access pattern (range scans vs. uniform distribution vs. flexible rebalancing)?
- How will cross-partition queries work, and how often will they actually run — joins, aggregates, transactions that span keys?
- What is the rebalancing story — when a node fills up or a tenant grows 10x, how does data move without taking the system down?
- Have you considered partitioning at the application layer (per-tenant database) versus the storage layer (sharded cluster), and which fits the operational team you have?
- What is the secondary-index story — local per-partition indexes, or global indexes with their own consistency model?

## What Good Looks Like
- The partition key is in nearly every query so the planner can route to a single shard rather than scatter-gather
- Load distribution is monitored per-partition; hot partitions are detected before they cause incidents
- Rebalancing is incremental and online — adding capacity does not require a maintenance window
- Cross-partition operations are explicit, rare, and either avoided or handled by a clearly defined coordinator
- The schema and key choice are documented with the access patterns that drove them, so future changes can be evaluated against original intent
- Tests include realistic data skew, not just uniform synthetic data — hot tenants are exercised in load tests

## What Goes Wrong When You Skip This
- A single hot tenant grows until they exceed one shard's capacity, and the team discovers there is no online way to split that tenant across shards
- A "uniform" hash function produces hot partitions because the real-world distribution is power-law, not uniform — one shard runs at 95% CPU while others sit at 5%
- Cross-partition transactions are added late, accumulate over time, and quietly become the system's scaling ceiling
- A partition-key change is needed but every client query, every dashboard, and every batch job has hard-coded the original assumption
- Rebalancing is a manual, multi-day operation with downtime, so capacity is added reactively after the system is already failing
