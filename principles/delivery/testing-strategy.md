---
id: testing-strategy
title: Testing Strategy and the Test Pyramid
category: delivery
sources:
  - name: "Martin Fowler — The Practical Test Pyramid"
    url: "https://martinfowler.com/articles/practical-test-pyramid.html"
  - name: "Pact — Contract Testing Documentation"
    url: "https://docs.pact.io/"
  - name: "Google Testing Blog — Just Say No to More End-to-End Tests"
    url: "https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html"
  - name: "DORA — Accelerate: The Science of Lean Software and DevOps (Forsgren, Humble, Kim)"
    url: "https://dora.dev/research/"
applies_when:
  scope: [new_build, epic, feature, story]
  scale: [solo, team, enterprise]
  stage: [discovery, refinement, build, maintain]
  domains: [any_production]
tags: [delivery, testing, quality, contract-testing, ci-cd]
---

# Testing Strategy and the Test Pyramid

## Principle
Test at the lowest level that can catch the failure. Most bugs are unit-level concerns — test them with fast, isolated unit tests that verify behavior, not implementation. Integration bugs belong to integration tests that run against real dependencies in a controlled environment. End-to-end tests verify critical user journeys only, not every code path. The pyramid shape — many unit tests, fewer integration tests, few E2E tests — is a cost model: tests at the base run in milliseconds and are cheap to maintain; tests at the peak run in minutes, are brittle to environment noise, and are expensive to fix. Inverting the pyramid (few unit tests, many E2E tests) produces a test suite that is slow, flaky, and provides feedback too late in the development cycle.

For services that call other services over the network, contract testing verifies that the two sides agree on the API shape without requiring both to be running simultaneously. A consumer defines what it expects; the provider verifies it satisfies that expectation in its own CI pipeline. This shifts integration feedback from a shared environment to each team's development loop.

## When This Matters
- New services or modules are being built and no testing conventions have been established yet
- A CI pipeline takes more than ten minutes because E2E test suites have grown without discipline
- Tests are frequently skipped or treated as optional because they are flaky or environment-dependent
- Services call other services over the network, and integration failures are discovered only in a shared staging environment
- A refactor slowed to a crawl because tests were testing implementation details rather than behavior, breaking on every internal change

## When This Doesn't Matter
- Throwaway prototypes or exploration spikes where the code will not reach production — tests would outlive their usefulness
- One-shot migration scripts that run once against a known state and are then archived
- An existing test suite already has a healthy pyramid shape and the work is an incremental addition to a well-covered area

## Questions the Agent Should Ask
- What does a passing test suite prove? Does it prove user-facing behavior, or does it test implementation details that can change safely during a refactor?
- What is the ratio of unit to integration to E2E tests in the current suite, and how long does the slowest tier take to run?
- For each external service boundary the team owns: is there a contract test that runs without the external service being live?
- What is the feedback loop time from "push code" to "know it is correct" — and is that fast enough that developers actually wait for it?
- Are tests written against behavior contracts (given this input, expect this output) or against method calls and internal sequences?
- How are tests maintained when behavior changes — is there a culture of updating tests, disabling them, or deleting them?
- Which user journeys are covered by E2E tests, and are those the genuinely critical paths, or just the ones that were easy to automate?

## What Good Looks Like
- Unit tests cover observable behavior and outcomes, not method signatures or call sequences — they do not break when internal implementation is safely refactored
- Integration tests use real instances of the dependencies they test (real data store, real cache, real queue) with controlled fixtures — not mocks of external infrastructure
- Contract tests exist at every service boundary the team owns; the consumer defines what it expects, and the provider verifies against all registered consumers before deploying
- E2E tests cover the three to five critical user journeys; adding a new E2E test requires justification proportional to the maintenance cost it will carry
- The CI pipeline runs unit tests first (fast, fail fast), then integration, then E2E — a failure at any stage stops the pipeline
- Flaky tests are treated as bugs: investigated, fixed, or deleted; never disabled with a comment and forgotten

## What Goes Wrong When You Skip This
- The only verification of correctness is an E2E suite that takes 45 minutes to run and fails 20% of the time on infrastructure noise; developers merge without waiting for it and the suite becomes ornamental
- A safe internal refactor touches 200 files because each test file is testing method signatures rather than behavior — the refactor is abandoned as too risky rather than the tests being fixed
- Two services are deployed simultaneously to a shared staging environment for integration verification; the environment is always broken because every team needs a clean environment and everyone shares one
- A client upgrades its dependency on a service and discovers in production that the response schema changed; a consumer-driven contract test would have caught this during the provider's CI build
- An E2E test suite grows to cover every permutation of every feature; it takes an hour, times out in CI, and is eventually removed — taking all signal about critical paths with it

## Further Reading
Fowler's *Practical Test Pyramid* is the foundational treatment of the economics argument — why the shape matters and what each tier should and should not test. Pact's documentation is the most practical introduction to consumer-driven contract testing: it describes the workflow where consumers publish their expectations and providers run those as tests, shifting integration verification out of shared environments. Google's "Just Say No to More End-to-End Tests" makes the operational case for why large E2E suites produce diminishing returns and increasing fragility as the codebase grows. DORA's *Accelerate* research identifies test automation — specifically teams that trust their suite enough to use it as a release gate — as one of the strongest predictors of software delivery performance.
