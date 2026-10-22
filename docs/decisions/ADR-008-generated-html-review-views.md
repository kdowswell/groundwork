# ADR-008: Generated HTML review views over Markdown sources

**Date:** 2026-10-22
**Status:** Proposed

## Context

groundwork's artifacts (specs, architecture docs, ADRs, tradeoff analyses) are Markdown,
which is the right format for agents to read and diff. Humans reviewing a Checkpoint, though,
scroll a long Markdown file in a terminal or editor with no structure for the decision they
are being asked to make: which options exist, which principles each one cites, what the
detector found, what is still open.

The surrounding tools have moved toward HTML for the human side. Impeccable renders decision
and review pages (dark-mode aware, with approve/revise controls that write a receipt), and
Superpowers v7 offers a browser "visual companion" whenever visuals beat text. The
counter-position, widely quoted from Karpathy, is that agents should get Markdown documents
rather than HTML written for humans. Both are right, for different readers.

## Decision

Markdown stays the single source of truth. HTML is a **generated, disposable view** of it,
the same source-to-generated relationship ADR-003 uses for router playbooks.

- `groundwork review <artifact.md>` renders a self-contained HTML page into
  `.groundwork/review/` (gitignored): inline CSS, light/dark via `prefers-color-scheme`, no
  external scripts, fonts or network requests, built with `node:` builtins only (ADR-005).
- The page presents structure the Markdown implies: Checkpoints as decision cards with
  their options and downstream consequences, cited principles linked to their files, open
  questions from the builder check (ADR-007), and current detector findings for files the
  artifact names.
- `groundwork review --serve` starts a localhost-only server on an ephemeral port. Its
  approve / request-changes controls write the ADR-007 receipt, pinned to the digest of the
  Markdown that was rendered. If the source changed since render, the server refuses the
  approval and asks for a re-render. Without `--serve`, the page is read-only.
- Agents never read the HTML. Playbooks continue to reference the Markdown, and the router
  offers `review` at Checkpoints only when an artifact is long enough to benefit.

## Consequences

**Positive:** humans get a decision-shaped view without the artifact forking into two
sources. The approval path from ADR-007 gets a human-friendly front end that can't approve
something other than what was shown.
**Negative:** a Markdown-to-HTML renderer must be written and maintained without
dependencies, so it will support a deliberate subset of Markdown. A local server is new
attack surface; it is bound to loopback, unauthenticated, and exits after one decision or
an idle timeout.
**Neutral:** diagrams are rendered only when the source already contains them as inline SVG.
Generating diagrams from prose is out of scope for this ADR.

## Alternatives Considered

- **HTML as the primary artifact format:** rejected. It is worse for agent reading, diffing
  and review in pull requests, and it would contradict the principle that agents consume
  Markdown.
- **Commit rendered HTML alongside sources (like playbooks):** rejected. Review views are
  per-moment ephemera, and committing them invites stale views that disagree with their source.
- **Depend on a Markdown library or a diagram renderer via CDN:** rejected. It violates
  ADR-005's zero-runtime-dependency policy, and CDN loads break offline review.
- **Hosted pages (publish the review to a URL):** deferred. Useful for team review but
  outward-facing; it can be layered on top of the local render later.
