# Context Doctor (`/groundwork doctor`)

**Phase:** Setup · **Time box:** 5-15 minutes

Report drift between `.groundwork/context.md` and observable reality, then repair only what
the user approves. Doctor is the only command allowed to modify the context file outside of
`init` — other commands report drift but never act on it.

## Steps

1. **Run the deterministic checks first.** If the groundwork CLI is available, run
   `npx groundwork doctor --json` and use its findings as the baseline. If not, perform the
   same checks manually: context file exists, `Last reviewed` date parses and is under 90 days
   old, Active Principles section is non-empty, and every active principle id exists in the
   principle library (synced copies live in `reference/principles/`).

2. **Cross-examine the context against the repository.** For each section, look for observable
   contradictions:
   - **Stack** — manifests, lockfiles, and configs name languages or datastores the context
     omits (or vice versa).
   - **Team** — active committers in recent history vs. recorded team size.
   - **Delivery** — CI configuration, feature-flag usage, and release tags vs. recorded process.
   - **Stage** — production deploy workflows or incident artifacts while stage says
     ideation/discovery; or "maintain" with no deployment evidence.
   - **Quality bar** — recorded coverage or review policy vs. test directories and branch
     protection evidence available locally.

3. **Assess active principles for fit, not just existence.** Flag principles whose
   `applies_when` no longer matches the recorded scale/stage (e.g., enterprise-only principles
   on a solo prototype, or a maintain-stage system with no operations principles selected).

4. **Present the drift report.** Every finding gets: what the context says, what the evidence
   shows, severity (stale / contradicted / missing), and the proposed one-line fix. Findings
   are a report, not a work queue — propose, do not apply.

5. **Repair only on explicit approval.** Apply exactly the fixes the user approves, update
   `Last reviewed` to today, and re-run the deterministic checks to confirm the file is clean.

## Checkpoints

**Is the drift real or just undocumented nuance?**
"Context says 2 engineers, git shows 9 committers" may be contractors, bots, or a platform
team passing through. Present evidence with the finding so the user can judge — never state a
contradiction as fact when it is an inference.

**Did the user ask for a repair, or only a report?**
If doctor was invoked from another command's drift warning, default to report-only and say how
to apply fixes. Unrequested edits to the context file are worse than stale context, because
they silently change what every later command does.

## Output Format

A drift report (in chat, or `.groundwork/doctor-report.md` if the user wants it saved):

```markdown
# Context Drift Report — YYYY-MM-DD

| # | Section | Context says | Evidence shows | Severity | Proposed fix |
|---|---------|--------------|----------------|----------|--------------|
| 1 | ...     | ...          | ...            | stale    | ...          |

Applied fixes: (none | list)
Last reviewed: updated to YYYY-MM-DD (only if repairs were applied)
```
