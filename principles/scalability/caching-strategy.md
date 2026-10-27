---
id: caching-strategy
title: Caching Strategy and Invalidation
category: scalability
sources:
  - name: "Designing Data-Intensive Applications (Martin Kleppmann)"
    url: "https://dataintensive.net/"
  - name: "Caching Best Practices — AWS"
    url: "https://aws.amazon.com/caching/best-practices/"
  - name: "TwoHardThings (Martin Fowler)"
    url: "https://martinfowler.com/bliki/TwoHardThings.html"
  - name: "Anthropic — Prompt caching (Claude Platform documentation, accessed Oct 2026)"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
applies_when:
  scope: [new_build, epic, feature, story]
  scale: [solo, team, enterprise]
  stage: [discovery, refinement, build, maintain]
  domains: [ecommerce, media, financial_services, any_production]
tags: [scalability, performance, caching, latency, distributed-systems, ai-systems, prompt-caching]
---

# Caching Strategy and Invalidation

## Principle
A cache trades correctness guarantees and operational complexity for latency and load reduction. Decide deliberately what is cached, where, for how long, and how it is invalidated — and only add a cache once you have measured the cost it is meant to relieve.

## When This Matters
- A read path is dominated by repeated, identical, expensive computations or queries
- A downstream service has a low rate limit, a high per-call cost, or a latency that exceeds your budget
- Read-to-write ratio is high enough that staleness for the read horizon is acceptable
- You are serving content that is identical for many users (catalog pages, configuration, public profiles) and the working set fits in memory affordably
- A specific endpoint shows up at the top of latency or cost dashboards and the underlying data does not change every request
- The product sends long, mostly repeated prompts to a model (instructions, tool definitions, reference documents) and the provider offers prompt caching, which only hits on an exact repeat of the prompt prefix

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
- For model prompts: is the prompt assembled with stable content first (tool definitions, system instructions, reference material) and volatile content last (timestamps, user input, per-request data)? Does anything volatile, such as the current time or a request ID, sneak into the early part and break every cache hit?
- Who can change tool definitions or system instructions, and does the team treat that change as one that invalidates the prompt cache and raises cost and latency until it warms again?

## What Good Looks Like
- Each cache has a documented purpose, key schema, TTL, and invalidation rule, and a clear answer to "what is this protecting?"
- Cache hit rate, miss rate, eviction rate, and stale-read counts are observable and alerted on
- Application code degrades gracefully when the cache is unavailable — slower, not broken
- Invalidation runs on the same write path as the underlying data change, not as a separate scheduled job that drifts
- TTLs are jittered so a synchronous mass expiry does not stampede the origin
- The cache key includes a version or schema identifier so a deploy that changes the value shape does not return stale-but-parseable garbage
- Prompts are assembled in a fixed order from most stable to least stable, and the stable prefix is byte-identical across requests: same content, same ordering, same serialization
- Prompt-cache hit rate and cached-token counts are tracked per feature, and a drop after a deploy is treated as a regression
- Changes to tool definitions or standing instructions are batched and released deliberately, like any change that empties a cache, rather than tweaked request by request

## What Goes Wrong When You Skip This
- A naive cache returns stale prices, permissions, or feature flags for hours after a change because invalidation was never wired up
- A popular key expires and every front-end instance simultaneously hits the database, taking the database down — a self-inflicted thundering herd
- The cache layer becomes load-bearing infrastructure with no fallback; when Redis goes down, the application dies even though the database is healthy
- A "performance optimization" cache hides a slow query that should have been fixed; the slow query stays slow forever, and a small change to access patterns makes it visible again
- Cache keys collide across deploys because the value shape changed but the key did not — clients deserialize garbage and crash
- A developer adds the current timestamp to the top of the system prompt "for context"; every request now has a unique prefix, the prompt cache never hits, and model cost and latency jump overnight with no change in traffic
- Tool descriptions are generated per request with the tools in a nondeterministic order; the prompt is never byte-identical twice, and the caching the team budgeted for never happens

## Further Reading
Kleppmann discusses caching in the context of consistency models, replication lag, and read-after-write guarantees — essential reading before deciding which staleness rules are acceptable. AWS's caching best-practices page is a practical catalog of patterns and pitfalls; Fowler's *TwoHardThings* is the standing reminder that cache invalidation is hard for a reason. Model providers' prompt caches follow the same rules with a stricter key: Anthropic's prompt-caching documentation states that cache hits require 100% identical prompt segments, that the prefix is built in a fixed order (tool definitions, then system instructions, then messages), that modifying tool definitions invalidates the entire cache, and that static content belongs at the beginning of the prompt.
