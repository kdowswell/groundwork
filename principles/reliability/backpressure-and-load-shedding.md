---
id: backpressure-and-load-shedding
title: Backpressure and Load Shedding
category: reliability
sources:
  - name: "Google SRE Book — Chapter 21: Handling Overload"
    url: "https://sre.google/sre-book/handling-overload/"
  - name: "Google SRE Book — Chapter 22: Addressing Cascading Failures"
    url: "https://sre.google/sre-book/addressing-cascading-failures/"
  - name: "Release It! Second Edition (Michael Nygard) — Stability Patterns: Steady State, Fail Fast, Shed Load, Create Back Pressure"
    url: "https://pragprog.com/titles/mnee2/release-it-second-edition/"
applies_when:
  scope: [new_build, epic, feature]
  scale: [team, enterprise]
  stage: [discovery, refinement, build, maintain]
  domains: [ecommerce, financial_services, media, ai_systems, any_production]
tags: [reliability, overload, backpressure, load-shedding, queues, retries, admission-control, cascading-failure, ai-systems]
---

# Backpressure and Load Shedding

## Principle
Decide in advance what the system does when demand exceeds capacity, because it will. Bound every queue, pool, and buffer, and when one is full, push back on the caller instead of accepting work you cannot finish in time. Reject excess requests early and cheaply, at admission, while the system still has the capacity to say no; a quick refusal is better than a slow timeout that has already consumed resources. Shed by priority, so the least important traffic goes first and critical work keeps flowing. Give each request a deadline, pass the remaining time downstream, and drop work whose caller has already given up. Cap retries per request and across the client, back off with jitter, and retry at one layer only, because retries at every layer multiply load on a system that is already struggling. Agent-driven traffic makes all of this more urgent: one task can fan out into dozens of tool and model calls, and an agent's default is to retry until it succeeds.

## When This Matters
- Traffic can spike beyond provisioned capacity: launches, promotions, batch jobs, retry storms after an outage, or a single large customer
- Work passes through queues, worker pools, or connection pools whose size is unbounded or was never chosen deliberately
- Requests have a useful lifetime (a user waiting, a timeout upstream), so work completed after that point is wasted
- Several layers of the call path each retry on failure
- Agents or automated clients generate traffic: parallel tool calls, model calls in loops, or fan-out across many services from one user action
- The system calls a rate-limited dependency, such as a model provider or partner API, whose limit is lower than your peak demand

## When This Doesn't Matter
- Offline batch processing where work can wait indefinitely, the queue is durable, and growth is bounded by the size of the input
- Low-traffic internal tools where peak demand is far below capacity and a slowdown harms no one
- A platform layer (gateway, managed queue, serverless concurrency limit) already enforces limits and you are not adding application-level priority or fallback behavior

## Questions the Agent Should Ask
- What is the capacity of each component, and what happens to a request that arrives when it is full: wait, fail fast, or degrade?
- Which queues, buffers, and pools are unbounded? What is the maximum size of each, and how was that number chosen?
- How does a full component tell its callers to slow down, and do those callers actually slow down?
- Which requests are most important, and does the system shed the least important first when overloaded?
- Does each request carry a deadline, and is the remaining time passed to downstream calls so they can stop early?
- How many layers retry, how many times each, and is there a per-client or per-service retry budget?
- For agent workloads: how many downstream calls can one task generate, and what caps fan-out, concurrency, and total attempts per task?
- What signal triggers shedding (in-flight requests, queue age, utilization), and is it measured locally so it works when monitoring is lagging?
- Has anyone tested the system above its capacity to see whether it degrades gracefully or collapses?

## What Good Looks Like
- Every queue and pool has an explicit maximum, sized to drain within the callers' deadlines, and rejects or signals when full rather than growing until memory runs out
- Overload produces fast, explicit rejections that tell clients to back off; a server at capacity keeps serving what it can instead of falling over
- Requests carry a priority, and the system sheds background and best-effort work before interactive and critical work
- Deadlines propagate through the call tree; servers drop requests whose deadline has passed instead of finishing them for nobody
- Retries are capped per request, backed off with jitter, limited by a client-wide budget, and performed at one layer; clients that see many rejections throttle themselves locally
- Agent tasks run under explicit budgets for concurrency, fan-out, and total attempts, and back off on rate-limit responses rather than retrying immediately
- Each tenant or client has a quota, so one caller's surge is rejected without hurting the others
- Shedding, queue depth, and rejection rates are visible on dashboards, and overload behavior is load-tested

## What Goes Wrong When You Skip This
- An in-memory queue with no limit absorbs a traffic spike, grows until the process runs out of memory, and crashes; restarting drops everything that was queued
- A slow dependency fills the request queue; requests wait longer than the client timeout, so the server spends its capacity on work nobody will read, and goodput falls toward zero while it looks busy
- Three layers each retry three times, so one failing call at the bottom becomes twenty-seven, and a brief brownout turns into a full outage
- An agent hits a model provider's rate limit and retries each of its parallel calls immediately; the retries consume the quota for every other user of the product
- All traffic is treated alike, so a batch export saturates the system and checkout requests time out
- Capacity is lost on one replica, its load shifts to the others, they overload in turn, and the failure cascades across the fleet

## Further Reading
The Google SRE book's "Handling Overload" chapter describes per-customer limits, client-side adaptive throttling based on recent rejections, request criticality that propagates to downstream calls, rejecting on local utilization signals, and per-request and per-client retry budgets with retries at a single layer. "Addressing Cascading Failures" covers keeping queues small so servers reject early, load shedding when in-flight work is too high, alternatives to first-in-first-out queuing that drop requests clients have likely abandoned, deadline propagation, cancellation, and backoff with jitter. Nygard's *Release It!* names the matching stability patterns: Steady State (nothing grows without bound), Fail Fast, Shed Load, and Create Back Pressure. *Circuit Breakers* protect a caller from a sick dependency; this principle protects a service from its callers. *Graceful Degradation* defines the cheaper responses to serve while shedding, and *Async Processing* covers the queues that need these bounds.
