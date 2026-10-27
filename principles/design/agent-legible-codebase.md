---
id: agent-legible-codebase
title: Agent-Legible Codebase
category: design
sources:
  - name: "Gloaguen et al. — Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents? (arXiv 2602.11988, 2026)"
    url: "https://arxiv.org/abs/2602.11988"
  - name: "Lulla et al. — On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents (arXiv 2601.20404, 2026)"
    url: "https://arxiv.org/abs/2601.20404"
  - name: "OpenSSF — Security-Focused Guide for AI Code Assistant Instructions (2025)"
    url: "https://best.openssf.org/Security-Focused-Guide-for-AI-Code-Assistant-Instructions"
  - name: "InfoQ — OpenAI Introduces Harness Engineering: docs as the agent's source of truth, validated in CI (Feb 2026)"
    url: "https://www.infoq.com/news/2026/02/openai-harness-engineering-codex"
applies_when:
  scope: [new_build, epic, feature]
  scale: [solo, team, enterprise]
  stage: [refinement, build, maintain]
  domains: [any_production]
tags: [design, ai-assisted-development, documentation, context-files, conventions, discoverability]
---

# Agent-Legible Codebase

## Principle
Make a system's intent, boundaries, and conventions discoverable from the repository itself, so that a coding agent (or a new engineer) can find what it needs without being told. Prefer a short entry point that states only what cannot be inferred from the code (non-standard conventions, commands, hard rules) and points to versioned, focused documents: decision records, module maps, contracts. Keep those documents honest by validating them mechanically, so a broken link or a stale rule fails a check instead of misleading the next reader. Do not treat a large standing instruction file as free help. Measured evidence on repository context files is mixed: they cost tokens on every task, and whether they help depends on how small and relevant they are.

## When This Matters
- Coding agents make a meaningful share of changes and start each task without memory of earlier ones
- The codebase has conventions that differ from the defaults of its language or framework, and agents keep "correcting" them back to the defaults
- Architectural boundaries or decisions exist mostly in people's heads or in chat history
- A standing instruction file has grown by accretion: every incident added a paragraph and nothing was ever removed
- Several teams or agents work in the same repository and need the same answer to "where does this go and what must I not break?"

## When This Doesn't Matter
- Small codebases that follow their ecosystem's conventions closely; the code already says what a context file would
- Throwaway prototypes where nobody, human or agent, will return to the code
- Content that a deterministic check already enforces; a rule stated in prose and also enforced by a check only needs the check and a pointer to its reason

## Questions the Agent Should Ask
- What does an agent get wrong here that the code alone does not explain? Is that the content of the entry point, and is everything else in it earning its cost?
- Does the standing context include repository overviews or general advice the agent could infer by reading the code? If so, can it be removed?
- Where are decisions recorded, and can an agent find the reason behind a boundary from the code it is changing?
- Which documented rules can be checked mechanically (dependency direction, required files, link validity), and which are prose that will silently drift?
- When was the instruction file last pruned, and has anyone compared agent results with and without it on real tasks?
- Do directory and module names match the domain concepts, so an agent can predict where a change belongs?

## What Good Looks Like
- A short root entry point lists commands, non-obvious conventions, and hard rules, then links to deeper documents rather than containing them
- Decisions live in versioned records next to the code; module-level notes explain intent and boundaries where they apply, so agents load them only when working there
- Documentation links, required sections, and rule-to-check mappings are validated in the pipeline, so docs fail fast when they drift from the code
- Rules that can be stated precisely are enforced by checks, and the prose only says why; the entry point does not duplicate what a failing check will say
- Standing context is pruned on a schedule, and changes to it are evaluated against real tasks rather than kept because they seem helpful
- Structure carries meaning: names, layering, and module boundaries make the right location for a change predictable

## What Goes Wrong When You Skip This
- An agent asked to add an endpoint reinvents an error format because the house convention exists only in a reviewer's head; review catches it, but the next agent does the same
- A thousand-line instruction file, half of it out of date, is loaded on every task; the agent follows a superseded rule, and every run pays for context that mostly does not apply
- A generated repository overview restates what the code already shows, adds cost to every call, and changes nothing about the agent's results
- A design document says one thing and the code another; nothing checks the link between them, and an agent trusts the document
- Boundaries are implicit, so each agent change crosses one "just this once", and the structure decays at the speed of generation

## Further Reading
Two 2026 studies reach different conclusions about repository context files, and they measure different things. Gloaguen et al. evaluated coding agents on benchmark tasks and on issues from repositories with developer-written context files: context files did not generally improve task success and raised inference cost by over 20%; LLM-generated files slightly lowered success, developer-written ones slightly raised it, and repository overviews did not help. An earlier version of the paper put it more strongly, saying context files tend to reduce success. They conclude that context files are useful for specifying non-standard practices and should contain only what is needed. Lulla et al. studied 124 pull requests across 10 repositories and found that an agent context file was associated with 28.64% lower median runtime and 16.58% fewer output tokens, with comparable task completion. Read together: a context file is neither free nor reliably helpful, and size and relevance decide which way it cuts. The OpenSSF guide for AI code assistant instructions makes the same practical point, advising instructions that are concise, specific, and actionable and warning that irrelevant instructions make extraneous or incorrect code more likely. OpenAI's account of building a large codebase mostly through agents, as reported by InfoQ, describes a docs directory of maps, execution plans, and design specifications treated as the agent's source of truth, with cross-links enforced by linters and CI. *Executable Architecture Guardrails* covers turning precise rules into checks; *Context Engineering* covers the budget these files draw on.
