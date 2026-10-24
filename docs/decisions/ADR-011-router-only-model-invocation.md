# ADR-011: The router is the model's only entry point; phase skills are invoked by name

**Date:** 2026-10-24
**Status:** Accepted

## Context

ADR-002 made `/groundwork` the single entry point: the router loads project context, verifies
the artifacts a step builds on, and carries the rules that keep approvals the user's and the
CLI on its scoped name. `npx @kdowswell/groundwork install` follows it by installing only the
router unless `--all-skills` is passed.

The Claude Code plugin didn't. A plugin loads every skill under `skills/`, so it exposed all 15
phase skills beside the router, each with its description in the model's context and each
eligible for automatic invocation:

- **Cost.** `claude plugin details` projected about 1,560 always-on tokens per session; the
  router accounts for about 140 and the phase skills for about 1,420.
- **Rules bypassed.** A model that picks `greenfield-architecture-sketch` directly never runs
  the router's steps: no context load, no `verify` of the spec it builds on, no
  `rule:router-approval-is-the-users`, no `rule:router-cli-package`.

The manifest can't narrow this: a `skills` path in `plugin.json` adds to the default
`skills/` scan rather than replacing it. A marketplace entry that lists skills does narrow it,
but only for marketplace installs; `--plugin-dir` loading and `claude plugin eval` would still
see all 16.

## Decision

- Every phase skill sets **`disable-model-invocation: true`**. Per the Claude Code skills
  documentation, such a skill's "description [is] not in context, full skill loads when
  invoked", and the user can still run it by name (`/groundwork:greenfield-spec-from-idea`).
- The router stays model-invocable and is how the model reaches every phase, through its
  playbooks (generated from the same skills, ADR-003).
- `npm run validate:skills` enforces both: a skill with a `phase` must set the flag, and the
  router must not.

Verified in a live session: with the flag, the model's invocable skills from the plugin are
`groundwork:groundwork` only (16 before), and `/groundwork:greenfield-adr-setup` still loads
when typed.

## Consequences

**Positive:** about 90% less always-on context from the plugin, and every model-initiated path
goes through the router's rules. Same behavior under `--plugin-dir`, marketplace installs,
`claude plugin eval`, and `install --all-skills`, because the flag lives in the skill itself.
**Negative:** a user who installed phase skills with `--all-skills` to have them auto-invoked
loses that; they now run when typed by name. Harnesses that honor the Agent Skills field behave
the same way; harnesses that ignore it keep auto-invoking the phase skills.
**Neutral:** `claude plugin details` still projects the old always-on figure; it sums
descriptions without accounting for the flag.

## Alternatives Considered

- **A plugin-only directory holding just the router:** rejected. It would need a generated copy
  of the router, its references and scripts inside the repo, which is more generated surface
  for no behavior the flag doesn't already give.
- **List skills in the marketplace entry:** rejected as the only mechanism. It narrows
  marketplace installs but not `--plugin-dir` or plugin evals, so development and tests would
  run a different plugin than users get.
- **Stop shipping phase skills in the plugin:** rejected. Typing a phase skill by name is a
  useful direct path, and the standalone skills are also what `--all-skills` installs.
