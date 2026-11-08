# Project Context — groundwork

## Stack
- Languages: TypeScript (validators, eval harness), plain ESM JavaScript (CLI), Markdown content
- Frameworks: none (Node.js >= 20, tsx for dev-time TS, vitest for tests)
- Datastores: none — content library plus stateless tooling
- Cloud / hosting: GitHub (repo, Actions CI); npm registry for CLI distribution

## Team
- Size: solo maintainer
- Composition: one developer plus AI coding agents
- Architectural ownership: maintainer owns all decisions; recorded in docs/decisions/

## Scale Targets
- Users: skill-library consumers (individual developers and teams); no runtime service
- Throughput: n/a — CLI runs locally and in consumers' CI
- Availability: n/a

## Compliance & Domain
- Industry: developer tooling
- Regulatory: none
- Data residency: n/a — no data collected

## Delivery Process
- Release cadence: continuous on main; npm releases tagged
- Branching strategy: feature branches, PR into main
- Feature flags: none
- CI / CD: GitHub Actions — typecheck, principle/skill validation, sync-freshness, vitest

## Quality Bar
- Test coverage: detector rules and CLI covered by vitest; skills covered by eval harness (LLM judge) and behavior tests
- Code review: PR review before merge
- Documentation: CLAUDE.md for contributors, README for consumers, ADRs for decisions

## Stage
- Current stage: build
- Last reviewed: 2026-10-27

## Bounded Contexts
- Library — principles and phase skills (the knowledge and the process)
- Router — the /groundwork skill, its playbooks, and the session scripts
- Toolkit — the CLI: detector, approvals, review pages, install

## Glossary
| Term | Meaning | Owning context | Not to be confused with |
|---|---|---|---|
| Principle | A distilled, sourced description of what good architecture looks like for one concept (`principles/<category>/<id>.md`) | Library | A skill, which is a process |
| Skill | A phase workflow an agent follows (`skills/<phase>-<name>/SKILL.md`); the source of truth for a playbook | Library | The router skill, which only routes |
| Playbook | A skill compiled into the router's `reference/`, or one of the hand-written ones (init, doctor, start, continue) | Router | The skill it was compiled from; never edit a generated playbook |
| Command | The verb a user types after `/groundwork`; it names exactly one playbook | Router | A CLI subcommand (`npx @kdowswell/groundwork approve`) |
| Checkpoint | A decision fork inside a skill; the acceptance Checkpoint is the one the user approves. Users see "approval" | Library | A receipt, which records how a Checkpoint was resolved |
| Receipt | The JSON record of one decision on one artifact, pinned to its SHA-256 (`.groundwork/approvals/`). Users see "approval" | Toolkit | The artifact itself, which never carries its own status |
| Delta | A change plan's Added / Modified / Removed / Unchanged list against the spec. Users see "what changes" | Library | A diff, which is textual; a delta is behavioral |
| Fresh-eyes review | The cold read of an artifact by a reviewer who sees only the file (internally: builder check) | Router | Code review, which happens in the pull request |

## Active Principles
- testing-strategy — validators, detector tests, and the eval harness are the product's quality bar; a skills library that ships broken guidance is worse than none
- supply-chain-security — published npm CLI with zero runtime dependencies by policy; lockfile committed; provenance matters because consumers run this in CI
- separation-of-concerns — the two-layer model (principles = knowledge, skills = process) and the compile step between standalone skills and router playbooks exist to keep responsibilities from bleeding
- tech-debt-management — generated artifacts are committed and CI-enforced; drift between source and generated output is treated as debt with a mechanical payoff path
- executable-architecture-guardrails — most changes here are agent-written; invariants (zero runtime deps, generated files in sync, rule markers, principle ids on detector rules) are enforced by validators, sync checks, and tests rather than by review
- eval-driven-development — the product is prompts: skill and router changes are gated on the quality evals, behavior scenarios, and plugin evals, run on model upgrades too
- agent-legible-codebase — CLAUDE.md stays a short map of invariants that points to ADRs and validators; it is not a dump of everything an agent might want to know
