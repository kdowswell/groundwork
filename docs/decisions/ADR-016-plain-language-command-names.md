# ADR-016: Plain-language command names, one activity vocabulary, and plain words for users

**Date:** 2026-11-08
**Status:** Accepted

## Context

Seven router commands made sense only once you already knew groundwork: `sketch`, `model`, `vet`,
`assume`, `triage`, `retro`, and `strangle`. `model` actively misled people in AI-heavy codebases,
where it reads as an LLM. Phases had two names: the router said Define / Explore / Evolve, while
skill names and docs said greenfield / exploration / brownfield. Agent messages also used terms
from inside the toolkit, such as "checkpoint", "receipt", "behavior delta", and "builder check".

The roadmap adds several commands (`threat`, `check`, `learn`, `evals`, `path-to-prod`, `start`,
`continue`). If the rename came after them, it would touch all of them too, so it lands first.

## Decision

### The naming test

A developer who has never seen groundwork should be able to guess what a command produces from
its name. Every current and future command verb must pass this test.

| Old | New | Why |
|---|---|---|
| `sketch` | `architecture` | Names what it produces |
| `model` | `data-model` | Removes the LLM ambiguity |
| `vet` | `prototype-review` | "vet" needs prior knowledge, and `prototype` alone reads as "build one" |
| `assume` | `risks` | The output is a ranked list of risky assumptions |
| `triage` | `debt` | The skill triages tech debt |
| `retro` | `postmortem` | "Retro" usually means a sprint retrospective; this one is incident-specific |
| `strangle` | `replace` | Names the outcome rather than the pattern; the strangler fig stays inside the playbook |

`spec`, `principles`, `adr`, `spike`, `compare`, `review`, `upgrade`, `plan`, `init`, and `doctor`
already pass and stay as they are. Of the roadmap commands, `threat`, `check`, `learn`, and
`evals` pass. `flow` does not, so that command is named `path-to-prod`.

### Aliases and their removal

`COMMAND_ALIASES` in `scripts/sync-router-references.ts` and the router's
`rule:router-command-aliases` keep every old name working. The router runs the renamed
playbook and says the new name once per session. `npm run sync:router` deletes old generated
playbooks (`reference/sketch.md` and the others) that no command maps to any more. The router
reads the alias table from `SKILL.md`, so aliases cost no extra files.

The aliases stay through the whole 0.x series and are removed in 1.0.0. Removing them is a
breaking change and is listed in that release's notes.

### Skill directory names stay

Directories such as `greenfield-spec-from-idea` are install identifiers (`npx skills add …
--skill greenfield-spec-from-idea`, `/groundwork:greenfield-…` in the plugin). Renaming them
would break existing installs and pinned references, so they stay. Only their `title` fields
change to plain names ("Architecture", "Data Model", "Risky Assumptions", "Tech Debt Triage",
"Incident Postmortem", "Incremental Replacement").

### One vocabulary, grouped by activity

The command table is grouped by what the user is doing: *Set up*, *Design something new*,
*Decide under uncertainty*, *Change a running system*. Generated playbook headers use the same
labels. greenfield / exploration / brownfield remain as internal metadata (the skill `phase`
field and directory prefixes) and appear in user-facing docs only where they explain those
prefixes.

### Plain words for users

`rule:router-plain-words` tells the agent to say "approval" (not "checkpoint" or "receipt"),
"what changes" (not "behavior delta"), and "fresh-eyes review" (not "builder check") when talking
to users. The same words replace the old terms in the review page, CLI help, and hook messages.
Skills keep their internal vocabulary (a skill still has a Checkpoints section).

Artifact section headings stay as they are. `cli/render/visuals.mjs` parses headings such as
`### Unchanged` and `## Builder Check`, so a heading rename needs a matching renderer change and its
own tests, and is out of scope here.

## Consequences

- Every roadmap command gets a name that passes the test from the start.
- Existing users keep working: old names route, with a one-time notice.
- Behavior tests cover the alias rule (`sketch` → `architecture`, `triage` → `debt`).
- The CLI `--checkpoint` flag and receipt fields keep their names. They're machine interfaces,
  and renaming them would invalidate committed receipts.
- Until 1.0.0, two names for one command will show up in old transcripts and blog posts. The
  notice exists for this.
