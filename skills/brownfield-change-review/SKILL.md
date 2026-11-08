---
name: brownfield-change-review
disable-model-invocation: true
title: "Change Review"
description: >
  Reviews a finished change (a branch or pull request diff) against its approved
  change plan's behavior delta, the baseline spec, and the active principles,
  and returns a short GO / FIX list with file and line for each item. It never
  edits code. Use when code for a planned change is written and about to be
  merged, when a high-risk plan recommends a check in the pull request, or when
  someone asks whether the code does what was approved.
phase: brownfield
entry_criteria:
  - "A diff exists: a branch against its base, or a pull request (if neither is named, use the current branch against the default branch and say so)"
  - "The change plan the code implements is identified (if there is none, review against the spec and active principles only and say the delta checks were skipped)"
  - "The baseline spec is identified, or its absence is known"
  - "Active principles are available (if not, apply the ones the diff obviously touches and say so)"
exit_criteria:
  - "Every behavior change in the diff is matched to a delta line or flagged as undeclared"
  - "Every Unchanged item whose code the diff touches has test evidence or a flag"
  - "The spec amendment and its recorded approval are confirmed present or flagged missing"
  - "Detector findings for the changed files are folded in, not listed raw"
  - "The review carries a GO or FIX verdict with at most about 10 actionable items, each with file:line and the delta line or principle id it concerns"
  - "No code, plan, or spec was edited by the review"
principles:
  - testing-strategy
  - api-contract-first
  - schema-evolution
  - bounded-contexts
  - executable-architecture-guardrails
time_box: "15-45 minutes"
tags: [brownfield, review, diff, verification]
---

# Change Review

## How This Skill Works

A change plan is the one approval a change asks for, and it comes before code. This skill closes the loop afterwards: it reads the diff that was actually written and asks whether it does what was approved, no more and no less. The detector catches mechanical gaps; this review catches what it cannot see, such as "the plan said refunds stay unchanged, and the refund path changed with no test".

The review is advisory and diff-scoped. It runs on request or in the pull request, adds no stop, and never edits code, the plan, or the spec. Its output is a short list the author can act on in minutes, not an audit of the whole system. Code review stays the gate; this makes the reviewer's first pass faster and sharper.

The agent does the matching: diff hunks against delta lines, touched code against Unchanged items, names against the glossary. The human decides what to do with each FIX item.

**Key concepts used in the Steps:**
- **Behavior delta** — the approved plan's Added, Modified (before → after), Removed, and Unchanged groups; the contract the diff is checked against
- **Behavior change** — any hunk that alters what a caller, user, or stored record observes: an output, an error, a side effect, a contract, a data shape. Renames, formatting, and internal refactors with identical behavior are not behavior changes.
- **Undeclared change** — a behavior change that matches no Added, Modified, or Removed line
- **Unchanged touched** — a hunk in code that implements an Unchanged item, with no test in the diff or the suite that would catch it breaking
- **Missing amendment** — the plan is implemented but the spec edit or its recorded amendment is absent from the change set
- **Verdict** — GO when no item needs action before merge; FIX when at least one does
- **Risk tier** — the plan's low / moderate / high tier, which sets how deep the review reads

## Steps

1. **Collect the diff.** List the changed files and hunks for the branch against its base, or for the pull request. Note files outside the plan's named scope as you go; they are where undeclared changes hide.

2. **Verify the plan.** **If a change plan is named or present for this change, run `npx @kdowswell/groundwork verify <plan path>` from the project root and act on the first Checkpoint before reading the diff in detail.** Read its Behavior Delta, Risk Tier, Test Coverage Plan, and Red Flags as approved. With no plan, skip Steps 4–6 and say so in the artifact's Inputs line.

3. **Set the depth from the risk tier.** **High:** read every changed file in full, trace each changed interface one hop to its callers, and check every Unchanged item. **Moderate:** read every changed hunk with its surrounding function, and check the Unchanged items the diff touches. **Low:** read the changed hunks, and check the Unchanged items the diff touches. With no tier, use moderate. If the diff shows something the tier rules in the plan skill would rate higher (a removed behavior, a one-way data change), flag the tier itself as an item.

4. **Match each behavior change to the delta.** For each hunk that is a behavior change, find the Added, Modified, or Removed line it implements and record the pair. A hunk that matches none is an **undeclared change**: flag it with file:line and the nearest delta line it might belong to. A delta line with no hunk is **unimplemented**: flag it too, citing the line.

