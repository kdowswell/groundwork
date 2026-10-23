<!-- source: principles/scalability/caching-strategy.md -->

# Caching Strategy and Invalidation

## Principle
A cache trades correctness guarantees and operational complexity for latency and load reduction. Decide deliberately what is cached, where, for how long, and how it is invalidated — and only add a cache once you have measured the cost it is meant to relieve.

## When This Matters
- A read path is dominated by repeated, identical, expensive computations or queries
- A downstream service has a low rate limit, a high per-call cost, or a latency that exceeds your budget
- Read-to-write ratio is high enough that staleness for the read horizon is acceptable
- You are serving content that is identical for many users (catalog pages, configuration, public profiles) and the working set fits in memory affordably
- A specific endpoint shows up at the top of latency or cost dashboards and the underlying data does not change every request

## When This Doesn't Matter
- Workloads that are write-heavy or where every read must reflect the most recent write
- Data with strict consistency, audit, or compliance requirements where stale reads are unacceptable
- Pre-optimization on a system that is not yet under measurable load — the cache adds bugs and operational surface for no proven benefit

## Questions the Agent Should Ask
- What specific problem is this cache solving — latency, downstream cost, rate limits, contention — and how was that measured?
- What is the acceptable staleness for this data, expressed as a TTL or as an event-driven invalidation rule the team can actually implement?
- Which pattern fits — cache-aside (read-through on miss), read-through (cache fronts the store), write-through (writes go to cache and store), write-behind (writes return early, flush async)?
- How is the cache invalidated when the underlying data changes — TTL only, explicit deletes on writes, event-driven invalidation, or versioned keys?
- What is the failure mode when the cache is unavailable — does the application fall back to the source of truth gracefully, or does it cascade into an outage?
- How is the thundering-herd problem handled when a popular key expires and many requests miss simultaneously — request coalescing, soft TTLs with background refresh, jittered expiry?
- Is this cache layered correctly — browser, CDN, edge, application, database buffer — and are you adding a layer that duplicates one you already have?
- What is the cardinality of cache keys, and is the eviction policy (LRU, LFU, TTL) appropriate for the access pattern?

## What Good Looks Like
- Each cache has a documented purpose, key schema, TTL, and invalidation rule, and a clear answer to "what is this protecting?"
- Cache hit rate, miss rate, eviction rate, and stale-read counts are observable and alerted on
- Application code degrades gracefully when the cache is unavailable — slower, not broken
- Invalidation runs on the same write path as the underlying data change, not as a separate scheduled job that drifts
- TTLs are jittered so a synchronous mass expiry does not stampede the origin
- The cache key includes a version or schema identifier so a deploy that changes the value shape does not return stale-but-parseable garbage

## What Goes Wrong When You Skip This
- A naive cache returns stale prices, permissions, or feature flags for hours after a change because invalidation was never wired up
- A popular key expires and every front-end instance simultaneously hits the database, taking the database down — a self-inflicted thundering herd
- The cache layer becomes load-bearing infrastructure with no fallback; when Redis goes down, the application dies even though the database is healthy
- A "performance optimization" cache hides a slow query that should have been fixed; the slow query stays slow forever, and a small change to access patterns makes it visible again
- Cache keys collide across deploys because the value shape changed but the key did not — clients deserialize garbage and crash
