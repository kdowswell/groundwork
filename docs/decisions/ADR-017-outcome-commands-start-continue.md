# ADR-017: Outcome commands `start` and `continue`: chained playbooks, deferred approvals, one decision with a receipt per file

**Date:** 2026-11-08
**Status:** Accepted

## Context

A greenfield design took five or six invocations (`init`, `principles`, `spec`, `architecture`,
`data-model`, `adr`) and three or four separate approvals, and until ADR-016's next-step line no
command said what to run next. Someone who stopped after `spec` got no architecture at all.

The opposite failure is a mandatory pipeline. Tools that force one sequence are too rigid for
much real work, and the Thoughtworks Radar (Vol. 35) cautions against heavyweight methodology
frameworks. groundwork's own rule is to ask at most once, at a natural moment, but the
multi-command flow asked once per artifact.

## Decision

### Two router-level playbooks

`reference/start.md` and `reference/continue.md` are written by hand, like `init` and `doctor`,
and `HAND_WRITTEN` in `scripts/router-commands.ts` keeps `sync:router` from touching them. The
individual commands stay for depth and rework; these two become the default design path, and the
status-first menu suggests them (`start` when nothing exists, `continue` when several design
documents are missing or unsettled).

- **`start <idea>`** sizes the work, then drafts spec → architecture → data model, plus a Proposed
  ADR for each decision that was really made. With no project context it records inferred
  defaults instead of running the `init` interview.
- **`continue`** reads each design document's state and acts on it: missing → draft it; draft or
  changes requested → finish it; approved → build on it without loading its playbook or asking
  again; changed since approval → show `verify --diff` and include it in the approval round.

### The chain is an exception to one playbook per request

`rule:router-one-playbook` stays the default. `rule:router-start-chain` allows `start` and
`continue` to load the design playbooks **strictly one at a time**, writing each document to its
own file before reading the next playbook. The files on disk are the handoff between phases, so
earlier conversation doesn't need to stay in context; where a runtime offers subagents, each
document may be drafted in its own. Behavior tests assert the order (the spec is written before the
architecture playbook is read). A first run showed a small model reading all three playbooks up
front, which is why the rule spells out the sequence.

### Deferred checkpoints and one fresh-eyes review

Each playbook's own Checkpoints and fresh-eyes review are deferred during the chain: their
questions are collected, missing inputs become labeled "Agent call" assumptions, and nothing stops
mid-chain. One fresh-eyes review then reads every document together as the builder. It also looks
for contradictions between documents, which the per-artifact review can't see. Its questions and
the deferred Checkpoints become **one** round in the reply that delivers the bundle.

### One decision, a receipt per file

The user makes one decision. The CLI records it as one receipt **per artifact** so `verify`,
staleness, the review page, and later plan deltas keep working per file:

```bash
npx @kdowswell/groundwork approve docs/spec.md docs/architecture.md docs/data-model.md
```

With several files, each receipt takes its own kind's acceptance checkpoint (from its H1) unless
`--checkpoint` is given, and every receipt carries the same decision, the same date, and a `bundle`
field listing the files the decision covered. Everything is validated before anything is written,
so a bad path leaves no partial bundle. An amendment (`--decision=amended`) still applies one plan
to one artifact and can't be bundled. Older receipts and single-file approvals are unchanged.

If the user approves some documents and asks for changes on others, each group is recorded with its
own decision.

## Consequences

- A user can go from an idea to approved design documents with one command and one answer.
- `verify`, `doctor`, the hook's pending-delta check, and render are unaffected: they read one
  receipt per file, as before.
- A `start` run is long. Sizing (step 2) and the playbooks' output caps keep small ideas small.
- The review page still shows one document at a time. `start` offers one page per long document
  rather than a combined page; a multi-document page is follow-up work.
- A drop-off eval (`eval/plugin/dropoff-start` vs. `eval/plugin/dropoff-spec-only`) gives the same
  idea to `start` and to a user who runs only `spec`, with the same graders, so the score gap
  measures the completeness and approvals lost by stopping early.
