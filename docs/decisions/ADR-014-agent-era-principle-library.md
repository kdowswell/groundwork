# ADR-014: Extend the principle library for the agent era inside the existing eight categories

**Date:** 2026-10-27
**Status:** Accepted

## Context

An audit of the 40-principle library against guidance published from October 2025 to October 2026
found a blind spot. The library had nothing for systems where a model chooses actions, and nothing
for codebases where agents write much of the change. Its one AI principle, `ml-ai-observability`,
was sourced entirely from 2022 MLOps material. Over the same period, the frameworks the library
already distills published agent-specific guidance: AWS Well-Architected added AI lenses (Nov
2025), OWASP published a Top 10 for Agentic Applications (Dec 2025), the UK NCSC wrote that prompt
injection "may never be totally mitigated" (Dec 2025), the Five Eyes cyber security agencies issued
joint agentic AI guidance (May 2026), and the Thoughtworks Technology Radar Vol. 34 (Apr 2026)
centred on constraining coding agents.

The audit's research covered framework updates, AI and agent security, LLM and agent architecture,
and agent-era development practice. Its report proposed about 25 candidate principles, merged by
de-duplication into ten, plus updates to 27 existing principles.

## Decision

- **No new category.** The ten new principles sit in the existing eight categories, because most
  agent-era change extends a principle the library already has (zero trust, least privilege,
  idempotency, canary releases, FinOps, testing).
  - security: `prompt-injection-containment`, `least-agency`
  - delivery: `executable-architecture-guardrails`, `eval-driven-development`,
    `model-as-versioned-dependency`
  - design: `deterministic-core-probabilistic-edge`, `context-engineering`,
    `agent-legible-codebase`, `simplest-agent-architecture-first`
  - reliability: `durable-agent-execution`
- **27 existing principles updated** additively, keeping their content and sources:
  `zero-trust`, `least-privilege`, `secrets-management`, `data-classification`,
  `supply-chain-security`, `fault-isolation`, `ml-ai-observability` (rewritten and re-sourced),
  `distributed-tracing`, `structured-logging`, `slo-error-budgets`, `testing-strategy`,
  `ci-cd-pipeline`, `blue-green-canary`, `feature-flags`, `circuit-breakers`,
  `graceful-degradation`, `idempotency-by-design`, `api-contract-first`, `separation-of-concerns`,
  `event-sourcing`, `schema-evolution`, `caching-strategy`, `async-processing`,
  `capacity-planning`, `finops-cost-visibility`, `tech-debt-management`,
  `conways-law-organizational-alignment`.
- **Selection keeps AI-builder principles out of projects that don't build AI.** Principles that
  only apply to products embedding LLMs or agents use the domain value `ai_systems`. Three
  signals in principle selection make them mandatory only when they fire:
  - `ai_system` (the product embeds LLM or agent features): prompt-injection containment, least
    agency, eval-driven development, deterministic core, model as a versioned dependency, and AI
    observability;
  - `autonomous_agents` (agents choose their own steps, run long, or delegate): simplest agent
    architecture first, durable agent execution, context engineering; kept separate so the
    `ai_system` set stays under the selection skill's cap of eight;
  - `agent_authored_code` (agents write a meaningful share of long-lived code): executable
    architecture guardrails, supply chain security, agent-legible codebase.
- **Primary sources only.** Every figure and quote was checked at its primary source before it was
  cited. Where secondary coverage disagreed with the primary (package-hallucination rates, GitClear
  duplication figures, a context-file study's venue and wording), the primary's numbers were used;
  claims that couldn't be traced to a primary were dropped or stated as inference.
- **Folded, not added:** the proposed `agent-facing-tool-design` became a section of
  `api-contract-first`, since a tool schema is a contract whose consumer happens to be a model.
- **Declined:** `responsible-ai-by-design`. Its sources (the AWS Responsible AI Lens, the NIST AI
  RMF) are official, but its content is mostly governance (fairness, veracity, transparency
  programs) rather than architecture, and the sources disagree on its basic structure (eight
  versus ten dimensions). Its architectural parts are covered by `least-agency` (human override,
  bounded autonomy) and `eval-driven-development` (quality and safety thresholds).
- **Left unchanged:** `infrastructure-as-code`, `chaos-engineering`, `health-checks`,
  `horizontal-scaling`, `data-partitioning`, `consistency-models`, `data-ownership`,
  `bounded-contexts`, `fallacies-of-distributed-computing`, `field-first`, `alerting-strategy`,
  `incident-response`, and `runbooks`. The research found no agent-era sources for them; adding
  speculative AI sections would dilute principles that are still correct.

## Consequences

**Positive:** the library now covers the systems and the development practice its users are
actually working in, with citations a reader can check. Projects that don't build AI features see
no new mandatory principles from it, apart from the guardrail and supply-chain principles that
apply to any agent-written codebase.
**Negative:** 50 principles is more to keep current, and agent-era guidance moves quickly: several
sources are vendor engineering posts and a 2026 preprint, not standards. The OpenTelemetry GenAI
conventions are still in Development status. These principles need re-checking on a shorter cycle
than the classic ones.
**Neutral:** groundwork's own `.groundwork/context.md` adopts three of the new principles
(`executable-architecture-guardrails`, `eval-driven-development`, `agent-legible-codebase`),
because groundwork is itself largely agent-written and ships prompts gated by evals.

## Alternatives Considered

- **A new `ai/` category:** rejected. It would separate agent-era guidance from the principles it
  extends, so a reader of `zero-trust` would never see that agents are principals too.
- **Add every candidate the research proposed:** rejected. About 25 candidates overlapped heavily;
  merging them kept each principle to one concept, as the content standards require.
- **Update existing principles only:** rejected. Prompt injection, autonomy limits, evals, and
  context budgets have no existing principle to extend without changing what that principle is
  about.
