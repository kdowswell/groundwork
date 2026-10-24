---
name: brownfield-safe-change-plan
disable-model-invocation: true
title: "Safe Change Plan"
description: >
  Plans a change to a production system as a behavior delta against its spec
  (added, modified, removed, unchanged) with an explicit rollback strategy,
  test coverage plan, and blast radius assessment before writing any code. Use
  when a production change is being designed and what changes, the risk, the
  rollback path, or the blast radius has not been pinned down — do not wait
  until code is written.
phase: brownfield
entry_criteria:
  - "The change is described (what will be different after)"
  - "The system's spec is identified, or its absence is known"
  - "The system receiving the change is running in production"
  - "Active principles are available"
exit_criteria:
  - "The behavior delta states what is added, modified, removed, and must stay unchanged"
  - "Blast radius is assessed: what breaks if this goes wrong"
  - "Rollback strategy is explicit: how to undo the change after deployment"
  - "Test coverage plan covers the changed behavior and adjacent behaviors"
  - "Deployment sequence is ordered to minimize risk"
  - "The user has accepted the plan, and its builder check is recorded"
principles:
  - graceful-degradation
  - health-checks
  - feature-flags
  - blue-green-canary
  - idempotency-by-design
  - testing-strategy
  - conways-law-organizational-alignment
time_box: "60-120 minutes"
tags: [brownfield, production, safety, deployment]
---

# Safe Change Plan

## How This Skill Works

This skill produces a change plan before code is written — not a process artifact for its own sake, but a forcing function for four questions: exactly what changes, what could go wrong, how to detect it, and how to undo it. The output is a plan that opens with a behavior delta against the system's spec, followed by a blast radius assessment, test coverage map, and an explicit rollback path.

The plan is the one approval a change asks for, and it comes before code. When the change is implemented, the delta is applied to the spec in the same change set as the code, so the spec stays true to the running system and is reviewed where the code is reviewed. Nothing is asked of the user after the change ships.

The plan doesn't need to be long. It needs to be explicit about the things that matter and validated by someone other than the person making the change.

The agent structures the plan by asking probing questions about the change's scope and dependencies. The human provides what the agent cannot infer: which downstream systems depend on the component being changed, what the monitoring and release capabilities look like, and what the tolerance for disruption is.

**Key concepts used in the Steps:**
- **Baseline** — the approved spec the change departs from, or, when there is none, the system's observed behavior with evidence
- **Behavior delta** — the change stated as requirements Added, Modified (before → after), and Removed, plus the behaviors that must stay Unchanged
- **Blast radius** — the set of behaviors, users, or downstream services affected if the change introduces a regression
- **Rollback path** — the specific steps to revert the change, verified to be executable under incident conditions
- **Test coverage map** — which behaviors must be verified before, during, and after the change
- **Staged rollout** — a deployment sequence that limits exposure before the change is confirmed safe
- **Go / no-go criteria** — the observable signals that determine whether to proceed, pause, or roll back at each stage

## Steps

1. **Establish the baseline.** **If the system has a spec file (named in the request or present in the project), run `npx @kdowswell/groundwork verify <spec path>` from the project root and act on the first Checkpoint before writing anything else.** With no spec, the baseline is the system's observed behavior: read the code, tests, and docs that implement the behavior you are changing, and keep the paths as evidence.

2. **Write the behavior delta.** State the change as requirements against the baseline, in four groups:
   - **Added** — new behavior, written as a requirement the finished system meets
   - **Modified** — each as Before → After, citing the baseline section it changes (with no spec, the evidence path for the Before)
   - **Removed** — behavior that goes away, and who relied on it
   - **Unchanged** — adjacent behavior this change must not alter. Never leave this empty: it is where the regression tests in Step 6 come from, and the part of a change most often left implicit.
   Name the specific files, services, schemas, or configurations each item touches. A small change gets a small delta; one Modified row and one Unchanged item is a complete delta. Vague deltas produce vague risk assessments.

