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
  - name: "Google Cloud Well-Architected Framework — AI and ML perspective: Reliability (reviewed Aug 2025)"
    url: "https://docs.cloud.google.com/architecture/framework/perspectives/ai-ml/reliability"
  - name: "OWASP Top 10 for Agentic Applications for 2026 (ASI07 Insecure Inter-Agent Communication, ASI08 Cascading Failures)"
    url: "https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/"
applies_when:
  scope: [new_build, epic, feature]
  scale: [team, enterprise]
  stage: [discovery, refinement, build]
  domains: [financial_services, healthcare, ecommerce, any_production]
tags: [reliability, resilience, fault-tolerance, integration, distributed-systems, ai-systems, model-providers]
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
- The product calls a hosted model: model providers throttle, run out of quota, and slow down under load, and a single long generation can hold a connection for tens of seconds
- Agents call other agents or tools in chains, so one misbehaving component can push bad output or retry load through every component downstream of it

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
- For a model dependency: does the breaker trip on rate-limit and quota-exhaustion responses and on latency, not only on errors? A provider that answers every request in forty seconds is failing even if nothing returns an error
- Where agents hand work to other agents, is there a breaker at each hand-off that stops a failing or looping agent from flooding the next one?

## What Good Looks Like
- Every remote call has an explicit, finite timeout shorter than the upstream caller's budget
- Breakers expose state changes (closed → open → half-open) as metrics and structured log events
- Open-state behavior is defined per call site — the agent and developer have agreed what a fallback returns
- Half-open probes are rate-limited so a recovering dependency is not flooded the moment it comes back
- Breaker thresholds are tuned to the dependency's actual error profile, not copy-pasted defaults
- A tripped breaker raises an alert that points to a runbook, not just a generic "errors increased"
- Breakers on model calls use thresholds on error rate, latency, and rate-limit or quota responses; quota exhaustion opens the breaker until the quota window resets rather than retrying into it
- Each agent-to-agent and agent-to-tool hand-off has its own breaker and call budget, so a looping or failing agent is cut off at its boundary instead of cascading through the pipeline

## What Goes Wrong When You Skip This
- A single slow downstream API consumes every worker thread; unrelated endpoints stop responding even though they have no dependency on the failing service
- Retry storms hammer a dependency that is already struggling, turning a brownout into a full outage
- Recovery is slower than necessary because every instance simultaneously rushes the recovering service the moment it returns
- Incident responders cannot tell which dependency is the root cause because every request looks like a generic timeout
- A model provider starts throttling; every request retries into the rate limit, burning the remaining quota and holding user requests open until they time out, when an open breaker would have served the fallback within milliseconds
- An upstream agent starts emitting malformed plans after a bad deploy; downstream agents act on each one in turn, and the fault spreads through the whole pipeline because nothing at the hand-offs stopped it

## Further Reading
Nygard's *Release It!* introduces the pattern and is the canonical treatment, including stability anti-patterns that motivate it. The Azure Architecture Center entry covers state-machine semantics, half-open probing, and trade-offs with retries and service-mesh implementations. Circuit breakers are a detection and trip mechanism — *Graceful Degradation* is the companion principle that defines what the caller should return when the breaker is open; the two are designed to be applied together. Google Cloud's Well-Architected AI and ML reliability perspective applies the pattern to model serving, recommending breaker thresholds based on workload metrics such as error rates and latency, and rate limits and usage quotas to protect backends. The OWASP Top 10 for Agentic Applications lists cascading failures (ASI08) and insecure inter-agent communication (ASI07) among the main risks of multi-agent systems, which is the case for placing breakers between agents as well as in front of external services.
