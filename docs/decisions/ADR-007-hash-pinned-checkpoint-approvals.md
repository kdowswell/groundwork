# ADR-007: Hash-pinned checkpoint approvals and a builder check

**Date:** 2026-10-22
**Status:** Accepted

## Context

Skill Checkpoints are required to be genuine decision forks (CLAUDE.md), but nothing records
how a fork was resolved or notices when the approved artifact changes afterwards. An agent can
"approve" on the user's behalf, edit the spec after approval, and carry on into implementation
against something the user never saw. The approval exists only in chat scrollback, which
compaction and new sessions discard.

Two external patterns address this:

- **Impeccable's review packets** pin a reviewed spec by SHA-256. Its build refuses to advance
  a phase until an accepted review exists *and* the current spec's digest equals the reviewed
  one; a later change requires a new round, and unchanged decisions carry over.
- **Superpowers v7's "builder check"**: before asking the user anything, a fresh subagent reads
  the design as the person who will build it and lists what they would still need to ask. Only
  questions that change what gets built reach the user, in one round.

## Decision

We will record each resolved Checkpoint as an **approval receipt** under
`.groundwork/approvals/`, one JSON file per approved artifact:

```json
{
  "artifact": "docs/specs/orders-service.md",
  "sha256": "<digest of the artifact at approval time>",
  "checkpoint": "greenfield-spec-from-idea/scope",
  "decision": "approved | changes-requested | delegated",
  "decidedBy": "user | agent-delegated",
  "date": "YYYY-MM-DD",
  "notes": "free text"
}
```

- `groundwork approve <artifact> --checkpoint=<id>` writes the receipt, and
  `groundwork verify` reports every receipt whose artifact digest no longer matches (stale)
  or whose artifact is gone. `groundwork verify <artifact>` exits 0 only when that artifact
  has a fresh receipt whose decision lets work proceed (`approved` or `delegated`).
  `doctor` includes verify output.
- The digest is computed with CRLF normalized to LF, so a git `autocrlf` checkout does not
  invalidate every receipt. No other normalization is applied.
- Playbooks that hand off to a later phase (spec → architecture → implementation, ADR → build)
  check the predecessor artifact's receipt before starting. A missing or stale receipt is
  reported and the Checkpoint re-asked. It does not block silently, and the agent never
  writes a `decidedBy: "user"` receipt itself.
- A delegated choice ("you pick") is recorded as `decision: "delegated"`,
  `decidedBy: "agent-delegated"`, and disclosed in the agent's next reply.
- Before presenting a spec or architecture Checkpoint, the playbook runs a **builder check**:
  an isolated reviewer reads only the artifact, as its implementer, and returns open
  questions. The agent resolves what it can (labelling its own calls) and brings the user only
  questions that change what gets built.

Receipts are committed to the repository. They form the durable decision trail between ADRs
(which record *why*) and code (which records *what*).

**Implementation order:** the receipt format and the `approve`/`verify` CLI land first, together
with the router's Approvals rules (`router-approval-is-the-users`, `router-verify-handoff`,
both covered by live behavior tests) and the hand-off chain spec → sketch → model. Each of
those skills ends with an acceptance Checkpoint and a record step; sketch and model start by
verifying their predecessor. The builder check followed as its own change. It runs in all
three chain skills (spec, sketch, data model) just before the acceptance Checkpoint, and each
artifact records it in a Builder Check section. The Claude Code plugin ships a read-only
`groundwork-builder` reviewer agent (`agents/`) for the isolated read. Harnesses without
subagents fall back to a deliberate cold read by the same agent.

## Consequences

**Positive:** approvals survive sessions and compaction. Post-approval drift becomes
mechanically detectable. Delegated decisions are visible rather than indistinguishable from
user approval. The builder check reduces Checkpoint round-trips to one.
**Negative:** a new CLI surface (`approve`, `verify`) and a new directory consumers must
understand. Cosmetic edits to an approved artifact also invalidate its receipt. That is
deliberate, since re-approval of an unchanged decision is cheap, but it adds friction.
**Neutral:** enforcement is advisory in this ADR (router rule, playbook steps, `verify`,
`doctor`). A hard gate (a Claude Code mod holding edits until the current Checkpoint has a
fresh receipt) is a follow-up decision once the receipt format has settled.

## Alternatives Considered

- **Status quo (prose Checkpoints only):** rejected. No durability, and no drift detection.
- **Git commits as approvals (approval = a commit touching the artifact):** rejected. It
  can't tell user approval from agent edits, and it couples groundwork to commit hygiene.
- **Record approvals inside `.groundwork/context.md`:** rejected. Context is durable project
  truth (ADR-004), not a per-artifact decision log, and it would churn on every approval.
- **Normalize content before hashing (ignore whitespace and formatting):** deferred. It adds
  rules to explain. Start strict and relax with evidence.
