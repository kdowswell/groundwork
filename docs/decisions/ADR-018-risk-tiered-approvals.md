# ADR-018: Risk-tiered change plans: scale review to blast radius, with no new default gate

**Date:** 2026-11-08
**Status:** Accepted

## Context

Hash-pinned approvals (ADR-007) are groundwork's most distinctive feature. They are also the
feature most exposed to the critique the Thoughtworks Radar (Vol. 35) files under *human-in-the-loop
theater*: people approving changes they can't realistically judge, because every change asks for
the same approval. The same Radar puts *risk-tiered human oversight* in Trial. Scale-adaptive
process tracks (for example, BMAD's quick / standard / enterprise flows) show the same demand:
match the weight of the process to the size of the change.

A change plan already contains what is needed to judge its risk: a Blast Radius severity, a
rollback strategy that names its one-way doors, and a delta with a Removed group.

## Decision

### The tier is derived, not asked

`brownfield-safe-change-plan` assigns a tier in a new Step 9, from fields the plan already has:

- **High** if any of: severity Catastrophic or Silent; a one-way door or an unresolved rollback
  gap; a non-empty Removed group.
- **Low** if all of: severity Degraded or None; every rollback step executable as written; Removed
  empty; every Unchanged item already covered by a test.
- **Moderate** otherwise.

The plan gets a `## Risk Tier` section with the tier, one line on which rule decided it, and, for
high, a review path. The agent never lowers a tier to make approval easier. If the user disagrees,
their reason is recorded in the section.

### What each tier changes

| Tier | Before code | After code |
|---|---|---|
| Low | The agent says the user can approve or tell it to go ahead; a go-ahead is recorded as `--decision=delegated` | CI and code review are the gate (ADR-012, DX rule 4) |
| Moderate | One plan approval, as before | Code review |
| High | One plan approval, with the plan's review path pointed out | A named reviewer, and `/groundwork check` on the pull request (advice, not a block) |

**No tier adds a stop.** The only approval is still the one plan approval before code (ADR-012),
and the hard stops stay where ADR-006 and ADR-007 put them. High tier adds advice and a reminder.
Low tier removes ceremony by making delegation the expected path.

### The tier is recorded

`approve --tier=low|moderate|high` stores the tier on the receipt, validated against the enum.
Receipts without a tier stay valid; a receipt with an unknown tier is invalid. `verify` prints
`[<tier> risk]`, `doctor` names the tier of a stale plan, and the review page shows a tier badge
beside the approval and draws the plan's Risk Tier section as a callout. A decision made in the
review page records the tier parsed from the plan.

### The hook keys off the tier

When a session starts with an approved plan whose delta is still to be applied (ADR-012), the
reminder for a **high**-tier plan adds the review path: run `/groundwork check` and ask the named
reviewer before merging. The plan nudge (ADR-013) is unchanged. It fires only when no plan exists,
so its `afterFiles` threshold remains the fallback.

## Consequences

- Most small, reversible changes need one "go ahead" instead of a formal approval, and the record
  still says the agent made the call.
- High-risk changes are named as such in the plan, the receipt, the review page, and the session
  that implements them.
- The rules are deliberately mechanical so the tier can't be argued down. They will misjudge some
  edge cases (a "None" severity change that is actually risky). The plan's Why line and the user's
  recorded disagreement make that visible.
- The eval cases for the plan skill gain a `risk_tier` dimension, and a new low-risk case (renaming
  an internal log field) should come out low.