5. **Check the Unchanged items.** For each Unchanged item whose implementing code the diff touches, look for a test, added or existing, that exercises that behavior and would fail if it broke. Name the test. With none, flag **unchanged touched** with file:line and the Unchanged item quoted.

6. **Check that the spec amendment rides with the code.** If the plan names a baseline spec, confirm the change set edits it: each Added requirement present, each Modified one rewritten to its After text, each Removed one deleted, nothing else altered. Then run `npx @kdowswell/groundwork verify <spec path>` and confirm it reports the amendment via this plan. Flag a **missing amendment** if the spec edit is absent, partial, or wider than the delta, or if the amendment is not recorded. With no baseline spec, skip this step.

7. **Run the detector on the changed files.** Run `npx @kdowswell/groundwork detect <path> --json` for each changed file (or its smallest containing directory). Keep only findings on changed lines or introduced by the change. Fold each into an item citing its principle id; do not paste raw output. An `error` finding is always a FIX item.

8. **Assess the semantic principle fit.** For each active principle the diff touches, ask what the detector cannot: does the change cross a boundary the architecture draws, break a contract callers rely on, change a stored data shape without a compatible path, or remove a degradation path? Flag only concrete violations with file:line and the principle id. Leave out style preferences and anything the diff did not introduce.

9. **Check the plan's Red Flags against the code.** Walk the plan skill's Red Flags list and flag any that the diff or change set makes observable, such as code for the change landing with no recorded decision on the plan.

