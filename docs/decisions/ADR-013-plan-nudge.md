# ADR-013: Nudge toward a plan when unplanned code grows, with an opt-in strict gate

**Date:** 2026-10-24
**Status:** Accepted

## Context

groundwork's planning skills only help if they're used before the code is written. Nothing today
notices when a session is several files into an unplanned change. The research list proposed a
"phase gate" that blocks implementation until a spec or plan is approved.

ADR-012's design constraint rules that out as a default: advise by default, block rarely, ask at
most once at a natural moment, and make anything heavier opt-in. Most edits are small fixes that
need no plan, and a gate that fires on them teaches people to ignore or disable it.

## Decision

### Default: a once-per-session nudge

The lifecycle hook (ADR-006) counts the distinct source files a session changes. When all of these
hold, it adds one note to the agent's context, once per session:

- the project is a groundwork project (`.groundwork/context.md` exists);
- the session has changed **3 or more distinct source files** (code extensions; not docs or
  config); and
- **no planned work is visible**: no approved change plan whose delta is still to be applied, and
  no approval, delegation, or amendment recorded in the last 14 days.

The note asks the agent to mention once, in its next reply, that `/groundwork plan <change>` can
capture the change (its behavior delta, risk, and rollback), that it's optional for small changes,
and then to carry on with the user's request without stopping or waiting for an answer. Nothing is
blocked and nothing is shown to the user directly.

The two thresholds stand in for "this is no longer a small fix" and "this work wasn't planned".
A recent approval of any artifact counts as planning, which covers building from a freshly
approved greenfield spec. Both are configurable.

### Opt-in: strict mode

Teams that want a hard gate set it in `.groundwork/config.json`:

```json
{ "planGate": { "mode": "strict", "afterFiles": 3 } }
```

In strict mode, the Stop hook blocks once per turn in the same situation, asking the agent to
write a change plan, or to tell the user that strict mode requires one, before finishing. It uses
the existing Stop-hook guard (`stop_hook_active`), so it can't loop, and it combines with the
detector's block into one message. `"mode": "off"` disables both the nudge and the gate.
`"mode": "nudge"` is the default.

This amends ADR-006's rule that the Stop hook blocks only on `error` findings: it may also block
for a strict plan gate, and only when a team turned it on.

## Consequences

**Positive:** unplanned multi-file changes get one timely suggestion to plan, at the moment it is
still cheap to do. Small fixes and planned work are never interrupted.
**Negative:** the thresholds are heuristics. A large planned change with an old approval gets one
unnecessary note per session, and three files of genuinely trivial edits can trigger it. The note
reaches the user only through the agent's reply, so its wording depends on the agent.
**Neutral:** the hook now keeps a small per-session record (files changed, whether it nudged) beside
its existing per-turn ledger, pruned on the same schedule.

## Alternatives Considered

- **Block implementation until a plan is approved (the original phase gate):** rejected as a
  default. It stops every small fix, and violates "advise by default; block rarely". Kept as the
  opt-in strict mode.
- **Nudge on the first source edit:** rejected. Most sessions with one or two edits are fixes; a
  note on each would be noise and would be ignored.
- **Show the nudge to the user directly (a system message) instead of the agent:** rejected. The
  agent can judge whether the work is already planned elsewhere and phrase one sentence in
  context; a fixed banner can do neither.
- **Detect planned work by matching edited files to plans:** rejected for now. Plans name files
  loosely, and a wrong match would either nag or stay silent unpredictably. Recency of approvals is
  a simpler signal that fails gently.
