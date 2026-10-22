# ADR-008: Generated HTML review views over Markdown sources

**Date:** 2026-10-22
**Status:** Accepted

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

- `groundwork render <artifact.md>` renders a self-contained HTML page into
  `.groundwork/review/` (git-ignored by a generated `.gitignore`): inline CSS, light/dark via
  `prefers-color-scheme`, no scripts, fonts or network requests (enforced by a
  Content-Security-Policy), built with `node:` builtins only (ADR-005). The command is named
  `render`, not `review`, because `/groundwork review` is already the router's brownfield
  architecture-review command.
- The renderer supports a deliberate Markdown subset and treats the artifact as untrusted:
  all text is HTML-escaped, raw HTML (including inline SVG, which can carry script) is never
  passed through, and links survive only for http(s), mailto, anchors and relative paths.
- Beside the document, a decision panel shows what a reviewer needs to accept or push back:
  current approval status (ADR-007), open questions for the user (builder-check rows
  resolved as "User:" and blocking open questions), whether the artifact rests on a
  "Working Spec (unapproved)", the principles it cites (exact principle ids), and detector
  findings for project files it names.
- `groundwork render --serve` serves the page on 127.0.0.1 at an ephemeral port. Approve /
  Request changes are plain form posts that write the ADR-007 receipt with
  `decidedBy: "user"`. There is no delegate button: the browser is the human's channel.
  The server requires a per-session random token, accepts only its own Host and Origin
  (against DNS rebinding and cross-site posts), and refuses the decision when the file's
  digest no longer matches what was rendered. It exits after one decision or 30 idle
  minutes. Without `--serve`, the page is read-only and shows the commands to decide.
- The checkpoint an approval records comes from the artifact's title (`Spec:`,
  `Architecture:`, `Data Model:` map to the three chain skills' `/accept` checkpoints), or
  from `--checkpoint`.
- Agents never read the HTML. Playbooks keep referencing the Markdown. At a spec, sketch, or
  data model's acceptance Checkpoint, the router and the three chain skills offer the page
  once, but only when the artifact is long (about 80+ lines) or has open questions for the
  user (`rule:router-offer-render`). The agent starts the server only with the user's
  go-ahead and never submits the form. A decision made in the page is already recorded, so
  the agent confirms it with `verify` rather than recording it again.

## Consequences

**Positive:** humans get a decision-shaped view without the artifact forking into two
sources. The approval path from ADR-007 gets a human-friendly front end that can't approve
something other than what was shown.
**Negative:** a Markdown-to-HTML renderer must be written and maintained without
dependencies, so it will support a deliberate subset of Markdown. A local server is new
attack surface; it is bound to loopback, gated by a per-session token plus Host/Origin
checks, and exits after one decision or an idle timeout.
**Neutral:** no diagrams in this version. Inline SVG from the source is escaped rather than
rendered, because passing it through would reopen script injection; a sanitizing path or
diagrams generated from structured data are future decisions.

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
