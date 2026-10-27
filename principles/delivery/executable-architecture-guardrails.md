---
id: executable-architecture-guardrails
title: Executable Architecture Guardrails
category: delivery
sources:
  - name: "Ford, Parsons, Kua & Sadalage — Building Evolutionary Architectures, 2nd ed. (fitness functions, 2022)"
    url: "https://www.oreilly.com/library/view/building-evolutionary-architectures/9781492097532/"
  - name: "Thoughtworks — What is harness engineering? (Böckeler: guides vs sensors, computational vs inferential controls, 2026)"
    url: "https://www.thoughtworks.com/insights/podcasts/technology-podcasts/what-harness-engineering"
  - name: "Thoughtworks Technology Radar Vol. 34 — themes, incl. constraining coding agents (Apr 2026)"
    url: "https://www.thoughtworks.com/insights/podcasts/technology-podcasts/themes-technology-radar-34"
  - name: "InfoQ — OpenAI's harness engineering: structural tests enforce layering for agent-written code (Feb 2026)"
    url: "https://www.infoq.com/news/2026/02/openai-harness-engineering-codex"
  - name: "Meta — Mutation-Guided LLM-based Test Generation (ACH, 2025)"
    url: "https://www.arxiv.org/abs/2501.12862"
applies_when:
  scope: [new_build, epic, feature]
  scale: [solo, team, enterprise]
  stage: [refinement, build, maintain]
  domains: [any_production]
tags: [delivery, fitness-functions, guardrails, ai-assisted-development, architecture-conformance, feedback-loops]
---

# Executable Architecture Guardrails

## Principle
Every architectural rule that can be stated precisely — dependency direction, layering, forbidden couplings, module ownership, size and complexity budgets, allowed dependencies — should exist as a fast, deterministic check, not only as prose. Run those checks where the code is written (inside an agent's edit loop or a developer's editor) and again in the pipeline, so a violation is caught in seconds by the author rather than in review by someone else. Reserve human and model review for what cannot be stated precisely: intent, trade-offs, naming, whether the design fits the problem. When most code is generated, the rules nobody encoded are the ones that erode first, because a model reproduces the patterns it sees and has no memory of the decision behind them.

## When This Matters
- AI coding agents write a meaningful share of the changes, so code volume outpaces review attention
- The architecture depends on boundaries that are easy to cross by accident: layers, bounded contexts, a domain core that must not import infrastructure
- A decision recorded in an ADR or spec has been violated more than once by code that "worked"
- Several teams or agents change the same codebase, so no single reviewer holds the whole design in mind
- Review comments keep repeating the same mechanical feedback ("don't call the database from the handler", "this module may not depend on that one")

## When This Doesn't Matter
- Prototypes and spikes whose code will be thrown away; constraining them slows learning for no lasting benefit
- Small single-module codebases where the whole design fits in one person's head and the rules would only restate the obvious
- Rules that cannot be stated precisely ("keep it simple", "use good names"): encoding them as brittle heuristics produces noise that teaches people and agents to ignore the checks

## Questions the Agent Should Ask
- Which architectural decisions in this system can be expressed as a check that passes or fails without judgement? Which ADRs or spec constraints have one today?
- Where does the check run: in the author's loop (editor, agent hook, pre-commit), in CI, or only in review? How long does it take to report?
- When a check fails, does the message say what rule was broken, why it exists, and how to fix it — so an agent can self-correct without a human?
- Which repeated review comments could become checks, freeing review for questions of intent?
- How is a legitimate exception recorded (a waiver with a reason, a decision record), so the check stays trusted instead of being disabled?
- How do you know the checks themselves work? For tests in particular, would a deliberately introduced fault be caught?

## What Good Looks Like
- Each precise architectural rule has a named, versioned check that runs in under a few seconds and in the pipeline; the check links to the decision it enforces
- Failures are written for the author who will fix them, human or agent: the rule, the reason, and the expected change, in one message
- The author's loop runs the fast checks automatically after each change, so violations are fixed before review instead of flagged in it
- Waivers are explicit, local, and carry a reason; a rising waiver count is reviewed as a signal the rule or the architecture needs revisiting
- Deterministic checks gate first; human or model review is spent on design intent, and its recurring findings are turned into new checks where they can be
- The test suite is itself checked (mutation testing or an equivalent), because when agents write the code, the tests are the specification and an untested test is no guardrail
- Checks fail closed on the rules that protect safety or data, and stay advisory on conventions, so the strictness matches the cost of a violation

## What Goes Wrong When You Skip This
- An agent asked to "add a quick filter" queries the database from a request handler, matching a pattern it found elsewhere; the layering decision in the ADR is now one more file's worth of precedent for the next change
- Review becomes the only defense, review load grows with generated code volume, and mechanical violations slip through because reviewers are reading for intent
- A heuristic "lint" that guesses at style produces so many false positives that the team disables it, and the precise rules disappear along with the noisy ones
- Tests written by the same agent that wrote the code pass because they assert what the code does rather than what it should do; nothing notices until production
- The architecture described in the docs and the architecture in the code drift apart quietly, and the next design discussion starts from the wrong picture

## Further Reading
*Building Evolutionary Architectures* introduces architectural fitness functions: objective, automated checks of architectural characteristics that run continuously as the system changes. Thoughtworks' work on harness engineering distinguishes guides (feedforward instructions and specs) from sensors (feedback such as tests and linters), and computational controls (deterministic, auditable, for precisely specified rules) from inferential ones (model or human judgement); its Technology Radar Vol. 34 made constraining coding agents a central theme. OpenAI's account of building a large codebase mostly through agents describes structural tests that enforce module layering and documentation rules validated mechanically in CI. Meta's ACH work on mutation-guided test generation shows how to check that tests actually detect faults, which matters more when the same tools write both the code and its tests.