10. **Check names against the domain glossary.** If the project has a glossary (the Glossary section of the project context, or a data model's), compare the terms the diff introduces in names, interfaces, schemas, and messages. Flag a concept renamed, a glossary term used with a different meaning, or one name for two concepts, citing the glossary row, under `bounded-contexts`. With no glossary, skip this step.

11. **Rank, cap, and decide the verdict.** Mark each item **FIX** (needs action before merge) or **Note** (worth knowing, safe to merge). Undeclared changes, unchanged touched, missing amendments, detector errors, unimplemented delta lines, and principle violations that break a contract or a stored shape are FIX. Order FIX items first in that order, then Notes. Keep at most about 10; if there are more, write the count left out and the category they fall in. Each item states the fix in one sentence. The verdict is **FIX** if any FIX item remains, otherwise **GO**.

12. **Write the review and stop.** Write `check-<slug>.md` in the Output Format, using the plan's slug when there is one. Edit no code, plan, or spec, and record nothing with `approve`: the review is advice, and code review is the gate. Present the verdict and the FIX items in your reply, and ask the last Checkpoint once.

## Checkpoints

**Is the change plan approved and unchanged?**
Decided by Step 2's verify. **Exit 0:** review the diff against the delta as approved. **Non-zero (unapproved, changed since approval, or changes requested):** tell the user which, show what changed with `npx @kdowswell/groundwork verify <plan path> --diff` when it can, and ask whether to review against the plan as it stands; either way, add a FIX item that the code was built on a plan without a current approval. Never record an approval to get past it. **No plan:** review against the spec and principles, label behavior changes "unplanned" rather than "undeclared", and keep going.

**Does the diff contain work the plan does not cover at all?**
If files outside the plan's scope carry behavior changes unrelated to any delta line (a second feature, an opportunistic refactor), the answer changes the recommendation. **Related to the change:** flag each as undeclared and recommend adding it to the plan's delta. **Unrelated:** recommend splitting it into its own change set, in one FIX item, instead of listing each hunk. **Behavior-neutral (formatting, renames with no meaning change):** leave it out.

**Does the user act on the FIX items?**
Ask once, after the review is written. **Fix now:** implement the fixes as ordinary work in the same branch; a fix that changes behavior beyond the delta means the plan is amended first and re-approved, because the approval covered the delta as written. Offer to run the review again after. **Accept as is:** note each accepted item and the user's reason in the review's Decision line; reviewers in the pull request will see it. **Defer:** leave the review as written. None of these is recorded with `approve`, and none blocks the merge.

## Red Flags

Observable signs this playbook is being skipped or gamed. Check your own work against them before you present the review; each one you find is something to fix, not to explain away.

- The verdict is GO while the diff edits code behind an Unchanged item and the review names no test for it.
- An item has no file:line, or no delta line or principle id.
- The review lists more than about 10 items, or pastes detector output instead of folding it into items.
- The verdict is GO on an implemented plan with a baseline spec, and the change set has no spec edit.
- The review edited code, the plan, or the spec, or recorded an approval.
- No `verify` ran on the plan before the diff was matched against it.

## Principle Application

**testing-strategy**
Step 5 is where this principle is load-bearing. The Unchanged group is a promise, and a promise with no test is an assumption. A test only counts if it exercises the behavior at the level it can break: a unit test on a helper does not cover an Unchanged item about an end-to-end flow the diff rewired. For a Silent-severity plan, the evidence must assert the correct result, not the absence of errors, because silent breakage produces no errors to assert on.
Full reference: [principles/testing-strategy.md](principles/testing-strategy.md)

**api-contract-first**
Steps 4 and 8 apply this principle. A change to a response shape, an error code, a required parameter, or a status is a behavior change even when the hunk looks like a refactor, because callers observe it. When the contract is defined in a separate file, a code change that departs from it without a matching contract edit is undeclared by definition. When the contract changes, the delta must say so as a Modified line.
Full reference: [principles/api-contract-first.md](principles/api-contract-first.md)

**schema-evolution**
Step 8 applies this principle to stored and transmitted data. A diff that renames, retypes, or makes required a field read by another deployable, a queue, or old records is a FIX item unless the plan names the compatible path: additive first, old and new readers coexisting, removal later. It also feeds Step 3: a destructive data change the plan did not list as a one-way door is a tier mismatch.
Full reference: [principles/schema-evolution.md](principles/schema-evolution.md)

**bounded-contexts**
Step 10 applies this principle at the scale of one change. New names are where vocabulary drifts, because each diff is written with only part of the model in view. A term from another context used in this one, or a glossary term bent to a new meaning, is cheap to fix in the pull request and expensive once callers depend on it. Flag the specific name and the glossary row it conflicts with.
Full reference: [principles/bounded-contexts.md](principles/bounded-contexts.md)

**executable-architecture-guardrails**
Steps 7 and 8 divide the work this principle describes. Rules that can be stated precisely belong to the detector, so fold its findings in and do not re-derive them by reading. Spend the review on what cannot be stated precisely: intent against the delta, contract meaning, boundary fit. When the same semantic finding recurs across reviews, note once that it could become a detector rule.
Full reference: [principles/executable-architecture-guardrails.md](principles/executable-architecture-guardrails.md)

## Output Format

A `check-{{CHANGE-SLUG}}.md` file:

```markdown
# Change Review: {{CHANGE NAME}}

**Date:** YYYY-MM-DD
**Diff:** {{BRANCH}} against {{BASE}} | {{PULL REQUEST}}
**Inputs:** plan {{PLAN PATH (verify: approved | stale | unapproved | none)}} · spec {{SPEC PATH | none}} · tier {{low / moderate / high | none}} · detector {{N findings on changed lines}}

## Verdict
**{{GO | FIX}}** — {{ONE SENTENCE: WHY}}

## Items
| # | Kind | Where | Concerns | Finding | Fix |
|---|---|---|---|---|---|
| 1 | FIX: undeclared change | path/to/file:42 | Delta: {{NEAREST LINE, OR "none"}} | ... | ... |
| 2 | FIX: unchanged touched | path/to/file:88 | Unchanged: "{{ITEM}}" | ... | ... |
| 3 | FIX: missing amendment | {{SPEC PATH}} | Delta: Modified row 1 | ... | ... |
| 4 | Note: principle | path/to/file:17 | {{PRINCIPLE-ID}} | ... | ... |
{{IF CAPPED: N more items not shown, all of kind ...}}

## Delta Coverage
| Delta line | Implemented at | Test evidence |
|---|---|---|
| Added: ... | path/to/file:12 | {{TEST NAME | none}} |
| Unchanged: ... | {{TOUCHED AT path:line | not touched}} | {{TEST NAME | none}} |

## Decision
{{USER'S ANSWER: fix now | accepted as is (reason per item) | deferred | not yet asked}}
```

**Next step:** End your reply (not the artifact) with one recommended next command and why, worked out from what exists now (the router's Next steps table), never a list. On FIX: the next step is the user's answer to the FIX items, then fixing them and running `/groundwork check` again. On GO: merge through normal code review. If an undeclared change belongs in the delta, the next step is amending the plan (`/groundwork plan`) and getting it re-approved before merging.
