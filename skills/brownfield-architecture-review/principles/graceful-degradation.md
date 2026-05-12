<!-- source: principles/reliability/graceful-degradation.md -->

# Graceful Degradation

## Principle
When a dependency fails, the system should continue serving its core function with reduced capability rather than returning an error for the whole request. Decide in advance which features are critical, which are degradable, and what each one returns when its dependency is gone.

## When This Matters
- Your product has a clear critical path (checkout, login, posting a transaction) that must keep working even when peripheral features cannot
- Failures in optional dependencies (recommendations, personalization, analytics, enrichment) currently surface as full-page errors
- You depend on third-party services whose availability is meaningfully lower than your own SLO
- A single feature taking down the whole experience is a known incident pattern in your post-mortems
- You are designing fallbacks alongside circuit breakers and need to define what "open state" actually returns

## When This Doesn't Matter
- Every feature in the system is genuinely critical — there is nothing meaningful to degrade to
- The product is internal tooling where a clear error is preferable to a partially correct response
- Strong-consistency operations (payments capture, medical record writes) where a degraded answer is worse than a failure

## Questions the Agent Should Ask
- Which user journeys are critical-path, and which features could disappear without breaking the journey?
- For each non-critical dependency: what does the UI show when it is unavailable — a hidden section, a default value, a cached result, a friendly placeholder?
- Are static fallbacks (cached values, defaults) acceptable, or does the domain require the real answer or no answer?
- How stale can cached or pre-computed fallbacks be before they become misleading?
- Does degraded mode need to be visible to the user (a banner, a label) or invisible?
- What signals will tell operators that the system is running in a degraded state, and for how long?
- Will degraded behavior be exercised in tests and game days, or only discovered the first time the dependency fails in production?
- Are you tempted to add a *different* code path that recomputes the same answer another way? That is fallback, not graceful degradation, and it tends to rot — is the simpler static response good enough?

## What Good Looks Like
- The critical path is explicitly identified in design docs and in code (e.g., a "critical" annotation, a separate package, a budget on dependencies)
- Each non-critical integration has a defined fallback value that ships with the code, not invented during an incident
- Degraded mode is observable — a metric, log event, or header makes it obvious when fallbacks are firing
- Tests cover the degraded path; turning a dependency off in a staging environment does not produce 500s
- Product and engineering have agreed in writing what users see in degraded mode (e.g., "no recommendations shown" vs. "show top sellers")

## What Goes Wrong When You Skip This
- A recommendations service outage takes down the entire product detail page, blocking checkout for users who never looked at recommendations
- During an incident, engineers invent ad-hoc fallbacks under pressure that ship with bugs and silently corrupt data
- Cached fallbacks exist but are stale by hours or days, so degraded mode shows wrong prices, inventory, or balances
- The team learns about a critical dependency only when it fails, because nothing distinguished it from optional ones in the architecture
