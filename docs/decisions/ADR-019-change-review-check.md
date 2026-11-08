# ADR-019: `/groundwork check` reviews a finished change against its approved plan: advisory, diff-scoped, no edits

**Date:** 2026-11-08
**Status:** Accepted

## Context

A change plan is approved once, before code (ADR-012), and the detector catches mechanical gaps in
whatever gets written (ADR-005). Nothing compared the code that was actually written with what was
approved. The detector can't see "the plan said refunds stay unchanged, and the refund path changed
with no test". The high risk tier (ADR-018) recommends a review step in the pull request, but there
was no such step.

Diff-scoped review is common elsewhere: Trail of Bits' differential review, Addy Osmani's `/review`,
`/ship`-style GO / NO-GO checks. The Thoughtworks Radar (Vol. 35) assesses *agent pipeline
responsibility* and recommends exposing the signals developers use to agents.

## Decision

Add the phase skill `brownfield-change-review`, routed as `check`. It reads a diff (a branch against
its base, or a pull request), the approved plan's Behavior Delta, Risk Tier, and Red Flags, the
baseline spec, the active principles, the glossary, and detector findings on the changed lines.
It writes `check-<slug>.md` with a **GO** or **FIX** verdict and at most about ten items, each with
file:line and the delta line or principle id it concerns.

Scope rules:

- **Advisory.** It runs on request or in the pull request. It adds no stop, records nothing with
  `approve`, and never blocks a merge. Code review stays the gate (DX rule 4).
- **Diff-scoped.** It reviews what the change introduced, not the whole system; that's `review`.
  The risk tier sets the depth: hunks for low, surrounding functions for moderate, whole files and
  one hop of callers for high.
- **No edits.** It never changes code, the plan, or the spec. If the user chooses to fix items, that
  is ordinary work afterwards. A fix that changes behavior beyond the delta means amending and
  re-approving the plan first.
- **No plan isn't a stop.** Without a plan it reviews against the spec and principles and calls
  behavior changes "unplanned".

FIX items are the ones that matter before merge: undeclared changes, Unchanged code touched without
a test, a missing spec amendment (`rule:router-delta-rides-with-code`), delta lines never
implemented, detector errors, and principle violations that break a contract or a stored data shape.

## Consequences

- The high risk tier's advice now has a concrete command behind it, and the next-steps table
  suggests `check` after a high-risk plan is implemented.
- The plan's Red Flags and the glossary get a second use, at review time.
- A semantic finding that recurs across reviews is a candidate detector rule, which keeps the
  model-judged part of the review small.
