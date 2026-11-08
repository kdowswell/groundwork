---
name: brownfield-path-to-production
disable-model-invocation: true
title: "Path to Production"
description: >
  Maps every stage a change passes through from a developer's workstation to
  production (owner, wait, failure rate, manual or automated, and whether an
  agent can see the stage's signals), names the single constraint, separates
  review gates that catch problems from gates that only approve, and ranks
  fixes by flow gained per effort. Invoke when changes are written faster than
  they ship, when lead time or review queues are the complaint, or before
  investing in delivery tooling without knowing where the wait actually is.
phase: brownfield
entry_criteria:
  - "The system ships to production through a repeatable path (if releases are ad hoc, map the last few as they actually happened)"
  - "The repository's pipeline configuration and change history are readable (if not, gather the numbers from the user and mark them user-stated)"
  - "Someone who has shipped a change recently is available to confirm the map (if not, label every unverified stage as inferred)"
exit_criteria:
  - "Every stage from commit to post-release verification is in the Stages table with owner, wait, failure rate, manual or automated, and agent-visible signals"
  - "Each number in the table names its source: measured, user-stated, or estimated"
  - "Exactly one stage is named as the constraint, with the evidence that decided it"
  - "Each human review or approval gate is classified real or theater, with the risk tiers it should apply to"
  - "Fixes are ranked by flow gained per effort, and the user has picked the first two"
time_box: "45-90 minutes"
principles:
  - ci-cd-pipeline
  - testing-strategy
  - feature-flags
  - blue-green-canary
  - executable-architecture-guardrails
  - conways-law-organizational-alignment
tags: [brownfield, delivery, flow, lead-time, review, pipeline, bottleneck]
---

# Path to Production

## How This Skill Works

This skill draws the map a change follows from the first commit to verified in production, then finds the one place where work waits longest or comes back most often. When agents write code quickly, coding stops being the slow part; the wait moves downstream into review queues, flaky checks, batched environment deploys, and release approvals. Speeding up any stage other than the constraint does not ship anything sooner. It only grows the pile in front of the constraint.

The output is a path-to-production map: a stage table, the constraint, a verdict on each human gate, and a ranked list of fixes. The user picks the first two fixes, and the first one goes to `plan`.

The agent gathers evidence from the repository before asking anything: pipeline definitions, branch and ownership rules, deploy scripts, and change history when it is readable. The human supplies what the repository cannot show: queue waits outside the repository, approval meetings, who is paged, and which gates exist because a regulator or contract requires them.

**Key concepts used in the Steps:**
- **Stage** — a step a change passes through with an owner and a start and end you can observe (review requested → approved)
- **Wait vs. work** — time a change sits idle vs. time someone or something is acting on it; most lead time is wait
- **Failure rate** — how often a stage sends a change back (a failed check, changes requested, a rolled-back release); flaky failures count, since they cost a rerun
- **Agent-visible signal** — a stage result an agent can read without a human relaying it (check status and logs, deploy status, post-release health)
- **Constraint** — the stage with the longest wait or the most rework per change; it sets the pace of the whole path
- **Real gate** — a human check that has caught problems and whose reviewer can judge what they approve
- **Theater gate** — a human check that approves nearly everything, or whose reviewer cannot judge what they are approving
- **Risk tier** — low, moderate, or high, as assigned by the safe change plan from blast radius and reversibility

## Steps

1. **Gather evidence before asking.** Read the pipeline definitions, branch protection and code ownership rules, deploy and release scripts, environment definitions, and any release checklist in the repository. If the code host's change history is readable, sample the last 20–50 merged changes and compute: time from opened to first review, first review to approval, approval to merge, merge to production; checks that failed and passed on rerun with no code change; and how often releases ship. Keep the file paths and queries as evidence. Ask the user only for what remains unknown, all in one round.

2. **Enumerate the stages.** Start from the default sequence and adjust it to what the evidence shows: commit and local checks → review → pipeline checks → each pre-production environment → release (deploy, approval, or both) → post-release verification. Split a stage when it has two owners or two queues; for example, "staging" is often a batched deploy plus a manual sign-off. Add stages the default leaves out, such as a change-approval meeting, a security review, or a manual data migration.

3. **Fill in each stage.** For each one, record the owner (a team or role), the typical wait, the failure rate, whether it is manual, automated, or mixed, and which signals an agent can read. Tag every number **measured**, **user-stated**, or **estimated**. A stage whose result reaches the author only through a person (a chat message, a meeting, a dashboard the agent cannot query) has no agent-visible signals; write "none" and name where the signal lives.

4. **Find the constraint.** For each stage, compute the time it adds per change: wait plus rework, where rework is the failure rate times the cost of going back through the stage. The stage that adds the most is the constraint. Name exactly one. If two are close, pick the one earlier in the path and state the runner-up, because fixing the earlier one changes the arrival rate at the later one.

5. **Classify each human gate.** For every stage where a person approves or reviews, decide real or theater from evidence:
   - **Real** — it rejected or changed something in the sample, or the reviewer has the context and the artifacts (diff, tests, rollback plan) to judge it.
   - **Theater** — it approved nearly every change in the sample, its approval time tracks the queue rather than the change's size, or the reviewer approves what they cannot see or judge.
   Then map each gate to risk tiers. A real gate belongs on high-tier changes and may belong on moderate ones; a theater gate on low-tier changes is pure wait. Name the check that would replace the theater gate's stated purpose, such as an automated rule, an attached test result, or a staged rollout.

6. **List fixes for the constraint first.** Order them cheapest first: use the constraint fully (stop work arriving at it unready, stop idle time), then take load off it (route low-tier changes past a theater gate, move a precisely stated rule into an automated check), then add capacity (more reviewers, a per-change environment, deploy on merge instead of on a schedule). Add fixes for other stages only where they remove rework that feeds the constraint, such as quarantining flaky checks that send changes back into review.

7. **Rank by flow gained per effort.** For each fix, estimate the wait or rework it removes per change and its effort (hours, days, or weeks). Rank by ratio. Write one line per fix naming the principle it applies and the risk it introduces. A fix that removes a gate states which tier still passes through a real check.

8. **Ask the user to pick the first two fixes.** Present the map and the ranked list in the same reply, and ask the Checkpoint questions in one round. Record their picks in First Two Fixes. If they pick a fix that does not touch the constraint, record it and note in one line which stage stays the constraint.

## Checkpoints

**Does the measured constraint match what the team believes it is?**
**Yes:** proceed to fixes. **No, and they have data the repository lacks** (a queue outside the code host, a weekly meeting): update the Stages table with their numbers marked user-stated and recompute Step 4; the constraint may move. **No, but no data:** keep the measured constraint, record their belief as the runner-up, and add a fix that measures it. The ranking follows evidence, not opinion.

**Is a theater gate required by a regulator, auditor, or contract?**
**Yes:** removing it is off the table. The fixes change shape: attach evidence automatically so the approver judges in minutes, pre-approve standard low-tier change types, or move the review before code exists. **No:** routing low-tier changes past it becomes a candidate fix, ranked like any other. **Unknown:** treat it as required, and add "confirm the mandate" as a zero-effort first action.

**Which two fixes go first?**
The user's picks set the next command: the first pick becomes the input to `plan`, and the second waits until the first ships so its effect on the constraint can be measured. **Picks include a constraint fix:** proceed. **Neither touches the constraint:** record the picks as given, and state once that lead time will not improve until the constraint changes. Do not ask again.

## Red Flags

Observable signs this playbook is being skipped or gamed. Check your own work against them before you ask the user to pick; each one you find is something to fix, not to explain away.

- A number in the Stages table has no source tag (measured, user-stated, or estimated).
- More than one stage is named as the constraint.
- The user was asked for a figure that the pipeline configuration or change history in the repository already contained.
- A gate is labeled theater with no sample, approval rate, or note on what the reviewer can see.
- The top-ranked fix targets a stage other than the constraint, with no line explaining the rework it removes from the constraint.
- A ranked fix removes a gate the user said is externally mandated.
- First Two Fixes lists fixes the user did not pick.

## Principle Application

**ci-cd-pipeline**
Steps 3 and 6 lean on this principle's claim that the pipeline is the single trusted route to production. Every manual release step in the Stages table is a deviation from it, and a scheduled batch deploy to an environment is the most common hidden constraint: a change merged at 9 a.m. waits for the nightly deploy no matter how fast review was. Deploy-on-merge to the pre-production environment usually ranks high in Step 7 because its effort is configuration, not code. The principle's batch-size point matters here too: when agents produce large changes, review wait grows faster than linearly with size, so "split changes smaller" is a constraint fix for review even though it touches the commit stage.
Full reference: [principles/ci-cd-pipeline.md](principles/ci-cd-pipeline.md)

**testing-strategy**
The failure-rate column in Step 3 is where this principle shows up. A suite that fails on reruns with no code change is rework at the pipeline stage, and it also corrodes the gate: once people rerun until green, a red result stops meaning anything. When pipeline checks are the constraint, the ranked fixes follow the pyramid: quarantine and fix flaky end-to-end tests, push coverage down to fast unit and contract tests, and run the fast checks in the author's loop so an agent fixes its own failures before review. Contract tests are also the usual replacement for a shared staging environment as an integration gate.
Full reference: [principles/testing-strategy.md](principles/testing-strategy.md)

**feature-flags**
Step 6 uses this principle to separate deploying from releasing. When a release approval or a batched environment deploy is the constraint because a release feels risky, a flag lets code merge and deploy continuously while exposure stays a separate decision. That turns a large approval into a series of small, reversible toggles, which is often what lets a theater release gate shrink to high-tier changes only. Flags carry a cleanup cost; a fix that adds them names who removes them.
Full reference: [principles/feature-flags.md](principles/feature-flags.md)

**blue-green-canary**
Step 5 uses this principle to replace a theater gate with a real one. A pre-release human approval often exists because rollback is slow; a staged rollout with automatic rollback on health signals catches more than an approver who cannot see production behavior. In the Stages table, the post-release verification stage is real only if someone or something watches it; a canary with an agent-visible health signal turns "verify" from a hope into a check.
Full reference: [principles/blue-green-canary.md](principles/blue-green-canary.md)

**executable-architecture-guardrails**
Steps 5 and 6 apply this principle when a review is the constraint. Review comments that repeat the same precisely stateable rule (layering, forbidden dependencies, naming of migrations) are work a deterministic check can do in seconds, in the author's loop, before a reviewer ever sees the change. Moving them out leaves human review for intent and trade-offs, the part only a person can judge, which shortens the queue and makes the remaining gate more real.
Full reference: [principles/executable-architecture-guardrails.md](principles/executable-architecture-guardrails.md)

**conways-law-organizational-alignment**
The owner column in Step 3 is the diagnostic. Every change of owner between stages is a handoff with its own queue, and a path where one routine change passes through four teams is evidence the ownership boundaries and the system boundaries disagree. When the constraint is a cross-team handoff (a separate operations team deploys, a central group approves every schema change), name it as an organizational finding in the Constraint section; tooling fixes alone will not remove it.
Full reference: [principles/conways-law-organizational-alignment.md](principles/conways-law-organizational-alignment.md)

## Output Format

A `path-to-production-{{SYSTEM-SLUG}}.md` file:

```markdown
# Path to Production: {{SYSTEM}}

**Date:** YYYY-MM-DD
**Mapped by:** {{WHO}}
**Evidence:** {{PIPELINE FILES, CHANGE-HISTORY SAMPLE (N CHANGES, DATE RANGE), OR "user-stated only"}}

## Stages
| Stage | Owner | Typical wait | Failure rate | Manual / automated | Agent-visible signals |
|---|---|---|---|---|---|
| {{STAGE}} | {{TEAM OR ROLE}} | {{DURATION}} (measured / user-stated / estimated) | {{RATE}} (source) | Manual / Automated / Mixed | {{SIGNALS AN AGENT CAN READ, OR "none: lives in X"}} |

**End-to-end lead time:** {{COMMIT TO VERIFIED IN PRODUCTION}} ({{SHARE THAT IS WAIT}})

## Constraint
**Stage:** {{ONE STAGE}}
**Why:** {{WAIT + REWORK PER CHANGE, AND THE EVIDENCE}}
**Runner-up:** {{STAGE, OR NONE}}

## Gates: Real vs Theater
| Gate | Verdict | Evidence | Applies to tiers | Mandated? | Replacement check (if theater) |
|---|---|---|---|---|---|
| {{GATE}} | Real / Theater | {{SAMPLE, APPROVAL RATE, WHAT THE REVIEWER SEES}} | low / moderate / high | Yes / No / Unknown | {{CHECK}} |

## Ranked Fixes
| Rank | Fix | Stage | Flow gained per change | Effort | Principle | Risk introduced |
|---|---|---|---|---|---|---|
| 1 | {{FIX}} | {{STAGE}} | {{WAIT OR REWORK REMOVED}} | {{HOURS / DAYS / WEEKS}} | {{PRINCIPLE ID}} | {{RISK}} |

## First Two Fixes
1. {{USER'S FIRST PICK}} (next: `plan`)
2. {{USER'S SECOND PICK}} (after the first ships and its effect is measured)
{{IF NEITHER TOUCHES THE CONSTRAINT: ONE LINE NAMING THE STAGE THAT STAYS THE CONSTRAINT}}
```

**Next step:** End your reply (not the artifact) with one recommended next command and why, worked out from what exists now (the router's Next steps table), never a list. Usually `plan` for the user's first pick. Before the user has picked, the next step is their answer, not another command.
