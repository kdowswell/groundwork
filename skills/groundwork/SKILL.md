---
name: groundwork
title: "groundwork"
description: >
  Single entry point for the groundwork architecture toolkit: start, continue,
  spec, architecture, data-model, principles, adr, threat, spike, risks, compare,
  prototype-review, review, debt, upgrade, postmortem, plan, replace, check, analytics-model, evals, path-to-prod, plus init,
  doctor, and learn. Invoke when the
  user asks for architecture or planning help — specifying a new build, designing
  a system's architecture, choosing a data model, designing an analytical data platform, threat modeling, designing evals for an AI feature, running a research spike or
  tradeoff analysis, reviewing an existing system, triaging tech debt, planning a
  safe production change, mapping the path to production, or any /groundwork command. Not for writing feature
  code directly.
argument-hint: "[command] [--grill] [target]"
user-invocable: true
tags: [router, architecture, phases, toolkit]
---

# groundwork

You are working with the groundwork toolkit: phase-based architecture workflows backed by a
library of distilled principles. Each command below is a self-contained playbook. Load only
what the request needs — never preload multiple playbooks. <!-- rule:router-progressive-disclosure -->

## Steps

1. **Load project context once per session.** Run `node scripts/context.mjs` from this skill's
   directory (keep the working directory at the user's project). It locates `.groundwork/context.md`,
   prints it with directives, and reports staleness. Follow its directives; do not rerun it this
   session. If the runtime cannot run scripts, read `.groundwork/context.md` directly if it
   exists. <!-- rule:router-context-first -->
2. **Route the request** using the Commands table and Routing rules below. Load exactly one
   playbook from `reference/` and follow it. The one exception is `start` and `continue`, which
   chain playbooks as their own rules say. <!-- rule:router-one-playbook -->
3. **Verify artifacts you will build on.** If the playbook starts from an existing spec,
   architecture, data model, or change plan file (named in the request or present in the project), run
   `npx @kdowswell/groundwork verify <file>` from the project root before following the playbook, and act on
   the result as the Approvals section says. <!-- rule:router-verify-handoff -->
4. **Honor active principles.** If project context names active principles, they constrain every
   command's output; synced copies live in `reference/principles/`. <!-- rule:router-honor-principles -->

## Commands

| Command | What it does | Playbook |
|---|---|---|
| **Set up** | | |
| `init` | Interview, then write `.groundwork/context.md` with active principles | [reference/init.md](reference/init.md) |
| `doctor` | Report drift between project context and reality; repair on request | [reference/doctor.md](reference/doctor.md) |
| `learn` | Review recent work and suggestions; propose additions and removals to the shared rules | [reference/learn.md](reference/learn.md) |
| **Design something new** | | |
| `start [idea]` | The whole design in one pass: spec, architecture, data model, and ADRs, with one approval | [reference/start.md](reference/start.md) |
| `continue` | Finish whatever design documents are missing, draft, or changed since approval, with one approval | [reference/continue.md](reference/continue.md) |
| `spec [--grill] [idea]` | Turn an idea into a spec with scope and success criteria | [reference/spec.md](reference/spec.md) |
| `architecture [--grill] [system]` | Define system boundaries, components, and data flows before coding | [reference/architecture.md](reference/architecture.md) |
| `data-model [--grill] [domain]` | Design the core data model before implementation | [reference/data-model.md](reference/data-model.md) |
| `analytics-model [platform]` | Design an analytical data platform: layers, grain, history, quality gates, backfills | [reference/analytics-model.md](reference/analytics-model.md) |
| `principles` | Select load-bearing principles from project context | [reference/principles.md](reference/principles.md) |
| `adr` | Establish architecture decision records | [reference/adr.md](reference/adr.md) |
| `threat [system]` | Threat model: trust boundaries, ranked STRIDE threats, toxic flows for AI features, mitigations tied to principles (also for a running system) | [reference/threat.md](reference/threat.md) |
| `evals [feature]` | Design the evaluation suite for an AI feature: cases, graders, thresholds, paired runs | [reference/evals.md](reference/evals.md) |
| **Decide under uncertainty** | | |
| `spike [question]` | Time-boxed investigation with a decision at the end | [reference/spike.md](reference/spike.md) |
| `risks [area]` | Surface and rank the riskiest assumptions | [reference/risks.md](reference/risks.md) |
| `compare [options]` | Structured tradeoff analysis with a recommendation | [reference/compare.md](reference/compare.md) |
| `prototype-review [prototype]` | Judge whether a prototype is sound enough to build on | [reference/prototype-review.md](reference/prototype-review.md) |
| **Change a running system** | | |
| `review [system]` | Assess an existing system against active principles | [reference/review.md](reference/review.md) |
| `debt` | Categorize and prioritize technical debt | [reference/debt.md](reference/debt.md) |
| `upgrade [dep]` | Plan a safe dependency upgrade | [reference/upgrade.md](reference/upgrade.md) |
| `postmortem [incident]` | Blameless incident postmortem with owned action items | [reference/postmortem.md](reference/postmortem.md) |
| `plan [change]` | Safe change plan: what changes against the spec, blast radius, rollback, test coverage | [reference/plan.md](reference/plan.md) |
| `replace [component]` | Incrementally replace a legacy component | [reference/replace.md](reference/replace.md) |
| `check [branch or PR]` | Review a finished change against its approved plan and the active principles: GO or FIX, advisory | [reference/check.md](reference/check.md) |
| `path-to-prod [system]` | Map every stage from commit to production, find the constraint, separate real gates from theater, rank fixes | [reference/path-to-prod.md](reference/path-to-prod.md) |

`start` and `continue` chain the design playbooks strictly in sequence: read the spec playbook
and write the spec file, and only then read the architecture playbook and write its file, and only
then the data model's. Never read a later playbook before the earlier document is on disk: the
files carry the work forward, not the conversation. Documents this run wrote have no approval yet, so
don't `verify` them mid-chain. Defer each playbook's approval and fresh-eyes review,
turn missing inputs into labeled assumptions rather than stopping, and end with one fresh-eyes
review across every document and one approval, recorded per file with a single
`npx @kdowswell/groundwork approve <file> <file> …`. <!-- rule:router-start-chain -->

`continue` reads each design document's state first: a missing one is drafted, a draft is
finished, an approved one is built on without loading its playbook or asking about it again, and one changed since
approval has its diff shown and joins the single approval round. <!-- rule:router-continue-resume -->

**Old names still work.** `sketch` → `architecture`, `model` → `data-model`, `vet` →
`prototype-review`, `assume` → `risks`, `triage` → `debt`, `retro` → `postmortem`, `strangle` →
`replace`. Run the renamed command's playbook, and the first time an old name is used in a
session, say once that it is now the new name (for example: "`sketch` is now `architecture`").
<!-- rule:router-command-aliases -->

## Routing

- **No argument:** open with where the project stands: each artifact from the context loader's
  STATUS lines and its state (approved, draft, changes requested, changed since approval, or
  missing), then one suggested next command with its reason (the NEXT line, or the Next steps
  table below). Then present the Commands table grouped by activity and let the user choose.
  Never auto-run a command from a bare `/groundwork`, the suggested one included.
  <!-- rule:router-no-arg-menu -->
- **Explicit or clearly implied command:** load its playbook and follow it. If two commands
  genuinely fit, ask once with the specific candidates — do not run both.
  <!-- rule:router-ask-once -->
- **General architecture request, no command named:** infer the activity (below), pick the one
  command whose entry criteria the request satisfies, tell the user which playbook you are
  using, and proceed. <!-- rule:router-announce-choice -->
- **Grilling is opt-in.** `spec`, `architecture`, and `data-model` interview the user one
  question at a time, each with a recommended answer, only when asked: `--grill`, "grill me", or
  "interview me first". Otherwise the first reply is the full draft, with questions asked once at
  the end. <!-- rule:router-grill-opt-in -->
- **Missing context:** if `.groundwork/context.md` does not exist and the request designs
  something new or changes a running system, offer `init` first (it takes minutes and improves every later command). If the
  user declines, proceed without it and say which defaults you assumed. Never block on init.
  <!-- rule:router-offer-init -->

## Next steps

Every command ends its output with **one** recommended next command and why, worked out from
what exists now, never a generic list. No command stops because an earlier document is missing:
it drafts from what exists and labels what it assumed. <!-- rule:router-next-step -->

| Where the project stands | Next |
|---|---|
| No spec, architecture, or data model | `start` |
| Several design documents missing, unapproved, or changed since approval | `continue` |
| One design document is a draft, has changes requested, or changed since approval | that document's command |
| Spec approved, no architecture | `architecture` |
| Architecture approved, no data model | `data-model` |
| Spec, architecture, and data model approved | Start building; run `plan` before changing anything in production |
| A change plan is approved and not yet implemented | Implement it; what it changes rides with the code |
| A change is implemented and its plan is high risk | `check`, in the pull request |
| A change plan is a draft or changed since approval | `plan` |

Outside the design path, follow the playbook's own Next step (a `spike` that settles a question
leads to `adr`; a `review` with high-severity findings leads to `plan` or `debt`).

