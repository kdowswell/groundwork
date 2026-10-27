---
id: graceful-degradation
title: Graceful Degradation
category: reliability
sources:
  - name: "AWS Well-Architected Reliability Pillar — REL05-BP01: Implement graceful degradation"
    url: "https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_mitigate_interaction_failure_graceful_degradation.html"
  - name: "Release It! Second Edition (Michael Nygard)"
    url: "https://pragprog.com/titles/mnee2/release-it-second-edition/"
  - name: "Netflix Technology Blog"
    url: "https://netflixtechblog.com/"
  - name: "Google Cloud Well-Architected Framework — AI and ML perspective: Reliability (reviewed Aug 2025)"
    url: "https://docs.cloud.google.com/architecture/framework/perspectives/ai-ml/reliability"
  - name: "OWASP Top 10:2025 — A10 Mishandling of Exceptional Conditions"
    url: "https://owasp.org/Top10/2025/A10_2025-Mishandling_of_Exceptional_Conditions/"
applies_when:
  scope: [new_build, epic, feature]
  scale: [team, enterprise]
  stage: [discovery, refinement, build]
  domains: [ecommerce, media, financial_services, healthcare, any_production]
tags: [reliability, resilience, user-experience, fallback, critical-path, ai-systems, fail-closed]
---

# Graceful Degradation

## Principle
When a dependency fails, the system should continue serving its core function with reduced capability rather than returning an error for the whole request. Decide in advance which features are critical, which are degradable, and what each one returns when its dependency is gone.

## When This Matters
- Your product has a clear critical path (checkout, login, posting a transaction) that must keep working even when peripheral features cannot
- Failures in optional dependencies (recommendations, personalization, analytics, enrichment) currently surface as full-page errors
- You depend on third-party services whose availability is meaningfully lower than your own SLO
- A single feature taking down the whole experience is a known incident pattern in your post-mortems
- You are designing fallbacks alongside circuit breakers and need to define what "open state" actually returns
- A feature depends on a hosted model whose availability, latency, and rate limits you do not control, and the feature must still do something useful when it is unavailable

## When This Doesn't Matter
- Every feature in the system is genuinely critical — there is nothing meaningful to degrade to
- The product is internal tooling where a clear error is preferable to a partially correct response
- Strong-consistency operations (payments capture, medical record writes) where a degraded answer is worse than a failure
- Security decisions (authentication, authorization, input validation, policy checks): when the component that makes the decision fails, deny rather than degrade

## Questions the Agent Should Ask
- Which user journeys are critical-path, and which features could disappear without breaking the journey?
- For each non-critical dependency: what does the UI show when it is unavailable — a hidden section, a default value, a cached result, a friendly placeholder?
- Are static fallbacks (cached values, defaults) acceptable, or does the domain require the real answer or no answer?
- How stale can cached or pre-computed fallbacks be before they become misleading?
- Does degraded mode need to be visible to the user (a banner, a label) or invisible?
- What signals will tell operators that the system is running in a degraded state, and for how long?
- Will degraded behavior be exercised in tests and game days, or only discovered the first time the dependency fails in production?
- If a model-backed feature fails, what is the chain of fallbacks: a smaller or different model, a cached answer, a deterministic non-AI path, a clear "unavailable" message? Where does the chain stop?
- Has each fallback model been run against the same regression evaluations as the primary for the paths it would serve, or is the first test of its behavior a production outage?
- Which checks in this path protect security or data integrity, and do they fail closed (deny, roll back) when a dependency they rely on is unavailable?
- Are you tempted to add a *different* code path that recomputes the same answer another way? That is fallback, not graceful degradation, and it tends to rot — is the simpler static response good enough?

## What Good Looks Like
- The critical path is explicitly identified in design docs and in code (e.g., a "critical" annotation, a separate package, a budget on dependencies)
- Each non-critical integration has a defined fallback value that ships with the code, not invented during an incident
- Degraded mode is observable — a metric, log event, or header makes it obvious when fallbacks are firing
- Tests cover the degraded path; turning a dependency off in a staging environment does not produce 500s
- Product and engineering have agreed in writing what users see in degraded mode (e.g., "no recommendations shown" vs. "show top sellers")
- Model-backed features have an ordered fallback chain decided in advance (for example: smaller model, then cached answer, then a deterministic rule-based path or a plain message), and each step is observable when it fires
- Every fallback model passes the regression evaluations for the paths it serves before it is allowed in the chain; a different model behaves differently, so an untested fallback is an untested release
- Security-relevant checks fail closed: if a policy service, a content check, or a model-based classifier guarding an action is unavailable, the action is denied and any partial transaction is rolled back, never waved through

## What Goes Wrong When You Skip This
- A recommendations service outage takes down the entire product detail page, blocking checkout for users who never looked at recommendations
- During an incident, engineers invent ad-hoc fallbacks under pressure that ship with bugs and silently corrupt data
- Cached fallbacks exist but are stale by hours or days, so degraded mode shows wrong prices, inventory, or balances
- The team learns about a critical dependency only when it fails, because nothing distinguished it from optional ones in the architecture
- The primary model is rate-limited and traffic fails over to a cheaper model that was never evaluated on this task; it answers confidently and wrongly, which is worse than the "try again later" message it replaced
- A moderation check that calls a model times out, the code treats the timeout as "allowed", and unreviewed content is published for the length of the outage

## Further Reading
The AWS Well-Architected Reliability Pillar (REL05-BP01) draws a sharp distinction between graceful degradation (a static, predetermined response) and fallback (recomputing the answer a different way), and treats the latter as an anti-pattern; that distinction is worth internalizing. Nygard's *Release It!* covers the stability patterns that make degradation possible, including bulkheads and circuit breakers. *Circuit Breakers* describes the mechanism that detects when a dependency is failing and stops calls to it — it is the complement to this principle, answering the question of when to trigger the degraded response that this principle describes. Google Cloud's Well-Architected AI and ML reliability perspective applies degradation to model serving, recommending fallbacks such as simpler models and cached data. The requirement that fallback models pass the same regression evaluations is an inference from treating a model change as a behavior change, not a rule stated by that source. OWASP's A10:2025, Mishandling of Exceptional Conditions, covers the security side: when an error occurs part way through a transaction, roll back every part of it and fail closed, because failing open is how exceptional conditions become vulnerabilities.
