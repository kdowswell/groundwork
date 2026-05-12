---
id: circuit-breakers
title: Circuit Breakers for External Dependencies
category: reliability
sources:
  - name: "Release It! Second Edition (Michael Nygard)"
    url: "https://pragprog.com/titles/mnee2/release-it-second-edition/"
  - name: "Circuit Breaker Pattern — Azure Architecture Center"
    url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker"
  - name: "Polly resilience library documentation"
    url: "https://www.pollydocs.org/strategies/circuit-breaker.html"
applies_when:
  scope: [new_build, epic, feature]
  scale: [team, enterprise]
  stage: [discovery, refinement, build]
  domains: [financial_services, healthcare, ecommerce, any_production]
tags: [reliability, resilience, fault-tolerance, integration, distributed-systems]
---

# Circuit Breakers for External Dependencies

## Principle
Wrap calls to remote services in a state machine that stops calling them once failures cross a threshold, fails fast for a cooldown period, then tentatively probes for recovery. The goal is to protect the caller from a sick dependency, not to fix the dependency.

## When This Matters
- You make synchronous calls to a service you do not control (third-party API, partner system, internal service owned by another team)
- A downstream dependency can become slow rather than fail outright, holding threads or connections open
- One slow dependency could exhaust a thread pool, connection pool, or async runtime and take down unrelated request paths
- You serve user-facing traffic with latency budgets that cannot tolerate dependency timeouts piling up
- You have already added retries — retries amplify load on a failing system and need a stop condition

## When This Doesn't Matter
- The call is in-process or to a local resource (in-memory cache, embedded database) where there is no network failure mode
- The architecture is event-driven with dead-letter queues — failure isolation already exists at the message layer
- A platform layer (service mesh, API gateway) is already terminating circuit breakers for you and you are not adding application-specific fallback logic

## Questions the Agent Should Ask
- Which outbound calls cross a network boundary, and which of those is on a user-facing critical path?
- What is the timeout for each remote call, and is it shorter than the caller's overall request budget?
- What failure rate over what window should trip the breaker — and how was that threshold chosen?
- When the breaker is open, what does the caller return: an error, a cached value, a default, a degraded response?
- How long should the breaker stay open before allowing a probe request, and how many probes constitute "recovered"?
- Should the breaker be per-instance, per-host, or shared across instances — and how is state observed across the fleet?
- How will you know in production when a breaker trips, and is that signal wired into alerting?
- Are different failure types (timeout vs. 5xx vs. 429) treated the same, or do some count more heavily toward tripping?

## What Good Looks Like
- Every remote call has an explicit, finite timeout shorter than the upstream caller's budget
- Breakers expose state changes (closed → open → half-open) as metrics and structured log events
- Open-state behavior is defined per call site — the agent and developer have agreed what a fallback returns
- Half-open probes are rate-limited so a recovering dependency is not flooded the moment it comes back
- Breaker thresholds are tuned to the dependency's actual error profile, not copy-pasted defaults
- A tripped breaker raises an alert that points to a runbook, not just a generic "errors increased"

## What Goes Wrong When You Skip This
- A single slow downstream API consumes every worker thread; unrelated endpoints stop responding even though they have no dependency on the failing service
- Retry storms hammer a dependency that is already struggling, turning a brownout into a full outage
- Recovery is slower than necessary because every instance simultaneously rushes the recovering service the moment it returns
- Incident responders cannot tell which dependency is the root cause because every request looks like a generic timeout

## Further Reading
Nygard's *Release It!* introduces the pattern and is the canonical treatment, including stability anti-patterns that motivate it. The Azure Architecture Center entry covers state-machine semantics, half-open probing, and trade-offs with retries and service-mesh implementations. Circuit breakers are a detection and trip mechanism — *Graceful Degradation* is the companion principle that defines what the caller should return when the breaker is open; the two are designed to be applied together.
