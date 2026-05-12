---
name: safe-change-plan
title: "Safe Change Plan"
description: >
  Plan a change to a production system with an explicit rollback strategy,
  test coverage plan, and blast radius assessment before writing any code.
  Invoke when a production change is about to be designed and the risk,
  rollback path, or required test coverage has not been assessed.
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

## When to Use This Skill

Use this skill before making any change to a production system where a mistake would affect users. This includes schema migrations, API changes, dependency upgrades, infrastructure changes, and significant feature additions. The plan doesn't need to be long — it needs to be explicit about the three things that matter: what could go wrong, how to know it's going wrong, and how to undo it.

What goes wrong when you skip it: the change ships and something breaks. The team scrambles to understand whether to roll forward or roll back, what the rollback would actually involve, and which teams need to be notified. The incident takes twice as long to resolve as it would have if the rollback path had been thought through in advance.

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

**graceful-degradation** (`principles/reliability/graceful-degradation.md`)
Step 2 (blast radius) is where this principle is most load-bearing. For each catastrophic failure mode, ask: can the system degrade gracefully rather than fail completely? The "What Good Looks Like" section defines what graceful looks like for each failure mode. If the change removes a graceful degradation path, that must be flagged and addressed.

**health-checks** (`principles/reliability/health-checks.md`)
Step 3 (detection signals) is where this principle applies. Health checks are the primary mechanism for detecting that a change has broken something. If the system doesn't have health checks covering the changed path, add them as part of the test coverage plan in Step 5.

**feature-flags** (`principles/delivery/feature-flags.md`)
Step 4 (rollback strategy) and Step 6 (deployment sequence) both benefit from feature flags. A change deployed behind a flag can be rolled back by toggling the flag — no code deployment required. If the change can be flagged, it should be. The "What Good Looks Like" section describes flag lifecycle.

**blue-green-canary** (`principles/delivery/blue-green-canary.md`)
Step 6 (deployment sequence) is where this principle applies. For high-blast-radius changes, canary deployment reduces the scope of a mistake from "all users" to "a small percentage of users." The "When This Matters" section identifies when the overhead of a canary deployment is justified.

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
