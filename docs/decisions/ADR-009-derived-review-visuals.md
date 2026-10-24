# ADR-009: Review visuals derived from artifact structure, and diffs against the approved version

**Date:** 2026-10-23
**Status:** Accepted

## Context

ADR-008 shipped review pages that render the artifact's Markdown beside a decision panel, and
deferred diagrams: "a sanitizing path or diagrams generated from structured data are future
decisions."

The first real-project run (a 274-line spec, a 227-line architecture sketch) showed two gaps.

1. **The page is a wall of text.** A reviewer accepting a sketch has to rebuild the component
   map and data flow in their head from a table and a numbered list. Review pages in other
   tools lead with a picture of the thing being decided.
2. **A stale approval can't say what changed.** The spec changed between approval and the next
   step (most likely an editor's format-on-save). `verify` correctly refused the hand-off, but
   neither the agent nor the user could see the change: the file wasn't committed and there was
   no local history. The user had to re-approve blind.

The constraints from ADR-005 and ADR-008 still hold. The CLI has zero runtime dependencies, the
page runs no scripts and makes no network requests, and artifact text is untrusted.

## Decision

### 1. The CLI derives visuals from the sections playbooks already require

Each chain skill's Output Format fixes the section names and table columns of its artifact.
The renderer reads those sections and draws visuals from them as inline SVG and CSS. The agent
never authors a visual.

| Artifact | Section(s) read | Visual |
|---|---|---|
| Spec | Scope (In scope / Non-goals) | In and out side by side |
| Spec | Open Questions | Board by category (Blocking / Deferrable) with owners |
| Spec | Riskiest Assumption | Callout |
| Architecture | Components (+ optional `Runs on` column), Primary Data Flow | Component map: one lane per `Runs on` value; flow steps drawn as numbered hops between the components each step names |
| Architecture | External Dependencies, Sync / Async Boundary | Dependencies by severity; sync and async in two columns |
| Data model | Entities, Relationships | Entity-relationship diagram: layered layout (the "one" side above the "many" side), cardinality on each edge |
| Data model | Consistency Requirements | Boundaries grouped by requirement |
| All three | Builder Check | Resolution bar (answered in artifact / agent call / user) |

Rules for every visual:

- **Text stays authoritative.** A visual is placed above the section it summarizes and never
  replaces it. A table cell becomes a label, never markup: SVG text is escaped like everything
  else, and nothing from the artifact becomes an attribute other than an escaped label.
- **Absent or unrecognizable sections draw nothing.** No visual is better than a wrong one,
  the same silence-over-false-positives rule the detector follows. Hand-written artifacts
  render exactly as they do today.
- **Layout is deterministic and dependency-free.** Lanes and grids for the component map;
  longest-path layering plus one barycentric ordering pass for the entity diagram. Over a size
  cap (about 14 components or 16 entities), the visual degrades to grouped cards rather than an
  unreadable graph.
- **No scripts.** Inline `<svg>` is document markup, so the ADR-008 Content-Security-Policy is
  unchanged. Interactivity is limited to what HTML and CSS provide without script
  (`<details>`, anchors, `:target` highlighting).
- The architecture template gains an optional `Runs on` column on Components (device, backend,
  third party...). Without it, the map uses one lane.

### 2. Approvals keep a snapshot of what was approved

`groundwork approve` (and an in-page approval) writes the approved text next to the receipt as
`.groundwork/approvals/<receipt name>.snapshot`, committed with the receipt so any clone can
diff against it. Its SHA-256 must equal the receipt's `sha256`. A snapshot that doesn't match
is ignored, never trusted.

- `groundwork render` on a stale artifact opens with a **Changes since approval** view: a line
  diff (with the changed lines in context) between the snapshot and the current file.
- `groundwork verify` reports a stale artifact's change size (`+12 −3 lines`), and
  `verify --diff` prints the diff, so an agent can show the user what changed before re-asking
  the Checkpoint.
- Receipts written before this ADR have no snapshot. The page and `verify` say so and suggest
  re-approving; nothing else changes.

### 3. Principle coverage against the active set

When `.groundwork/context.md` lists Active Principles, the decision panel shows them against
the principles the artifact cites. An active principle the artifact never mentions is shown as
"not addressed", which is information, not an error: not every principle bears on every
artifact.

## Consequences

**Positive:** reviewers see the shape of what they are approving before reading the prose, and a
stale approval comes with the exact change. The visuals reward artifacts that follow the
template, so they reinforce the playbooks rather than competing with them.
**Negative:** more renderer code to maintain without dependencies, including a small graph
layout and a line diff. Artifacts that drift from the template lose their visuals silently.
Snapshots roughly double the committed size of approved artifacts (a few kilobytes each).
**Neutral:** Mermaid blocks in artifacts still render as code. Rendering a Mermaid subset, or
any agent-authored diagram, is a separate decision.

## Alternatives Considered

- **Let agents write diagrams (Mermaid or SVG) in the artifact and render them:** deferred.
  Mermaid needs a JavaScript renderer (ADR-005, ADR-008), and agent-authored SVG reopens the
  injection surface ADR-008 closed. It also spends agent tokens on something derivable.
- **Allow a pinned, inlined script for interactive diagrams:** rejected for now. The page would
  stop being inert, the decision form would share a page with code, and the visuals above do
  not need interaction.
- **Diff against git history instead of a snapshot:** rejected as the primary source. In the
  run that motivated this ADR, the artifact had never been committed. Git digests also don't
  match ADR-007's normalized SHA-256, so finding the approved version would mean hashing every
  past revision.
- **Keep snapshots out of git (in `.groundwork/review/`):** rejected. A collaborator who pulls a
  stale receipt couldn't see what changed, which is the case that most needs the diff.
