---
name: groundwork
title: "groundwork"
description: >
  Single entry point for the groundwork architecture toolkit: spec, sketch,
  model, principles, adr, spike, assume, compare, vet, review, triage, upgrade,
  retro, plan, strangle, plus init and doctor. Invoke when the user asks for
  architecture or planning help — specifying a new build, sketching a system,
  choosing a data model, running a research spike or tradeoff analysis,
  reviewing an existing system, triaging tech debt, planning a safe production
  change, or any /groundwork command. Not for writing feature code directly.
argument-hint: "[command] [target]"
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
   playbook from `reference/` and follow it. <!-- rule:router-one-playbook -->
3. **Honor active principles.** If project context names active principles, they constrain every
   command's output; synced copies live in `reference/principles/`. <!-- rule:router-honor-principles -->

## Commands

| Command | Category | What it does | Playbook |
|---|---|---|---|
| `init` | Setup | Interview, then write `.groundwork/context.md` with active principles | [reference/init.md](reference/init.md) |
| `doctor` | Setup | Report drift between project context and reality; repair on request | [reference/doctor.md](reference/doctor.md) |
| `spec [idea]` | Define | Turn an idea into a spec with scope and success criteria | [reference/spec.md](reference/spec.md) |
| `sketch [system]` | Define | Define system boundaries and data flows before coding | [reference/sketch.md](reference/sketch.md) |
| `model [domain]` | Define | Design the core data model before implementation | [reference/model.md](reference/model.md) |
| `principles` | Define | Select load-bearing principles from project context | [reference/principles.md](reference/principles.md) |
| `adr` | Define | Establish architecture decision records | [reference/adr.md](reference/adr.md) |
| `spike [question]` | Explore | Time-boxed investigation with a decision at the end | [reference/spike.md](reference/spike.md) |
| `assume [area]` | Explore | Surface and rank the riskiest assumptions | [reference/assume.md](reference/assume.md) |
| `compare [options]` | Explore | Structured tradeoff analysis with a recommendation | [reference/compare.md](reference/compare.md) |
| `vet [prototype]` | Explore | Evaluate a prototype for architectural soundness | [reference/vet.md](reference/vet.md) |
| `review [system]` | Evolve | Assess an existing system against active principles | [reference/review.md](reference/review.md) |
| `triage` | Evolve | Categorize and prioritize technical debt | [reference/triage.md](reference/triage.md) |
| `upgrade [dep]` | Evolve | Plan a safe dependency upgrade | [reference/upgrade.md](reference/upgrade.md) |
| `retro [incident]` | Evolve | Blameless incident retrospective | [reference/retro.md](reference/retro.md) |
| `plan [change]` | Evolve | Safe change plan: blast radius, rollback, test coverage | [reference/plan.md](reference/plan.md) |
| `strangle [component]` | Evolve | Incrementally replace a legacy component | [reference/strangle.md](reference/strangle.md) |

## Routing

- **No argument:** present the Commands table grouped by category, note which phase the project
  context suggests, and let the user choose. Never auto-run a command from a bare
  `/groundwork`. <!-- rule:router-no-arg-menu -->
- **Explicit or clearly implied command:** load its playbook and follow it. If two commands
  genuinely fit, ask once with the specific candidates — do not run both.
  <!-- rule:router-ask-once -->
- **General architecture request, no command named:** infer the phase (below), pick the one
  command whose entry criteria the request satisfies, tell the user which playbook you are
  using, and proceed. <!-- rule:router-announce-choice -->
- **Missing context:** if `.groundwork/context.md` does not exist and the request is a Define or
  Evolve command, offer `init` first (it takes minutes and improves every later command). If the
  user declines, proceed without it and say which defaults you assumed. Never block on init.
  <!-- rule:router-offer-init -->

## Phases

Choose the phase from the request, not the repository's age — a brand-new feature spec inside a
ten-year-old codebase is still Define work. <!-- rule:router-phase-from-request -->

- **Define (greenfield):** something new is being shaped — an idea, a system boundary, a data
  model, a decision record.
- **Explore (exploration):** uncertainty blocks a decision — an assumption to test, options to
  compare, a prototype to judge.
- **Evolve (brownfield):** a running system is being changed — reviewed, triaged, upgraded,
  retrospected, or replaced.

## Constraints

- Playbooks stay technology-neutral: reason in abstract terms (data store, message queue,
  compute layer) unless the project context names concrete choices.
  <!-- rule:router-tech-neutral -->
- Every playbook ends with a concrete artifact. Produce the artifact the Output Format section
  describes — not a chat summary of it. <!-- rule:router-artifact-required -->
- Report context drift when you notice it, but never repair it as a side effect of another
  command; that is `doctor`'s job, and it acts only when the user asks.
  <!-- rule:router-drift-not-a-side-quest -->
