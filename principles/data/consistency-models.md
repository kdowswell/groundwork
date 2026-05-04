---
id: consistency-models
title: Consistency Models
category: data
sources:
  - name: "Designing Data-Intensive Applications, Chapters 5 and 9 (Martin Kleppmann)"
    url: "https://dataintensive.net/"
  - name: "PACELC theorem (Daniel Abadi)"
    url: "https://en.wikipedia.org/wiki/PACELC_theorem"
  - name: "Amazon DynamoDB Read Consistency"
    url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html"
  - name: "Eventual Consistency (Werner Vogels, ACM Queue)"
    url: "https://queue.acm.org/detail.cfm?id=1466448"
tags: [data, consistency, distributed-systems, cap, replication, trade-offs]
applies_when:
  scope: [new_build, epic, feature]
  scale: [team, enterprise]
  stage: [discovery, refinement, build]
  domains: [financial_services, healthcare, ecommerce, any_production]
---

# Consistency Models

## Principle
Pick the weakest consistency model that the use case actually requires, on a per-operation basis. Strong consistency costs latency and availability under partitions; eventual consistency costs developer reasoning and surfaces edge cases users will encounter — neither is a default, and applying one model to every operation in a system is almost always wrong.

## When This Matters
- The system is replicated across nodes, regions, or zones — every replication topology forces a consistency choice, whether stated or not
- Different operations in the same system have different correctness requirements (a balance read vs. a profile-photo read should not get the same treatment)
- The product can tolerate stale reads in some places but absolutely cannot in others, and the boundary between "some" and "others" is not yet explicit
- A managed database (DynamoDB, Cosmos DB, Cassandra, Spanner) is being chosen, and its consistency knobs are about to be set by default rather than by decision
- A team is reaching for a distributed transaction or two-phase commit because eventual consistency "feels risky" — without naming the actual operation that needs strong guarantees

## When This Doesn't Matter
- A single-node system with no replication — consistency is whatever the storage engine gives you and there is no choice to make
- Read-only or append-only workloads where there is no write/read race to reason about
- Prototypes and internal tools where the cost of an occasional stale read is negligible and not worth designing around

## Questions the Agent Should Ask
- For this specific operation, what is the worst real-world outcome of a stale read — a wrong number on a screen, a duplicate charge, an oversold inventory item, an incorrect medical dose?
- Does the user need to see their own writes immediately (read-your-writes), or only eventually — and is that handled by the storage layer or by routing the user back to the primary?
- Is the requirement actually strong consistency (linearizability), or is it really causal consistency, monotonic reads, or read-your-writes? Most "must be consistent" requirements are weaker than linearizable.
- Where is the consistency boundary — which operations in this flow need strong guarantees, and which can be eventually consistent without anyone noticing?
- What does the system do when it cannot achieve the required consistency level — fail closed, fail open, degrade to a weaker model, queue and retry?
- During a network partition, would you rather refuse writes or accept divergent writes and reconcile later — and is that decision documented per data type?
- When eventual consistency is the choice, what is the convergence window in normal operation, and how is it monitored — minutes? milliseconds? unbounded under load?
- Are conflicting concurrent writes possible, and if so what is the resolution strategy — last-write-wins, CRDTs, application-level merge, manual reconciliation?
- For cross-service operations: are you reaching for distributed transactions when a saga, outbox, or idempotent retry would solve the actual requirement?

## What Good Looks Like
- Consistency requirements are decided per operation and documented near the code that implements them, not assumed globally
- Strong-consistency operations have clearly identified critical paths (money movement, inventory decrement, identity changes) and the rest of the system uses cheaper guarantees
- Eventual-consistency surfaces are paired with UX patterns that handle the staleness gracefully — optimistic UI, "saving…" indicators, idempotent retries
- The convergence window for eventually consistent systems is monitored with a real metric, not assumed; alerts fire when replication lag exceeds the agreed window
- Conflict resolution is explicit (LWW with documented clock semantics, CRDT, application-level merge) rather than emergent
- Cross-service "transactions" are implemented with sagas, outboxes, or idempotent retries — distributed transactions are reserved for the rare case where they are genuinely required
- The team can answer, for any given read, whether it might be stale and by how much

## What Goes Wrong When You Skip This
- A user moves money between accounts; the source debit succeeds and the destination read still shows the old balance. Support tickets follow within minutes.
- An inventory system uses eventual consistency for stock counts under heavy promotion load and oversells thousands of units; the postmortem reveals the choice was never explicit
- A profile update is "saved" but the very next page load shows the old value because the read went to a replica that hadn't caught up — users repeatedly re-save and re-edit, suspecting bugs
- A team spends weeks adopting distributed transactions to "fix consistency" for a workflow that an idempotent retry and a saga would have handled in days
- Replication lag silently grows during a busy period; eventually consistent reads become hours stale, and the bug is found by an executive looking at a dashboard rather than by alerting
- Concurrent writes from two regions clobber each other under last-write-wins because clocks were trusted; the conflict policy was never documented and the resulting data loss is irreversible

## Further Reading
Kleppmann's chapters on replication and consistency are the most lucid practical treatment of the spectrum from linearizability through causal to eventual consistency, and of why CAP is too coarse a frame for real decisions. Vogels' *Eventual Consistency* essay is short, foundational, and worth reading specifically because it predates the marketing — it describes the real trade-offs in plain language and is the right thing to hand a developer who thinks "eventual" means "broken."
