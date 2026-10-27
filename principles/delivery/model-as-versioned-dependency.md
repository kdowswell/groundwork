---
id: model-as-versioned-dependency
title: Model as a Versioned Dependency
category: delivery
sources:
  - name: "Anthropic — Model deprecations (lifecycle, notice period, parameter removals; accessed Oct 2026)"
    url: "https://platform.claude.com/docs/en/about-claude/model-deprecations"
  - name: "Anthropic — Scaling Managed Agents: Decoupling the brain from the hands (Apr 2026)"
    url: "https://anthropic.com/engineering/managed-agents"
  - name: "Anthropic — Demystifying evals for AI agents (Jan 2026)"
    url: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents"
  - name: "Microsoft Azure Well-Architected Framework — Design principles for AI workloads (updated Apr 2026)"
    url: "https://learn.microsoft.com/en-us/azure/well-architected/ai/design-principles"
applies_when:
  scope: [new_build, epic, feature]
  scale: [solo, team, enterprise]
  stage: [refinement, build, maintain]
  domains: [ai_systems]
tags: [delivery, llm, model-lifecycle, versioning, deprecation, migration, dependencies]
---

# Model as a Versioned Dependency

## Principle
A hosted model is an external dependency that its provider will change and eventually retire on its own schedule, not yours. Pin an explicit model version rather than an alias that moves. Treat the model id, the prompts written for it, the tool definitions it calls, and the harness settings around it as one versioned unit of behavior, because changing any one of them changes what the product does. Every change to that unit, including a model upgrade you did not ask for, goes through the regression evals before it reaches users. When the model changes, re-examine the workarounds the harness contains for the old model's weaknesses: some will have become unnecessary, and some will now get in the way. Plan migrations as recurring work that has to finish inside the provider's deprecation window.

## When This Matters
- A product feature calls a hosted model, and that feature has to keep working for longer than a few months
- Configuration refers to the model through a "latest" alias, or the model id is hard-coded in several places
- Prompts, tool schemas, and model choice are edited in different places by different people, with no record of which combination is in production
- The provider has announced a deprecation, or a newer model is available and someone wants to switch
- The harness contains logic that exists only to compensate for a model's habits (context resets, extra retries, output repair, reminder prompts)

## When This Doesn't Matter
- A one-off script or analysis run once against whatever model is current, where reproducing the exact result later does not matter
- A prototype whose purpose is to compare models; pinning comes once you have picked one
- Self-hosted model weights that you control end to end; the versioning discipline still applies, but there is no external retirement schedule forcing the timing

## Questions the Agent Should Ask
- Which exact model version does each feature call? Is it pinned, or resolved through an alias the provider can repoint?
- Where are the model id, prompts, tool schemas, and harness settings defined? Can you name the single version of all four that is running in production right now?
- What is this model's lifecycle status with the provider, what replacement does the provider recommend, and when is the retirement date?
- Which regression evals must pass before a new model or prompt version is promoted? Have they been run against the replacement model yet?
- Which parts of the harness exist to work around a specific model's limitations? Has each been re-tested with and without the workaround on the new model?
- Does the system record which model version actually served each request, so a quality change can be traced to a model change?
- If the provider is hosted on several platforms, which platform are you on, and does that platform follow the same retirement schedule?
- Which request parameters does the code send, and are any of them deprecated or removed in newer API versions?

## What Good Looks Like
- Each feature names a pinned model version in one place; aliases that move are not used in production configuration
- A "behavior version" bundles model id, prompt templates, tool schemas, and harness settings; changing any of them produces a new behavior version that is reviewed, evaluated, and deployed like code
- Model upgrades run through the same path as any other change: regression evals, then a canary or side-by-side comparison, then promotion, with the previous behavior version available for rollback
- Each harness workaround is labelled with the model behavior it compensates for, and is re-tested whenever the model changes; workarounds the new model no longer needs are removed
- Deprecation notices are tracked like security advisories: someone owns the migration, and it is scheduled to finish well before the retirement date
- Every request's trace records the model version that actually served it, so a shift in quality or cost can be lined up against a model change
- Migrating to a new model is a routine, rehearsed task with a checklist, not an emergency each time

## What Goes Wrong When You Skip This
- Requests start failing on the retirement date because nobody owned the deprecation notice; the migration is done under incident pressure, with no time to evaluate the replacement
- A feature calls a moving alias; the provider repoints it to a newer model, output formatting changes slightly, and a parser downstream fails for a fraction of requests with no deploy on your side to explain it
- A prompt tuned for one model is reused unchanged on its successor; quality drops on cases nobody re-tested, and it is weeks before anyone connects the drop to the upgrade
- A harness keeps a workaround the new model no longer needs; it adds latency and cost and, in some cases, makes results worse, and nobody remembers why it exists
- A model is upgraded while the prompt and tool schemas are changed in the same release; quality moves, and nobody can tell which of the three changes caused it
- An upgrade to a newer API version removes a request parameter the code still sends, and every call returns an error

## Further Reading
Anthropic's model deprecations page documents a typical provider lifecycle (active, legacy, deprecated with an assigned retirement date, and retired, after which requests fail), commits to at least 60 days' notice before retiring a publicly released model, warns that deprecated models are likely to be less reliable than active ones, and advises testing applications with newer models well before the retirement date. Its deprecation history shows retirements following notice by a few months, and that partner-operated platforms set their own schedules. The same page records request parameters removed in a new API version, a reminder that the API surface changes along with the models. Anthropic's post on Managed Agents explains that harnesses encode assumptions about what a model cannot do on its own, and that those assumptions need frequent re-questioning: a context-reset workaround needed for one model became dead weight on its successor. Anthropic's evals guidance places evals in CI on every agent change and model upgrade. Azure's AI design principles call for automating the detection of model decay and for safe deployments that test a model against targets and quality standards before release. See *Eval-Driven Development* for the gate itself and *Schema Evolution and Compatibility* for the API-surface side.