## Activities

Choose the activity from the request, not the repository's age — a brand-new feature spec inside
a ten-year-old codebase is still design work. <!-- rule:router-phase-from-request -->

- **Design something new:** something is being shaped — an idea, a system boundary, a data
  model, a decision record. (Internally: the greenfield phase.)
- **Decide under uncertainty:** uncertainty blocks a decision — an assumption to test, options to
  compare, a prototype to judge. (Internally: exploration.)
- **Change a running system:** an existing system is being reviewed, triaged, upgraded, learned
  from after an incident, or replaced. (Internally: brownfield.)

## Constraints

- Playbooks stay technology-neutral: reason in abstract terms (data store, message queue,
  compute layer) unless the project context names concrete choices.
  <!-- rule:router-tech-neutral -->
- Every playbook ends with a concrete artifact. Produce the artifact the Output Format section
  describes — not a chat summary of it. <!-- rule:router-artifact-required -->
- Talk to the user in plain words. Say "approval" (not "checkpoint" or "receipt"), "what
  changes" (not "behavior delta"), "fresh-eyes review" (not "builder check"), and name commands,
  not playbooks. The terms below are this skill's own vocabulary for you; artifact section
  headings keep their names. <!-- rule:router-plain-words -->
- `learn` runs only when the user asks for it. Never start it at the end of a task or a session,
  and never as a follow-up chore; if the session-start digest mentions open suggestions, say so
  at most once. It proposes, and the user chooses what is applied. <!-- rule:router-learn-on-demand -->
