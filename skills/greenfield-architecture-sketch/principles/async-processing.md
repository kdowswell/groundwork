<!-- source: principles/scalability/async-processing.md -->

# Asynchronous Processing and Decoupling

## Principle
Move work that does not need to complete inside a user's request to a queue, event bus, or background worker. Producers emit work without waiting for it to be processed; consumers process at their own pace, with retries and isolation that synchronous request paths cannot provide.

## When This Matters
- A user-facing endpoint does work the user does not need to see immediately — sending email, generating a report, calling a slow third-party API, indexing for search
- Throughput requirements exceed what synchronous processing can sustain, especially during spikes
- A downstream system is unreliable, rate-limited, or sometimes slow, and you need to absorb load without exposing that to callers
- The work fans out to multiple consumers (notifications, audit logging, search indexing, analytics) and you do not want producers coupled to that list
- Failures in non-critical work (an analytics event, a CRM sync) must not fail the user-facing transaction
- The work is a model generation or agent run that can take seconds to many minutes, longer than a synchronous request should be held open

## When This Doesn't Matter
- The user is waiting on the result of the work — there is no useful response without it
- Strict end-to-end transactional guarantees are required across producer and consumer and a single database transaction would suffice
- Volume is low enough that the operational cost of running and monitoring a queue exceeds the benefit

## Questions the Agent Should Ask
- What does the user actually need to see by the time the response returns, and what can complete after?
- What are the delivery semantics this work requires — at-least-once with idempotent handlers, exactly-once via transactional outbox, at-most-once where loss is tolerable?
- Are consumers idempotent — will processing the same message twice produce the same result, or will it double-charge, double-send, double-create?
- What is the failure handling story — retries with backoff, dead-letter queue, manual replay, alerting on DLQ depth?
- Does ordering matter — globally, per-key, or not at all — and does the chosen broker actually provide the ordering you assume?
- How is poison-message handling configured — what stops a malformed message from looping forever and consuming the worker pool?
- What is the back-pressure story when consumers fall behind — does the queue grow unboundedly, shed load, or signal the producer to slow down?
- How do you observe end-to-end latency from enqueue to processing, and is queue depth wired into alerting before users notice delays?
- Is a transactional outbox needed to keep the database write and the message publish atomic, or is best-effort publish acceptable for this work?
- For long model generations: should the result be streamed as it is produced, or should the request return a job handle the client polls or subscribes to? What timeout applies to each stage, and what does the user see while waiting?

## What Good Looks Like
- Producers emit a typed message with a stable schema and a correlation ID; consumers are independently deployable and own their own state
- Consumers are idempotent — replays from a DLQ or a broker redelivery are safe by construction, not by hope
- Failed messages land in a dead-letter queue with enough context to diagnose, and DLQ depth is alerted on
- Queue depth, consumer lag, processing latency, and error rate are first-class metrics with clear SLOs
- Schemas evolve with explicit versioning rules — adding a field is safe, removing or renaming requires a migration plan
- The transactional outbox pattern (or equivalent) is used wherever a database write and a message publish must agree
- Long generations are streamed to the client with an explicit timeout on the whole stream and on gaps between chunks; work longer than a request should last becomes a background job with a status the user can return to
- The interaction is designed around waiting: the interface shows progress or partial results, says how long the wait may be, and lets the user leave and come back without losing the result

## What Goes Wrong When You Skip This
- A slow third-party email API holds the request thread; under spike traffic the entire user-facing service stalls because every checkout is waiting on email delivery
- A consumer crashes mid-message and the broker redelivers; the handler was not idempotent, and customers are charged twice
- A message schema change rolls out before consumers are upgraded; messages pile up in a DLQ and the team only notices when the on-call alert fires three days later
- The queue and the database disagree because publish-after-commit silently dropped messages during a node failure — orders exist with no fulfilment events
- A poison message loops forever, occupies every worker, and processes nothing else until a human intervenes
- A report-drafting feature calls a model synchronously inside the request; generations that take ninety seconds hit the gateway timeout, the user retries, and each retry starts and pays for another full generation the user never sees
