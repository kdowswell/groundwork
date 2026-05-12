---
id: fault-isolation
title: Fault Isolation and Blast Radius
category: reliability
sources:
  - name: AWS Well-Architected Framework — Reliability Pillar
    url: https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/
  - name: Release It! (Michael Nygard)
    url: https://pragprog.com/titles/mnee2/release-it-second-edition/
applies_when:
  scope: [new_build, epic]
  scale: [team, enterprise]
  stage: [discovery, refinement, build]
  domains: [financial_services, healthcare, any_production]
tags: [reliability, resilience, microservices, distributed-systems]
---

# Fault Isolation and Blast Radius

## Principle
A failure in one component should not cascade to unrelated components. Design system boundaries so that the "blast radius" of any single failure is contained and predictable.

## When This Matters
- You are designing service boundaries or decomposing a monolith
- Your system has components with different availability requirements
- You are integrating with third-party services or APIs you don't control
- Multiple teams will own different parts of the system

## When This Doesn't Matter
- Single-user tools or prototypes where downtime is acceptable and cascading failure has no consequence
- Monolithic applications with a single deployment unit where isolation is a code-organization concern, not an architectural one — structural patterns like modules and packages provide the equivalent discipline
- Event-driven architectures with dead-letter queues and per-message processing — the message layer already contains failures to individual messages; application-level blast-radius management is handled by queue semantics
- Serverless functions or short-lived containers invoked by a platform — each invocation is isolated by the runtime; architectural blast-radius design is still required at the service boundary level, but within the function, isolation is provided
- When a service mesh or sidecar already enforces timeout and circuit-breaker policies at the infrastructure layer and the work is designing a single application behind it — though you should still understand and intentionally configure what the mesh is doing on your behalf

## Questions the Agent Should Ask
- What happens to the rest of the system if this component goes down?
- Are there shared resources (databases, queues, caches) that create coupling between components?
- What is the acceptable blast radius for this failure mode?
- Do you have circuit breakers or bulkheads at integration boundaries?
- Have you identified your critical path vs. degradable functionality?

## What Good Looks Like
- Each service owns its data store — no shared databases across service boundaries
- Circuit breakers protect calls to external dependencies
- Async communication (queues, events) preferred over synchronous chains for non-critical paths
- Health checks and readiness probes are granular per component, not system-wide
- Failure modes are documented and tested (chaos engineering, fault injection)

## What Goes Wrong When You Skip This
- A single database connection pool exhaustion takes down every service
- A slow third-party API causes cascading timeouts across your entire request chain
- A deployment to one service breaks unrelated functionality because of hidden coupling
- Incident response is slow because blast radius is unknown

## Further Reading
Nygard's *Release It!* is the foundational text for stability patterns including bulkheads, timeouts, and failure-mode design — the stability anti-patterns chapter explains the mechanics of how coupling becomes a blast-radius problem. The [AWS Well-Architected Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/) (REL10) covers cell-based architectures, availability zone isolation, and shuffle sharding as mechanisms for controlling blast radius in cloud deployments. The paper [Crash-Only Software](https://www.usenix.org/legacy/events/hotos03/tech/full_papers/candea/candea.pdf) (Candea & Fox, 2003) articulates why designing for clean, bounded failure is preferable to defensive recovery — a useful framing for why isolation is a design property rather than a safety net. *Circuit Breakers* describes the companion mechanism that detects dependency failures early and stops them propagating; *Graceful Degradation* describes what the system should return once isolation has contained a failure.
