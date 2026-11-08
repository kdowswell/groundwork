# ADR-021: A learning loop: an append-only suggestion box and an on-demand `/groundwork learn` that proposes removals too

**Date:** 2026-11-08
**Status:** Accepted

## Context

groundwork's rules (context file, active principles, detector waivers, playbook steps) were written
once and only ever added to. The Thoughtworks Radar (Vol. 35) puts the *feedback flywheel* in
Trial: after each session, ask whether a shared artifact should change, and remove stale rules
and noisy sensors, not just add them. It puts *agent instruction bloat* in Caution. Every's
Compound Engineering is built around the same step. The Radar also assesses an *agent suggestion
box*: agents record friction with a rule instead of silently working around it.

SkillsBench found that self-generated skills scored lower than none (−1.3 points) on average. The
agent should propose and a person should curate.

## Decision

### Suggestion box (`groundwork suggest`)

`npx @kdowswell/groundwork suggest "<why>" [--rule=<id>] [--file=<path>] [--by=agent|user]`
appends one JSON line to `.groundwork/suggestions.jsonl`:

```json
{"date":"2026-11-08","rule":"swallowed-exception","file":"src/poll.js","why":"the catch is intentional: the caller retries","by":"agent"}
```

- **Committed, not ignored.** The file is a shared signal for whoever curates the rules, and code
  review shows each new line beside the waiver it explains.
- **Append-only.** Nothing rewrites earlier lines. A learn report's date marks the entries before
  it as reviewed, so "open" means "newer than the last report". Symlinked or dangling-symlink
  files are refused.
- `rule:router-suggestion-box` asks the agent to log every waiver or skipped playbook step once,
  in the same turn, and the hook's waiver hint says the same. Nothing blocks, and the hooks stay
  fail-open.
- `doctor` prints the count of open suggestions. It is a count, not a finding, so it never fails
  doctor.

### `/groundwork learn`

A hand-written router playbook (`reference/learn.md`, in `HAND_WRITTEN`).

- **Inputs:** `npx @kdowswell/groundwork learn --json` returns open suggestions and a waiver audit:
  inline `groundwork-disable` comments whose rule no longer fires where they point, and config
  ignores that match nothing (test files are skipped, preferring silence). The playbook adds the
  version-control history since the last report, `check` reviews, postmortems, and receipts.
- **Output:** `.groundwork/learn/<date>.md` with **Add / Change / Remove** proposals, each with its
  evidence and exact edit, plus a Watch list for weak signals. Removal is always considered.
- **Curation rule:** nothing is applied until the user picks proposals, and accepted edits go in
  the same change set. Principle content stays primary-sourced: a project example for a
  principle's "What Goes Wrong" section is flagged for the maintainer to source or reject, never
  written in on project evidence alone.
- **On demand only** (`rule:router-learn-on-demand`): never at the end of a task or session, never
  as a follow-up chore (DX rule 2). The session-start digest may say once that suggestions are
  open.

### Relationship to `doctor`

`doctor` reports drift between the context file and the repository and repairs on request.
`learn` improves the rules themselves: what the context says, which waivers exist, which rules
and steps need different wording. They share no state except the suggestion count `doctor`
prints.

## Consequences

- Waivers that suppress nothing get proposed for removal, so the rule set can shrink.
- Friction that would otherwise disappear into a quiet workaround becomes a dated, reviewable
  line.
- A suggestion box nobody reviews is just noise. The digest's one-time mention and doctor's
  count keep it visible without nagging.
