# ADR-006: Plugin-shipped lifecycle hooks with a single fail-open dispatcher

**Date:** 2026-10-22
**Status:** Accepted

## Context

ADR-005 gave groundwork a deterministic detector, but the only way it reached an agent session
was a PostToolUse hook that `groundwork install --hooks` writes into
`.claude/settings.local.json`. Installing groundwork as a Claude Code plugin wired no hooks at
all, and the one hook that existed only saw a single file at a time: findings reported mid-turn
could be ignored and still be present when the agent declared the work done. Project context
(ADR-004) reached the session only when the router skill ran, so ordinary edits in a
groundwork-initialized repo never saw the project's Active Principles.

Impeccable (4.5–4.7) ships its hooks inside the plugin (`hooks/hooks.json`) across three
lifecycle events (SessionStart, PostToolUse after Edit/Write, and a Stop "deep pass"), all
routed through one command that dispatches on the event.

## Decision

We will ship `hooks/hooks.json` at the plugin root, registering one dispatcher,
`skills/groundwork/scripts/hook.mjs`, for three events. The dispatcher branches on the
event's `hook_event_name` (absent means PostToolUse, for compatibility with existing installs):

- **SessionStart:** when `.groundwork/context.md` exists within the repository boundary, inject
  a compact digest (context path, staleness reasons, Active Principle ids, Proposed ADRs).
  This is a digest, not the full file; the router still loads the full context on demand. With
  no context file, it stays silent and does not suggest `/groundwork init` from a hook.
- **PostToolUse (Edit|Write|MultiEdit):** unchanged per-file scan, plus append the edited path
  to a per-session ledger in per-user state (`$XDG_STATE_HOME/groundwork/hooks`, default
  `~/.local/state/groundwork/hooks`, created 0700). It is never stored in the shared temp
  directory, where another local user could pre-create the directory or plant symlinks.
- **Stop:** re-scan every file in the ledger. Unresolved `error` findings block the stop
  **once** with the list as the reason. `stop_hook_active` suppresses a second block, so the
  hook can never loop. Remaining `warn` findings go to the user as a non-blocking
  `systemMessage`. The ledger is cleared on every Stop.

`groundwork install --hooks` registers the same three events in `settings.local.json`
(never the shared `settings.json`), idempotently per event.

Every path stays fail-open: any internal error exits 0 with no output. A broken groundwork
hook must never block an agent, and we deliberately do not use `onFailure: "block"`.

## Consequences

**Positive:** plugin installs get enforcement with no extra step. Detector `error` findings
can no longer survive a turn unnoticed. Active Principles reach every session in an
initialized repo, not just router invocations. One script means one engine-resolution path
and one test surface.
**Negative:** the Stop block costs one extra agent turn whenever an `error` finding is real
but intentional and unwaived. A user with both the plugin and `install --hooks` runs every
hook twice, which the docs must call out.
**Neutral:** the ledger lives in per-user state keyed by session id. Sessions that never reach
Stop leave small files that are pruned after a day at the next SessionStart.

## Alternatives Considered

- **Keep hooks installer-only:** rejected. Plugin users, the primary Claude Code
  distribution, got nothing.
- **Separate script per event:** rejected. It triples the engine-resolution and fail-open
  boilerplate for no isolation benefit.
- **Run the full repository scan (posture rules) at Stop:** rejected for now. Posture rules
  describe the repository, not the turn, so they'd repeat the same findings every turn.
  `groundwork detect` and CI already cover them.
- **Block Stop on `warn` findings too:** rejected. It conflicts with ADR-005's
  silence-over-false-positives stance, and warnings were already surfaced at edit time.
- **Inject the full context file at SessionStart:** rejected. It duplicates the router's
  context load and spends tokens in sessions that never touch architecture.
