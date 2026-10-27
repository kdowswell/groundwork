---
id: durable-agent-execution
title: Durable Agent Execution
category: reliability
sources:
  - name: "Anthropic — Scaling Managed Agents: Decoupling the brain from the hands (Apr 2026)"
    url: "https://www.anthropic.com/engineering/managed-agents"
  - name: "Anthropic — Effective harnesses for long-running agents (Nov 2025)"
    url: "https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents"
  - name: "Anthropic — How we built our multi-agent research system (Jun 2025)"
    url: "https://www.anthropic.com/engineering/multi-agent-research-system"
applies_when:
  scope: [new_build, epic, feature]
  scale: [solo, team, enterprise]
  stage: [discovery, refinement, build, maintain]
  domains: [ai_systems]
tags: [reliability, ai-systems, agents, durable-execution, checkpointing, recovery, event-log]
---

# Durable Agent Execution

## Principle
A long-running agent is a stateful process whose errors compound, and it will crash, time out, be redeployed, or be replaced mid-run. Persist every model call, tool result, and decision to an append-only record that lives outside both the model's context and the process running the agent, so that a new process can reload the record and resume where the last one stopped instead of starting over. Make every side-effecting step idempotent, because recovery replays steps whose outcome the crashed process never recorded. Decide completion from verifiable state in that record (tests passed, records written), not from the model's own report that it is done.

## When This Matters
- Agent runs take minutes to hours, span many model and tool calls, or cost enough that restarting from scratch is expensive
- The agent performs side effects (writes records, sends messages, opens changes, spends money) that must not be repeated on retry
- Runs must survive deploys, scaling events, or infrastructure failure without losing work in flight
- Work is split across sessions or agents that each start with no memory of what came before
- Someone needs to audit or debug a run after the fact: what the agent saw, what it decided, and why

## When This Doesn't Matter
- Short, single-request interactions where a failure costs one retry and nothing irreversible happened
- Read-only agents whose steps are cheap to recompute and have no side effects
- Exploratory prototypes where losing a run is acceptable and the point is to learn whether the task is feasible

## Questions the Agent Should Ask
- If the process running this agent died right now, what would be lost? Could a fresh process reconstruct where the run was from durable state alone?
- Where is the record of model calls, tool results, and decisions kept, and is it independent of the context window and of the worker process?
- Which steps have side effects, and what stops a replayed step from repeating them (an idempotency key, a recorded outcome checked before acting)?
- How does a resumed run tell completed steps from started-but-unconfirmed ones?
- What defines "done" for this run, and is it checked against real state rather than the model's claim?
- When a new version of the agent is deployed, what happens to runs already in flight: do they finish on the old version, migrate, or break?
- How long is the record retained, and does it hold sensitive data that needs the same classification and access control as the systems the agent touched?

## What Good Looks Like
- Each run has an append-only event record (inputs, model calls, tool calls and results, decisions) stored outside the worker; the worker is disposable and holds nothing that must survive a crash
- Recovery is a routine operation: a new worker loads the record, skips steps with recorded outcomes, and continues, and this path is exercised in tests by killing workers mid-run
- Side-effecting tools take an idempotency key derived from the run and step, so a replayed call returns the original result instead of acting twice
- Long tasks are broken into checkpointed units of work that each leave the system in a consistent, resumable state (a passing build, a committed record)
- A startup routine for every session reads the record and progress notes, checks the environment, and verifies the last known-good state before new work begins
- Completion is gated on verification against real state; the model's statement that it finished is logged but not trusted on its own
- Deploys let in-flight runs finish on the version that started them, or migrate them deliberately, rather than cutting them off

## What Goes Wrong When You Skip This
- A four-hour migration agent crashes at step 180 of 200; with its state only in memory and in the context window, the run restarts from the beginning and pays the full cost again
- A worker dies after a payment tool succeeded but before the result was recorded; the resumed run calls the tool again and the customer is charged twice
- A session hands work to its successor through a free-text summary; the summary omits a half-finished change, and the next session builds on a broken state it cannot see
- An agent reports a feature complete, the harness accepts the claim, and the gap is found in production because nothing checked the actual state
- A routine deploy restarts every worker and silently abandons dozens of in-flight runs that users were waiting on

## Further Reading
Anthropic's Managed Agents post describes the session as an append-only log of everything that happened, kept outside the harness, so that nothing in the harness needs to survive a crash and a new harness can resume from the log. Its post on harnesses for long-running agents notes that each new session begins with no memory of what came before and describes the patterns that bridge sessions: a progress log, version control as a recovery record, a structured feature list the model is less likely to overwrite, one feature at a time, completion only after testing, and a startup routine. The multi-agent research system post explains why agents are stateful and errors compound, and describes resuming from where the agent was when an error occurred and deploying with old and new versions running side by side so in-flight agents are not disrupted. *Idempotency by Design* covers making replayed side effects safe; *Event Sourcing* covers the append-only log pattern this principle applies to agent sessions.
