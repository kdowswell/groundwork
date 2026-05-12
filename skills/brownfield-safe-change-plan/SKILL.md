---
name: brownfield-safe-change-plan
title: "Safe Change Plan"
description: >
  Plans a change to a production system with an explicit rollback strategy,
  test coverage plan, and blast radius assessment before writing any code. Use
  when a production change is being designed and the risk, rollback path, or
  blast radius has not been assessed — do not wait until code is written.
phase: brownfield
entry_criteria:
  - "The change is described (what will be different after)"
  - "The system receiving the change is running in production"
  - "Active principles are available"
exit_criteria:
  - "Blast radius is assessed: what breaks if this goes wrong"
  - "Rollback strategy is explicit: how to undo the change after deployment"
  - "Test coverage plan covers the changed behavior and adjacent behaviors"
  - "Deployment sequence is ordered to minimize risk"
principles:
  - graceful-degradation
  - health-checks
  - feature-flags
  - blue-green-canary
time_box: "60-120 minutes"
tags: [brownfield, production, safety, deployment]
---

# Safe Change Plan

## How This Skill Works

This skill produces a change plan before code is written — not a process artifact for its own sake, but a forcing function for three questions: what could go wrong, how to detect it, and how to undo it. The output is a plan with a blast radius assessment, test coverage map, and an explicit rollback path.

The plan doesn't need to be long. It needs to be explicit about the things that matter and validated by someone other than the person making the change.

The agent structures the plan by asking probing questions about the change's scope and dependencies. The human provides what the agent cannot infer: which downstream systems depend on the component being changed, what the monitoring and release capabilities look like, and what the tolerance for disruption is.

**Key concepts used in the Steps:**
- **Blast radius** — the set of behaviors, users, or downstream services affected if the change introduces a regression
- **Rollback path** — the specific steps to revert the change, verified to be executable under incident conditions
- **Test coverage map** — which behaviors must be verified before, during, and after the change
- **Staged rollout** — a deployment sequence that limits exposure before the change is confirmed safe
- **Go / no-go criteria** — the observable signals that determine whether to proceed, pause, or roll back at each stage

## Steps

1. **State the change precisely.** Write one paragraph: what is different about the system after the change is deployed? Name the specific files, services, schemas, or configurations that change. Vague change descriptions produce vague risk assessments.

2. **Assess the blast radius.** Ask: if this change breaks, what systems or users are affected, and how? Write it as a severity list:
   - **Catastrophic** — primary user-facing path is down
   - **Degraded** — some functionality is unavailable, primary path works
   - **Silent** — the system appears to work but produces wrong results
   - **None** — this change can break silently without user impact
   Silent failures are the most dangerous — they require active detection.

3. **Define the detection signals.** How will you know the change has caused a problem? Write down:
   - Which metrics or logs change when the system is unhealthy
   - What threshold triggers an alert or manual check
   - How quickly detection happens (real-time, minutes, hours)
   If detection takes more than 30 minutes, the blast radius is larger than it appears — consider how much damage can accumulate in that window.

4. **Write the rollback strategy.** For the change, write the exact steps to undo it after deployment. A rollback strategy is not "revert the commit" — it's the specific sequence of actions that returns the system to its prior state, including:
   - Any schema migrations that must be reversed (and whether that's possible)
   - Any feature flags that can short-circuit the new behavior
   - Any caches or queues that must be drained or flushed
   - Which teams must be notified
   
   If the change cannot be rolled back (e.g., a destructive schema migration), document that explicitly and ensure the deployment sequence reflects that this is a one-way door.

5. **Write the test coverage plan.** List what tests must exist before this change ships:
   - Tests for the changed behavior (new or modified)
   - Tests for adjacent behaviors that could regress
   - Tests for the failure modes identified in Step 2
   If any of these tests don't currently exist, write them before shipping.

6. **Order the deployment sequence.** Break the change into the smallest deployable increments. The order should minimize risk: deploy changes that enable rollback before changes that are hard to roll back, deploy behind a feature flag before removing the flag, deploy to a canary environment before full rollout.

7. **Identify coordination requirements.** Does this change require coordination with another team, service, or external party? If so, plan it explicitly: who needs to act, in what order, and what confirmation is required before each step.

## Checkpoints

**Is the rollback strategy actually reversible?**
Schema migrations that drop columns or tables, data transformations that overwrite original values, and external API calls that trigger irreversible actions are one-way doors. If the rollback strategy says "reverse the migration" but the migration drops data, that's not a rollback — it's data loss. Name one-way doors explicitly and decide whether the deployment risk is acceptable.

**Is the blast radius based on actual traffic analysis or intuition?**
"Only the payment service uses this" is often wrong because of implicit dependencies — service A calls service B which calls the thing being changed. Before accepting the blast radius assessment, trace the actual call graph. In large systems, the real blast radius is almost always larger than the apparent one.

**Are all coordination requirements confirmed, not assumed?**
"The other team said they can do it" and "the other team has confirmed they will do it in our deployment window" are different states. Do not proceed to deployment until explicit confirmation exists from every party who must act.

## Principle Application

**graceful-degradation**
Step 2 (blast radius) is where this principle is most load-bearing. For each catastrophic failure mode, ask: can the system degrade gracefully rather than fail completely? If the change removes a graceful degradation path, that must be flagged and addressed.
Full reference: [principles/graceful-degradation.md](principles/graceful-degradation.md)

**health-checks**
Step 3 (detection signals) is where this principle applies. Health checks are the primary mechanism for detecting that a change has broken something. If the system doesn't have health checks covering the changed path, add them as part of the test coverage plan in Step 5.
Full reference: [principles/health-checks.md](principles/health-checks.md)

**feature-flags**
Step 4 (rollback strategy) and Step 6 (deployment sequence) both benefit from feature flags. A change deployed behind a flag can be rolled back by toggling the flag — no code deployment required. If the change can be flagged, it should be.
Full reference: [principles/feature-flags.md](principles/feature-flags.md)

**blue-green-canary**
Step 6 (deployment sequence) is where this principle applies. For high-blast-radius changes, canary deployment reduces the scope of a mistake from "all users" to "a small percentage of users."
Full reference: [principles/blue-green-canary.md](principles/blue-green-canary.md)

## Output Format

A `safe-change-plan-{{CHANGE-SLUG}}.md` file:

```markdown
# Safe Change Plan: {{CHANGE NAME}}

**Date:** YYYY-MM-DD
**Author:** {{WHO}}
**Target system:** {{SYSTEM OR SERVICE}}

## Change Description
What is different after this is deployed: ...

## Blast Radius
**Severity:** Catastrophic / Degraded / Silent / None
**Affected:** ...

## Detection Signals
| Signal | Threshold | Detection time |
|---|---|---|
| ... | ... | ... |

## Rollback Strategy
1. ...
One-way doors: {{NONE | DESCRIBE WHAT CANNOT BE REVERSED}}

## Test Coverage Plan
- [ ] {{TEST}}

## Deployment Sequence
1. ...

## Coordination Requirements
| Who | Action | Confirmation required |
|---|---|---|
| ... | ... | ... |
```
