---
id: simplest-agent-architecture-first
title: Simplest Agent Architecture First
category: design
sources:
  - name: "Anthropic — Building effective agents (Dec 2024)"
    url: "https://www.anthropic.com/engineering/building-effective-agents"
  - name: "Anthropic — How we built our multi-agent research system (Jun 2025)"
    url: "https://www.anthropic.com/engineering/multi-agent-research-system"
applies_when:
  scope: [new_build, epic, feature]
  scale: [solo, team, enterprise]
  stage: [ideation, discovery, refinement]
  domains: [ai_systems]
tags: [design, ai-systems, agents, multi-agent, workflows, complexity, cost]
---

# Simplest Agent Architecture First

## Principle
Choose the least autonomous design that solves the problem, and add autonomy one layer at a time. A single model call with good context comes first; a fixed workflow, where code decides the sequence of model and tool calls, comes before an agent that chooses its own steps; a single agent comes before several cooperating agents. Each layer trades latency, cost, and predictability for capability, so add one only when evaluations on the real task show it improves results, and only when the value of the task covers the extra cost. Agents consume several times the tokens of a plain model interaction, and multi-agent systems many times more; that multiplier has to be paid for by the outcome.

## When This Matters
- A team is designing a new AI feature and the default proposal is "an agent", or "a team of agents", before the task has been tried with something simpler
- The steps of the task are known in advance and could be written down as a sequence
- Cost per task, latency, or predictability matters to the product, as it does for most user-facing features
- An existing agent system is expensive or flaky and nobody has measured whether a simpler design would do as well
- The work involves shared context or tight dependencies between steps, which parallel agents handle poorly

## When This Doesn't Matter
- Open-ended tasks where the number and order of steps cannot be known in advance and a fixed path demonstrably fails
- Research-style work that splits naturally into independent, parallel lines of inquiry and is valuable enough to pay for breadth
- Short experiments whose purpose is to explore what an agent design can do, provided they are not shipped by default

## Questions the Agent Should Ask
- Can this task be done with one well-constructed model call? If not, can the steps be written down as a fixed sequence that code orchestrates?
- What specifically requires the model to choose its own next step, and what evaluation shows that freedom improves results over a fixed workflow?
- If multiple agents are proposed, are the sub-tasks genuinely independent and parallel, or do they share context and depend on each other's output?
- What does one successful task cost in tokens and time under each design, and does the task's value cover the most expensive one?
- How will this design be evaluated against the simpler alternative, on the same task set, before it ships?
- What does the extra autonomy add to the failure surface: loops, compounding errors, harder debugging, more ways for untrusted input to steer actions?

## What Good Looks Like
- The design record states which simpler designs were considered and the evaluation results that justified moving past each one
- Fixed workflows are used wherever the steps are known: code owns sequencing, validation, and branching, and the model fills in the parts that need judgement
- Agent autonomy is introduced for the specific sub-task that needs it, not for the whole feature
- Multi-agent designs are reserved for breadth-first, parallelizable work, and their cost per successful task is tracked against the single-agent baseline
- Each layer of autonomy has a budget (steps, tokens, time) and a stopping condition enforced by code
- The simpler design remains available as a baseline in the evaluation suite, so regressions and over-engineering both show up

## What Goes Wrong When You Skip This
- A document-intake feature is built as a team of cooperating agents; a fixed three-step workflow would have matched its accuracy at a fraction of the cost and latency, but nobody measured it
- A free-acting agent handles a task whose steps never vary; it occasionally skips one, and the bug is intermittent and hard to reproduce
- Multiple agents are split across a coding task whose parts depend on each other; they make conflicting assumptions, and coordination costs more than the parallelism saves
- Cost per task balloons after launch because the agent design multiplies token usage and the product's unit economics were set from single-call estimates
- A complex agent system becomes impossible to debug because no simpler baseline exists to compare its failures against

## Further Reading
Anthropic's "Building effective agents" distinguishes workflows, in which models and tools are orchestrated through predefined code paths, from agents, in which models dynamically direct their own process and tool use. It recommends finding the simplest solution possible and increasing complexity only when needed, noting that agentic systems often trade latency and cost for better task performance. Anthropic's account of its multi-agent research system gives the cost side in numbers: agents typically used about 4× the tokens of chat interactions and multi-agent systems about 15×, and token usage alone explained 80% of performance variance on the BrowseComp evaluation. It concludes that multi-agent systems require tasks valuable enough to pay for the increased performance, and that domains needing shared context or many inter-agent dependencies, including most coding, are a poor fit. *Context Engineering* and *Durable Agent Execution* cover the infrastructure each added layer of autonomy depends on.
