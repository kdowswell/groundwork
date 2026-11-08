# Learn (`/groundwork learn`)

**Activity:** Set up · **Time box:** 15-30 minutes

Look back over recent work and propose a **diff** to the project's shared rules: additions where
something was missing, changes where a rule was unclear, and **removals** where a rule, waiver, or
note has gone stale. You propose; the user curates. Nothing is written without their approval
(ADR-021). Run only when the user asks for it.

`doctor` reports drift between the context file and the repository. `learn` improves the rules
themselves.

## Steps

1. **Gather the deterministic inputs.** Run `npx @kdowswell/groundwork learn --json` from the
   project root. It returns the date of the last learn report, the suggestions logged since then
   (`.groundwork/suggestions.jsonl`), and waivers that no longer suppress anything: inline
   `groundwork-disable` comments whose rule no longer fires where they point, and
   `.groundwork/config.json` ignores that match nothing. If the CLI is unavailable, read the
   suggestions file directly and skip the waiver audit, and say so.

2. **Gather the recent work.** Read the version-control log and diff since the last learn report,
   or the range the user gives (default: the last two weeks). Read any `check-*.md` reviews and
   incident postmortems written in that range, and the approval receipts recorded in it
   (`npx @kdowswell/groundwork verify`). Keep the paths: every proposal cites its evidence.

3. **Find what should change, in three groups.**
   - **Add:** a decision the team keeps re-explaining that belongs in `.groundwork/context.md`
     (a stack fact, a glossary term, an active principle); a mistake that recurred in reviews and
     could become a detector rule (describe the pattern; prefer silence over false positives); a
     concrete project example for a principle's "What Goes Wrong" section, **flagged for the
     maintainer to source or reject**, because principle content stays primary-sourced.
   - **Change:** a rule, playbook step, or context line that suggestions show was unclear or
     didn't fit, with the wording that would have prevented the friction.
   - **Remove:** waivers from step 1 that suppress nothing; ignores that match nothing; context
     lines the repository contradicts or no longer needs; active principles nothing in the range
     touched for a long time; suggestions already resolved. Always look for removals: a shared rule
     set only gets better if stale rules leave as well as new ones arrive.
   Drop any proposal you can't tie to evidence. A suggestion logged once, with nothing else
   behind it, is a weak signal: list it as "watch" rather than proposing an edit.

4. **Write the report.** Write `.groundwork/learn/<today>.md` in the Output Format: each proposal
   with its group, evidence, and the exact edit (file, before → after). Keep it to the ten or so
   proposals that matter most and say how many you left out.

5. **Ask once.** In the same reply, list the proposals by number and ask which to apply. The user
   may accept all, some, or none.

6. **Apply only what the user accepts, in the same change set.** Make exactly the accepted edits,
   and note in the report which were applied and which were declined. Editing the context file
   here is the user's explicit request, so it isn't a drift repair. Never edit a principle file's
   sources or claims from project evidence; a "What Goes Wrong" example goes in only if the user
   accepts it and gives or approves a source. Leave `.groundwork/suggestions.jsonl` as it is: it is
   append-only, and this report's date marks the entries before it as reviewed.

## Checkpoints

**Which proposals does the user accept?**
Each proposal is applied only if accepted. **Accepted:** apply its exact edit in this change set.
**Declined:** record it as declined in the report so the next `learn` doesn't propose it again
without new evidence. **No answer:** apply nothing; the report stands as a record of proposals.

## Output Format

```markdown
# Learn: YYYY-MM-DD

**Range:** {{LAST REPORT DATE OR START}} → {{TODAY}} · **Inputs:** {{N}} suggestions, {{N}} unused waivers, {{N}} commits, {{N}} reviews

## Add
| # | Proposal | Evidence | Edit |
|---|---|---|---|
| 1 | ... | {{PATHS, SUGGESTION DATES}} | {{FILE}}: {{BEFORE → AFTER}} |

## Change
| # | Proposal | Evidence | Edit |
|---|---|---|---|

## Remove
| # | Proposal | Evidence | Edit |
|---|---|---|---|

## Watch
- {{WEAK SIGNAL, AND WHAT WOULD MAKE IT A PROPOSAL}}

## Decision
{{APPLIED: #… · DECLINED: #… · NOT YET ANSWERED}}
```

**Next step:** End your reply with one recommended next command and why: the user's choice of
proposals before they answer; after, usually `doctor` if context lines changed, or nothing.
