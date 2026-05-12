---
id: idempotency-by-design
title: Idempotency by Design
category: design
sources:
  - name: "Stripe Engineering — Idempotency Keys (2020)"
    url: https://stripe.com/blog/idempotency
  - name: "Pat Helland — Idempotence is Not a Medical Condition (ACM Queue, 2012)"
    url: https://queue.acm.org/detail.cfm?id=2187821
  - name: "Gregor Hohpe & Bobby Woolf — Enterprise Integration Patterns (2003)"
    url: https://www.enterpriseintegrationpatterns.com/
applies_when:
  scope: [new_build, epic, feature]
  scale: [solo, team, enterprise]
  stage: [discovery, refinement, build]
  domains: [financial_services, ecommerce, healthcare, logistics, any_production]
tags: [design, distributed-systems, reliability, api-design, message-processing]
---

# Idempotency by Design

## Principle
An operation is idempotent when executing it multiple times produces the same result as executing it once. In distributed systems, retries are not optional — networks time out, clients retry, message queues deliver at least once. Every operation that mutates state will be called multiple times. Design that in from the start: either make the operation naturally idempotent (a PUT that sets absolute state rather than a POST that appends), or attach an idempotency key that lets the system detect and suppress duplicate execution. "Handle it with retries" is not a design — it is a way of discovering the bug in production.

## When This Matters
- Any API endpoint or message handler that mutates state (writes, updates, deletes, payments, sends)
- Systems that use at-least-once message delivery (most queues and event streams deliver at-least-once by default)
- Client-to-server calls over unreliable networks where a timeout leaves the client uncertain whether the server processed the request
- Workflows with retry logic — automated or human — where a second attempt is normal operating behavior, not an error
- Payment, financial, or inventory operations where duplicate execution causes direct harm (double charge, double shipment, double deduction)

## When This Doesn't Matter
- Pure read operations are naturally idempotent; no additional design is needed
- A system using exactly-once delivery with strong transactional guarantees across all parties — rare but occasionally achievable in tightly controlled environments
- Ephemeral or throwaway operations in exploratory code that will not reach production

## Questions the Agent Should Ask
- What is the consequence of this operation executing twice? Is it a double charge, a duplicate record, a duplicate message, or no observable harm?
- Is this operation naturally idempotent — does it set state to an absolute value, or does it increment / append / accumulate?
- If the caller retries after a timeout, can the system tell that it is a retry? What is the mechanism — an idempotency key in the request, a natural business identifier, or a deduplication check?
- How long does the idempotency window need to be? A payment retry is likely within seconds; a reprocessed event may arrive days later.
- Where is the idempotency key stored, and what happens if the store is unavailable?
- Who generates the idempotency key — the caller or the system? (Callers should generate it; systems that generate keys cannot guarantee the caller re-uses the same key on retry.)
- In a message processing pipeline: is the message ID sufficient as an idempotency key, or do you need to derive a key from the business payload?
- What is the observable difference between "this was a duplicate and was suppressed" and "this failed"? The caller needs to be able to tell the difference.

## What Good Looks Like
- Mutation endpoints accept a caller-supplied idempotency key and return the same response on duplicate requests within the window — including the original success response when the original succeeded
- Naturally non-idempotent operations (increment a balance, append to a log) are isolated behind a thin idempotent wrapper that checks for prior execution before applying the change
- Message processors record the message identifier in a deduplication store before committing the side effect, so redelivered messages are detected and suppressed
- The idempotency mechanism is tested explicitly: tests deliver the same message or request twice and assert that the side effect occurs once
- Idempotency windows are explicit in design documentation — "this operation is idempotent for 24 hours" — so clients know when a retry is no longer safe
- Duplicate suppression is observable: a metric, log line, or response field indicates that a request was a duplicate so operators can detect misconfigured retry loops

## What Goes Wrong When You Skip This
- A payment API times out after the charge succeeds; the client retries; the customer is charged twice. Recovery requires manual reconciliation and a refund, and customers lose trust
- A queue redelivers a message after a consumer crash; the consumer processes it again; a shipment is sent twice or an inventory count is decremented twice
- A retry loop in a client amplifies a temporary slowdown into a duplicate-write storm that corrupts a database table
- An "upload and process" flow is retried after a partial failure; the file is processed from the beginning and duplicate records are created that are indistinguishable from originals
- Engineers discover the idempotency gap only during a payment incident at scale, and the fix requires a migration of historical records to deduplicate

## Further Reading
Stripe's engineering post on idempotency keys is the most concrete practical guide: it covers key generation, storage, locking, and expiry with production battle-tested patterns. Pat Helland's *Idempotence is Not a Medical Condition* explains the theoretical underpinning and why exactly-once delivery is a stronger guarantee than most systems can provide. Enterprise Integration Patterns (Hohpe & Woolf) covers the Idempotent Receiver pattern in the context of messaging systems with durable semantics.
