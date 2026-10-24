# ADR-012: Brownfield changes carry a behavior delta, and the spec update rides with the code

**Date:** 2026-10-24
**Status:** Accepted

## Context

Greenfield work ends with an approved spec, sketch, and data model (ADR-007), reviewable as pages
(ADR-008, ADR-009). Brownfield work starts from there, and loses the thread:

- `brownfield-safe-change-plan` (`/groundwork plan`) asks for "one paragraph: what is different
  about the system after the change". It plans the *how* well (blast radius, detection,
  rollback, rollout) but leaves the *what* as prose. Nothing says which existing behavior
  changes, which must stay the same, or which approved spec the change departs from.
- Nothing keeps the spec current. After the first shipped change, `docs/spec.md` describes a
  system that no longer exists, and the next change plans against stale intent.
- The plan has no acceptance Checkpoint of its own, so it can't be approved, verified at
  hand-off, or reviewed as a page the way a spec can.

Spec-driven tools describe a change as a **delta** (added, modified, removed requirements)
against the current spec and merge it back when the change is done; OpenSpec's change proposals
are the clearest example. They merge *after* the change, as a separate step. In a pull-request
workflow that step has no natural moment: a PR sits in review, merges days later, and by then
the developer is on other work. A follow-up "now update the spec and approve it again" is
either forgotten or arrives as an interruption.

### Design constraint: enable, don't obstruct

groundwork should make the well-grounded choice the easy one without getting in the way of
normal development. This ADR adopts these rules, and they apply to later features too:

1. **Advise by default; block rarely.** There are two hard stops and they stay the only kind:
   the Stop hook on an `error` finding, once per turn (ADR-006), and declining to build on an
   unapproved or changed artifact, which asks the user rather than refusing (ADR-007).
2. **Ask at most once, at a natural moment:** before building, or in the pull request. Never as
   a follow-up chore after the work is done.
3. **Documentation changes travel in the same change set as the code they describe.** No
   separate documentation step that can drift out of sync with the branch.
4. **Approvals gate intent before code exists.** Once code is being written in a branch, code
   review is the gate; groundwork adds no ceremony on top of it.
5. **Anything heavier is opt-in:** the review page, `--all-skills`, and any future gate that
   would stop work.

## Decision

### 1. The change plan opens with a Behavior Delta

`brownfield-safe-change-plan` replaces its free-text Change Description with a structured
delta, written before blast radius and rollback (which then reason about exactly these items):

```markdown
## Behavior Delta
Baseline: docs/spec.md (approved 2026-10-23) | observed behavior (no spec): <evidence paths>

### Added
- <new behavior, as a requirement>

### Modified
| Before | After | Spec reference |
|---|---|---|
| <current behavior> | <new behavior> | <section in the baseline> |

### Removed
- <behavior that goes away, and who relied on it>

### Unchanged (must keep working)
- <adjacent behavior this change must not alter>
```

- **Baseline.** When the system has a spec, the plan names it and runs `verify` on it, as
  `rule:router-verify-handoff` already requires. A stale or unapproved baseline is reported to
  the user, not silently used. With no spec, the baseline is *observed behavior*, and each
  Before cites where it was observed (code paths, tests, docs).
- **Unchanged** is required. It is where the adjacent regression tests come from, and the part
  of a change most often left implicit.
- Each Modified and Removed item cites the baseline section it changes, so applying the delta to
  the spec is mechanical.
- Small changes get a small delta. A one-line change with one Unchanged item is a complete plan.

### 2. The plan is a chain artifact

Like the greenfield three: a builder check before acceptance (ADR-007), an acceptance
Checkpoint recorded as
`npx @kdowswell/groundwork approve <plan> --checkpoint=brownfield-safe-change-plan/accept`,
and the review-page offer when the plan is long or has open questions (`rule:router-offer-render`).
This is the one approval a change asks for, and it happens before code is written.

### 3. The spec update rides with the implementation

When the agent implements an approved plan, applying the delta to the baseline spec is part of
the implementation, in the same branch and change set as the code, the way a test update is:

- The pull request shows the code and the spec change together, so reviewing the PR reviews
  the documentation. A PR that waits in review keeps its spec change with it; an abandoned PR
  abandons it; a merged PR leaves `main`'s spec describing `main`'s behavior.
- Two parallel changes to the same behavior conflict in the spec file. That is a useful signal,
  resolved like any merge conflict.
- With no baseline spec, nothing is edited. The agent may offer once to start a spec from the
  delta's After and Unchanged items, and drops it if declined.

### 4. An amendment is recorded, not re-approved

The user approved the delta when they approved the plan. Applying it to the spec doesn't ask
again. Instead the agent records the spec's new version as an amendment:

```bash
npx @kdowswell/groundwork approve docs/spec.md --decision=amended --via=<plan path>
```

- The receipt is labeled `decidedBy: "agent-amended"` and names the plan and the plan
  receipt's digest. It never reads as the user's approval, the same way delegated decisions are
  labeled today.
- `verify` treats an amended spec as current only while that plan's own approval is fresh. If
  the plan changes after approval, the amendment no longer stands and the spec reads as changed.
- The snapshot kept with the receipt (ADR-009) lets the review page and `verify --diff` show the
  spec's change beside the plan's delta, so a reviewer can check they match. Final review of the
  spec edit is the pull request.

### 5. Review pages draw the delta

`groundwork render` recognizes `# Safe Change Plan:` (checkpoint
`brownfield-safe-change-plan/accept`) and, following ADR-009's rules (derived from the template
sections, silent when a section is absent), draws:

- the baseline and its status (approved, amended by a plan, changed, unapproved, or observed
  behavior);
- the delta as Added / Modified (before → after) / Removed / Unchanged columns;
- blast radius severity and one-way doors as callouts beside the rollback steps.

## Consequences

**Positive:** a brownfield change states exactly what it changes and what it must not. The spec
stays true to the running system without a separate documentation step or a second prompt, and
the documentation is reviewed where the code is. The approval chain extends from greenfield into
every later change.
**Negative:** the plan is longer than one paragraph. Changes with no spec need evidence for each
Before. `approve` gains a decision (`amended`) whose validity depends on another receipt, which
`verify` must check.
**Neutral:** the other brownfield skills (strangler fig, dependency upgrade) are unchanged for now
and can adopt the Behavior Delta section later. The phase gate proposed in earlier research must
be redesigned against the design constraint above before it is built: as a nudge by default and
an opt-in hook for teams that want it strict.

## Alternatives Considered

- **Fold the delta back after the change ships, then re-approve the spec:** rejected. In a PR
  workflow there is no natural moment for it; it becomes a forgotten chore or an interruption,
  and the spec drifts in the meantime.
- **Separate per-change spec files merged by tooling (OpenSpec's `changes/` and archive):**
  rejected. It needs a merge tool and a directory convention, and still merges after the fact.
- **Re-ask the user to approve the edited spec:** rejected. The user already approved the delta;
  asking again adds a prompt without adding information, and code review covers the edit itself.
- **Deltas only, no spec update:** rejected. Specs would describe the original system forever,
  and every later change would plan against stale intent.
- **A new `brownfield-delta-spec` skill and router command:** rejected for now. The delta and the
  safety plan describe the same change; splitting them doubles the artifacts and approvals.