- When you waive a detector finding (`groundwork-disable`) or deviate from a playbook step
  because it didn't fit, also log it once, in the same turn:
  `npx @kdowswell/groundwork suggest "<why it got in the way>" --rule=<rule or skill/step> --file=<path>`.
  The log is append-only and `learn` reviews it; it never replaces fixing a real finding, and you
  never ask the user to log it for you. <!-- rule:router-suggestion-box -->
- Report context drift when you notice it, but never repair it as a side effect of another
  command; that is `doctor`'s job, and it acts only when the user asks.
  <!-- rule:router-drift-not-a-side-quest -->

## Approvals

- The groundwork CLI is the npm package `@kdowswell/groundwork`: run it as
  `npx @kdowswell/groundwork <command>`. Never run `npx groundwork`; without a local install it
  downloads and runs an unrelated package of that name. <!-- rule:router-cli-package -->
- A Checkpoint on an artifact is resolved only by the user's explicit answer in this
  conversation. Record that answer with `npx @kdowswell/groundwork approve <artifact> --checkpoint=<id>`,
  passing `--decision=changes-requested` when they asked for changes and
  `--decision=delegated` when they told you to choose, and disclose a delegated choice in your
  next reply. Never record `approved` for an answer the user did not give. Silence, an earlier
  session, or your own confidence is not approval. <!-- rule:router-approval-is-the-users -->
- Before a playbook builds on an artifact from an earlier step (a spec, an architecture, a
  data model, a change plan), run `npx @kdowswell/groundwork verify <artifact>`. If it fails (unapproved, changed since
  approval, or changes requested), tell the user which (for a change since approval, run
  `npx @kdowswell/groundwork verify <artifact> --diff` and show what changed) and re-ask that artifact's acceptance
  Checkpoint before continuing. Do not proceed silently, and do not approve it yourself to get
  past the check. Urgency, sunk cost, or someone else's reported sign-off doesn't change this: never
  record an approval for them. If the user has told you in this conversation to go ahead without
  approving, you may build, but record nothing and say plainly that the work rests on an
  unapproved artifact. If they tell you to decide, that is a delegated decision, recorded and
  described as delegated, never as their approval. If the CLI is unavailable, say the approval could not be verified and ask
  the user to confirm. When no such artifact exists, the request itself is the input: draft
  from it, stating the requirements you assumed, rather than stopping to ask for one.
  <!-- rule:router-verify-handoff -->
- When you ask a spec, architecture, data model, or change plan's acceptance Checkpoint and the artifact is long
  (more than about 80 lines) or still has open questions for the user, offer a review page
  once, alongside the question: `npx @kdowswell/groundwork render <artifact> --serve` shows it beside its
  open questions, cited principles, and detector findings, and records the user's decision
  from the page. Start it only if the user agrees, and never submit the page's form yourself.
  A decision made in the page is already recorded: confirm it with
  `npx @kdowswell/groundwork verify <artifact>` instead of running `approve` again. Don't offer it for short
  artifacts with nothing open. <!-- rule:router-offer-render -->
- Don't write approval status into an artifact (a "Draft, awaiting acceptance" banner, an
  "Approved" line). The receipt is the status, and editing the artifact to update a banner
  makes its approval stale. <!-- rule:router-no-status-in-artifact -->
- A change plan carries a risk tier (low, moderate, high) in its Risk Tier section; record it
  with the plan's approval (`--tier=<tier>`). For a **low** tier, tell the user they can approve
  it or tell you to go ahead, and record a go-ahead as `--decision=delegated`: CI and code review
  are the gate from there. For a **high** tier, point to the review path the plan names (a named
  reviewer, and `/groundwork check` in the pull request). The tier adds no stop beyond the one
  approval, and you never lower it to make approval easier. <!-- rule:router-risk-tier -->
- When you implement an approved change plan, apply its Behavior Delta to the baseline spec in
  the same change set as the code, then record it with
  `npx @kdowswell/groundwork approve <spec> --decision=amended --via=<plan>`. The user approved the
  delta with the plan: don't ask them to approve the spec again, and don't leave the spec edit
  for a later step. <!-- rule:router-delta-rides-with-code -->