3. **Assess the blast radius.** Ask, for the items in the delta: if this change breaks, what systems or users are affected, and how? Write it as a severity list:
   - **Catastrophic** — primary user-facing path is down
   - **Degraded** — some functionality is unavailable, primary path works
   - **Silent** — the system appears to work but produces wrong results
   - **None** — this change can break silently without user impact
   Silent failures are the most dangerous — they require active detection.

4. **Define the detection signals.** How will you know the change has caused a problem? Write down:
   - Which metrics or logs change when the system is unhealthy
   - What threshold triggers an alert or manual check
   - How quickly detection happens (real-time, minutes, hours)
   If detection takes more than 30 minutes, the blast radius is larger than it appears — consider how much damage can accumulate in that window.

5. **Write the rollback strategy.** For the change, write the exact steps to undo it after deployment. A rollback strategy is not "revert the commit" — it's the specific sequence of actions that returns the system to its prior state, including:
   - Any schema migrations that must be reversed (and whether that's possible)
   - Any feature flags that can short-circuit the new behavior
   - Any caches or queues that must be drained or flushed
   - Which teams must be notified
   
   If the change cannot be rolled back (e.g., a destructive schema migration), document that explicitly and ensure the deployment sequence reflects that this is a one-way door.
   
   **Complete this section before moving to Step 6.** If a rollback step cannot be determined yet, write it as a named gap: "Step 3: reverse the schema migration — requires confirmation that a reverse migration is safe given data written after cutover. Must be resolved before deployment proceeds." An incomplete rollback that names its gaps can be finished and reviewed; a missing rollback section is unusable under incident pressure.

6. **Write the test coverage plan.** List what tests must exist before this change ships:
   - Tests for each Added and Modified item (the After behavior)
   - Tests for each Unchanged item, so the delta's promises are checked rather than assumed
   - Tests for the failure modes identified in Step 3
   If any of these tests don't currently exist, write them before shipping.

7. **Order the deployment sequence.** Break the change into the smallest deployable increments. The order should minimize risk: deploy changes that enable rollback before changes that are hard to roll back, deploy behind a feature flag before removing the flag, deploy to a canary environment before full rollout.

8. **Identify coordination requirements.** Does this change require coordination with another team, service, or external party? If so, plan it explicitly: who needs to act, in what order, and what confirmation is required before each step.

9. **Run a builder check before you ask the user anything.** It runs on the finished draft: write every earlier step in full first, and never open with questions. Its purpose is to gather every question into one round, asked at the end of the same response that delivers the complete plan, so the user is asked once. Hand the plan to a fresh reviewer: the plan file only, not this conversation. Give them this brief: "You will implement exactly this change. List every question you would need answered before you could start, and every place where two competent engineers would implement different things. Quote the line each question comes from. Do not suggest improvements." Use an isolated subagent if the runtime offers one. Otherwise do a deliberate cold read yourself, treating anything not written in the plan as unknown. Sort each question the reviewer returns into one of three groups:
   - **Answered by the plan:** the reviewer missed it. Tighten the wording so the next reader won't.
   - **Your call:** the answer doesn't change what gets built, or one option is clearly right. Decide, write the answer into the plan, and label it "Agent call:".
   - **For the user:** the answer changes what gets built.
   Bring the user only the last group, in one round. Ask all of them in that one message, however many there are; do not hold any back for a later turn. Record every question and its resolution in the plan's Builder Check section. The section is never left out; if the cold read finds nothing, write "No open questions."

10. **Record the user's decision.** When the user answers the acceptance Checkpoint, run `npx @kdowswell/groundwork approve <plan path> --checkpoint=brownfield-safe-change-plan/accept`, adding `--decision=changes-requested` if they asked for changes or `--decision=delegated` if they told you to decide. Record only an answer the user gave in this conversation. If they decided in the review page, it is already recorded: confirm with `npx @kdowswell/groundwork verify` instead of recording it again, and never submit the page yourself. With no one available to answer, record nothing and leave the plan marked as a draft. If the CLI is unavailable, write the decision and date at the top of the plan instead and say it is unverified.

11. **When you implement the change, apply the delta to the baseline spec in the same change set.** This is part of implementing the change, like updating a test, not a step after it ships. First run `npx @kdowswell/groundwork verify <plan path>`; implement only from an approved, unchanged plan. Then edit the spec: add each Added requirement, rewrite each Modified one to its After text at the cited section, delete each Removed one, and leave Unchanged items as they are. Change nothing the delta doesn't name. Record the edit with `npx @kdowswell/groundwork approve <spec path> --decision=amended --via=<plan path>`; the user approved this delta with the plan, so do not ask them to approve the spec again. Code review of the change set covers the spec edit. With no baseline spec, edit nothing; you may offer once to start a spec from the delta's After and Unchanged items, and drop it if the user declines.

## Checkpoints

**Is the baseline spec approved and unchanged?**
Decided by step 1's verify. **Exit 0:** the spec is current, so write the delta against it and cite its sections. **Non-zero (unapproved, changed since approval, or changes requested):** tell the user which, show what changed with `npx @kdowswell/groundwork verify <spec path> --diff` when it can, and ask whether to plan against the spec as it stands; an unapproved baseline can still anchor the delta, but say so in the plan's Baseline line. Never record an approval yourself to get past it. **No spec in the project:** plan against observed behavior, cite evidence for each Before, and keep going; never end a turn just to ask whether a spec exists.

**Is the rollback strategy actually reversible?**
Schema migrations that drop columns or tables, data transformations that overwrite original values, and external API calls that trigger irreversible actions are one-way doors. If the rollback strategy says "reverse the migration" but the migration drops data, that's not a rollback — it's data loss. Name one-way doors explicitly and decide whether the deployment risk is acceptable.

**Is the blast radius based on actual traffic analysis or intuition?**
"Only the payment service uses this" is often wrong because of implicit dependencies — service A calls service B which calls the thing being changed. Before accepting the blast radius assessment, trace the actual call graph. In large systems, the real blast radius is almost always larger than the apparent one.

**Are all coordination requirements confirmed, not assumed?**
"The other team said they can do it" and "the other team has confirmed they will do it in our deployment window" are different states. Do not proceed to deployment until explicit confirmation exists from every party who must act.

**Did the builder check surface questions that change what gets built?**
**Yes:** put them to the user before the acceptance Checkpoint, and fold each answer into the plan. Acceptance cannot be asked while any of them is open, because the user would be approving a change that two engineers would implement differently. **No:** go straight to acceptance, and list the "Agent call:" decisions you made so the user can overturn any of them when they answer.

**Does the user accept this plan as the basis for the change?**
Ask once the plan is complete. If the plan is long or still has open questions for the user, offer once to show it as a review page (`npx @kdowswell/groundwork render <plan path> --serve`), where the user can read the delta beside its open questions and findings and decide there. **Accepted:** record the approval; implementation may start from it, applying the delta to the spec in the same change set (Step 11), and any later edit to the plan makes the approval stale, so implementation re-asks. **Changes requested:** record that, revise, and ask again; nothing is implemented from this version. **Delegated ("you decide"):** record it as delegated, state the calls you made in your next reply, and proceed. The agent never answers this Checkpoint on the user's behalf.

## Principle Application

**graceful-degradation**
Step 3 (blast radius) is where this principle is most load-bearing. For each catastrophic failure mode, ask: can the system degrade gracefully rather than fail completely? If the change removes a graceful degradation path, that must be flagged and addressed.
Full reference: [principles/graceful-degradation.md](principles/graceful-degradation.md)

**health-checks**
Step 4 (detection signals) is where this principle applies. Health checks are the primary mechanism for detecting that a change has broken something. If the system doesn't have health checks covering the changed path, add them as part of the test coverage plan in Step 6.
Full reference: [principles/health-checks.md](principles/health-checks.md)

**feature-flags**
Step 5 (rollback strategy) and Step 7 (deployment sequence) both benefit from feature flags. A change deployed behind a flag can be rolled back by toggling the flag — no code deployment required. If the change can be flagged, it should be.
Full reference: [principles/feature-flags.md](principles/feature-flags.md)

**blue-green-canary**
Step 7 (deployment sequence) is where this principle applies. For high-blast-radius changes, canary deployment reduces the scope of a mistake from "all users" to "a small percentage of users."
Full reference: [principles/blue-green-canary.md](principles/blue-green-canary.md)

**idempotency-by-design**
Steps 5 and 7 are where this principle is most relevant to safe change planning. Any change that modifies a write path — a new API endpoint, a modified message handler, a schema migration — must account for what happens if the deployment is partially applied and then rolled back. If the new code runs twice (once before rollback, once after redeployment), does it produce the same result or a duplicate side effect? For changes that involve migrations or external API calls with side effects, verify the write path is idempotent before shipping. If it isn't, make idempotency part of the test coverage plan in Step 6 — not a follow-up item.
Full reference: [principles/idempotency-by-design.md](principles/idempotency-by-design.md)

**testing-strategy**
Step 6 (test coverage plan) is where this principle is most load-bearing, and the Unchanged items from Step 2 are the adjacent behaviors it must cover. Order test coverage to match the pyramid: unit tests for the changed behavior, integration tests for the changed path through the system, E2E tests only for the critical user journeys that exercise the changed path. A coverage plan that relies primarily on E2E tests produces slow, fragile verification — either too slow to be a useful release gate, or so flaky it gets bypassed. If the change touches a service boundary, consumer-driven contract tests must exist before the change ships — they catch schema or contract regressions faster and more reliably than a shared integration environment. Silent failure modes from Step 3 (blast radius) require dedicated test coverage; if a failure mode produces wrong results without an error signal, the only defense is a test that asserts the correct result, not just the absence of exceptions.
Full reference: [principles/testing-strategy.md](principles/testing-strategy.md)

**conways-law-organizational-alignment**
Step 8 (coordination requirements) is where this principle is diagnostic as well as prescriptive. The coordination plan should reflect the actual team ownership structure — which team owns the service being changed, which teams own dependent services, what confirmation is required from each. But Conway's Law also works as a signal: if a routine production change routinely requires coordinating more than two teams, that pattern is evidence the service boundary is in the wrong place. A well-aligned architecture allows one team to change one service without synchronizing across the organization. When Step 8 consistently produces a coordination table with four or five teams, flag it as an architectural finding — it belongs in the next brownfield architecture review, not only in this change plan.
Full reference: [principles/conways-law-organizational-alignment.md](principles/conways-law-organizational-alignment.md)

## Output Format

A `safe-change-plan-{{CHANGE-SLUG}}.md` file:

```markdown
# Safe Change Plan: {{CHANGE NAME}}

**Date:** YYYY-MM-DD
**Author:** {{WHO}}
**Target system:** {{SYSTEM OR SERVICE}}

## Behavior Delta
Baseline: {{SPEC PATH (approved YYYY-MM-DD) | observed behavior (no spec): EVIDENCE PATHS}}

### Added
- {{NEW BEHAVIOR, AS A REQUIREMENT}}

### Modified
| Before | After | Spec reference |
|---|---|---|
| ... | ... | {{SPEC SECTION, OR EVIDENCE PATH}} |

### Removed
- {{BEHAVIOR THAT GOES AWAY, AND WHO RELIED ON IT}}

### Unchanged (must keep working)
- {{ADJACENT BEHAVIOR THIS CHANGE MUST NOT ALTER}}

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

## Builder Check
| Question (from a cold read) | Resolution |
|---|---|
| ... | Answered in plan (wording tightened) / Agent call: ... / User: ... |
```
