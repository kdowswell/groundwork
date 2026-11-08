# groundwork

A phase-based, framework-agnostic skills library for AI coding agents. Groundwork gives agents the architectural judgment they're missing — and grounds every planning decision in established practice, not instinct.

> "You can outsource your thinking, but you cannot outsource your understanding." — Andrej Karpathy

## What This Is

AI coding agents are fast but architecturally naive. They'll build what you ask for, but they won't ask whether you should build it *that way*. They don't know your team's scale targets, your compliance constraints, or whether you're adding to a mature system or starting from scratch.

groundwork is a two-layer library:

**Principles** — distilled architectural knowledge sourced from established frameworks (AWS Well-Architected, DDIA, Twelve-Factor, OWASP, SRE Workbook, and more). Each principle is a focused, actionable summary with source attribution: what the principle is, when it applies, how to evaluate it, and what goes wrong when you skip it.

**Skills** — executable process workflows organized by development phase. Skills tell an agent *how to do something*; principles tell it *what good looks like when done*. Skills reference principles — principles are independent.

Around those two layers sits a toolkit: a single `/groundwork` router command, a durable
per-project context file, and a deterministic detector that enforces what the skills teach.

## How groundwork compares

Build-phase packs (Superpowers, Matt Pocock's skills, Addy Osmani's agent-skills) teach agents to
implement, test, and ship. groundwork covers the decisions before that: a cited principle library,
a deterministic detector, and hash-pinned approvals. Each design choice has an outside signal
behind it:

| groundwork | Outside signal |
|---|---|
| Behavior deltas for changes ([ADR-012](docs/decisions/ADR-012-brownfield-behavior-deltas.md)) | [OpenSpec](https://www.thoughtworks.com/radar/tools/openspec) deltas (Radar Vol. 35, Trial); [Kiro](https://kiro.dev/docs/specs/index) bugfix specs also list unchanged behavior |
| Router-only invocation ([ADR-011](docs/decisions/ADR-011-router-only-model-invocation.md)) | [Progressive context disclosure](https://www.thoughtworks.com/radar/techniques/progressive-context-disclosure) (Adopt) |
| Detector and hooks instead of more prose rules | The Radar's answer to [agent instruction bloat](https://www.thoughtworks.com/radar/techniques/agent-instruction-bloat) (Caution): turn rules into deterministic checks |
| Review pages ([ADR-008](docs/decisions/ADR-008-generated-html-review-views.md), [ADR-009](docs/decisions/ADR-009-derived-review-visuals.md)) | [Interactive visual plans with agents](https://www.thoughtworks.com/radar/techniques/interactive-visual-plans-with-agents) (Trial) |
| Risk tiers on change plans ([ADR-018](docs/decisions/ADR-018-risk-tiered-approvals.md)) | [Risk-tiered human oversight](https://www.thoughtworks.com/radar/techniques/risk-tiered-human-oversight) (Trial), against [human-in-the-loop theater](https://www.thoughtworks.com/radar/techniques/human-in-the-loop-theater) (Caution) |
| Paired with/without evals (`eval/`) | [SkillsBench](https://arxiv.org/abs/2602.12670) paired evaluation |

They compose: use groundwork for judgment and approvals, then a build-phase pack for TDD,
debugging, and shipping. [docs/HARNESSES.md](docs/HARNESSES.md) covers installing them side by side.

## Quick Start

```bash
# from your project root
npx @kdowswell/groundwork install        # installs the /groundwork skill into detected harnesses
```

The package is **`@kdowswell/groundwork`**. The unscoped `groundwork` package on npm is
unrelated, so always use the scoped name with `npx`. Installed as a dev dependency
(`npm i -D @kdowswell/groundwork`), the command is plain `groundwork`.

Then, inside your AI coding tool:

```
/groundwork start <idea>      # spec, architecture, data model, and ADRs in one pass, one approval
/groundwork                   # where the project stands, the next step, and every command
/groundwork continue          # finish whatever design documents are missing or unapproved
/groundwork plan <change>     # plan a safe change to a running system
```

`/groundwork init` captures project context and active principles up front; `start` works without
it and records what it assumed.

And in CI or locally, no LLM required:

```bash
npx @kdowswell/groundwork detect .       # deterministic production-readiness + AI-slop scan
```

## The /groundwork Router

One skill, twenty commands. The router loads project context once per session and routes to
exactly one playbook per request. A bare `/groundwork` never runs work: it shows where the project
stands (which design documents exist and whether they're approved), suggests one next command,
and lists the rest. Every command ends by recommending one next step. Commands are grouped by what you're doing, chosen from the request rather than the repo's
age: a new feature spec in a ten-year-old codebase is still design work.

| You're… | Commands |
|---|---|
| **Setting up** | `init` (write project context), `doctor` (report/repair context drift) |
| **Designing something new** | `start`, `continue`, `spec`, `architecture`, `data-model`, `principles`, `adr` |
| **Deciding under uncertainty** | `spike`, `risks`, `compare`, `prototype-review` |
| **Changing a running system** | `review`, `debt`, `upgrade`, `postmortem`, `plan`, `replace`, `check` |

Earlier names still work as aliases (`sketch`, `model`, `vet`, `assume`, `triage`, `retro`,
`strangle`); the router runs the renamed command and tells you the new name once
([ADR-016](docs/decisions/ADR-016-plain-language-command-names.md)).

`start` and `continue` are the default design path
([ADR-017](docs/decisions/ADR-017-outcome-commands-start-continue.md)). They run the spec,
architecture, and data model playbooks in order, one at a time, writing each document before
starting the next. They end with one fresh-eyes review across all of them and **one** approval,
recorded per file (`npx @kdowswell/groundwork approve docs/spec.md docs/architecture.md
docs/data-model.md`). `continue` builds on what you've already approved and asks only about what
changed.

`spec`, `architecture`, and `data-model` draft in full by default and ask once at the end. If you'd
rather be interviewed first, add `--grill` (or say "grill me"): the agent asks one question at a
time, each with its recommended answer, checks the repo and context before asking anything they
could answer, and records decisions that crystallize as Proposed ADRs.

The other commands are compiled from standalone phase skills (below) by `npm run sync:router`.
The standalone skills stay the source of truth and remain individually installable.

## The Detector

`npx @kdowswell/groundwork detect` runs deterministic rules — no LLM, no API key — across two families:
production-posture gaps (missing lockfile, no CI, no tests, unpinned base images, `.env` not
ignored, containers running as root) and AI-slop tells (hardcoded secrets, empty catch
blocks, mock data on real code paths, "in a real application you would…" comments, wildcard
CORS, missing HTTP timeouts, dependencies added to `package.json` without being installed, which
is how an invented package name gets in). **Every finding names the principle it enforces.**

```bash
npx @kdowswell/groundwork detect --json .        # CI-friendly output, exit 1 on errors
npx @kdowswell/groundwork detect --strict .      # exit 1 on warnings too
npx @kdowswell/groundwork doctor                 # check .groundwork/context.md and approvals for drift
```

Waive intentional findings inline (`// groundwork-disable <rule-id>: reason`, plus
`-line` / `-next-line` variants) or via `.groundwork/config.json`.

On Claude Code, groundwork runs three lifecycle hooks
([ADR-006](docs/decisions/ADR-006-plugin-lifecycle-hooks.md)): at **session start** it
injects a digest of `.groundwork/context.md` (Active Principles, staleness, Proposed ADRs);
**after each edit** it scans the edited file and feeds findings back to the agent; and at
**stop** it re-scans every file changed that turn, blocking once if an `error` finding is
still unresolved. The plugin ships them in `hooks/hooks.json`. Without the plugin,
`npx @kdowswell/groundwork install --hooks` registers the same hooks (use one or the other, not both).
All hooks fail open: a broken hook never blocks the agent.

The same hooks keep an eye on unplanned work without getting in the way
([ADR-013](docs/decisions/ADR-013-plan-nudge.md)). When a session has changed three or more
source files and no change plan is approved or in progress (and nothing was approved in the
last two weeks), the agent mentions once that `/groundwork plan` can capture the change, then
carries on. Small fixes and planned work never see it. Teams that want a hard gate can opt in:

```json
{ "planGate": { "mode": "strict", "afterFiles": 3 } }
```

in `.groundwork/config.json` blocks one Stop per session in the same situation; `"mode": "off"`
turns the nudge off.

See the before/after [case study](docs/case-study.md): the same service goes from 25
findings (6 errors) to zero, with each fix mapped to a principle.

## Three Phases

The standalone skills keep a phase prefix in their names, because those names are what you
install. Each phase is one of the router's activity groups:

| Skill prefix | Router group | Skills | Use when |
|---|---|---|---|
| `greenfield-` | Design something new | 5 | Creating something new: idea → spec → architecture |
| `exploration-` | Decide under uncertainty | 4 | Research spikes, prototypes, assumption testing, tradeoffs |
| `brownfield-` | Change a running system | 7 | Adding to, improving, or safely changing an existing system |

## Skills

### Greenfield

| Skill | What it does |
|---|---|
| `signal-driven-principles` | Scan project context → select the load-bearing principles this project needs |
| `spec-from-idea` | Translate a raw idea into a structured spec with scope, success criteria, and identified risks |
| `architecture-sketch` | Define system boundaries, components, data flows, and interfaces before coding |
| `data-model-first` | Design the core data model to surface coupling and schema decisions early |
| `adr-setup` | Establish Architecture Decision Records from day one |

### Exploration

| Skill | What it does |
|---|---|
| `research-spike` | Time-boxed investigation with a defined question, approach, and exit criteria |
| `assumption-mapping` | Surface and rank the riskiest assumptions before committing to a plan |
| `prototype-review` | Evaluate a proof-of-concept for architectural soundness before building on it |
| `tradeoff-analysis` | Structured comparison of approaches with documented decision rationale |

### Brownfield

| Skill | What it does |
|---|---|
| `safe-change-plan` | Plan a production change with rollback strategy, test coverage, and blast radius assessment |
| `strangler-fig` | Incrementally replace a legacy component without a risky big-bang rewrite |
| `debt-triage` | Categorize and prioritize technical debt before a sprint |
| `incident-retro` | Blameless postmortem → verified timeline + owned action items |
| `dependency-upgrade` | Safely upgrade a critical dependency with compatibility checks and staged rollout |
| `brownfield-architecture-review` | Assess an existing system against the principle library before significant new work |
| `change-review` | Review a finished change against its approved plan's delta and the active principles: GO or FIX, advisory (`/groundwork check`) |

## Principle Library

53 principles across 8 categories:

| Category | Principles |
|---|---|
| **Reliability** | Circuit Breakers, Fault Isolation, Graceful Degradation, Health Checks, Chaos Engineering, Durable Agent Execution |
| **Security** | Secrets Management, Zero Trust, Least Privilege, Data Classification, Supply Chain Security, Prompt Injection Containment, Least Agency |
| **Scalability** | Horizontal Scaling, Caching Strategy, Data Partitioning, Async Processing |
| **Observability** | Structured Logging, Distributed Tracing, SLO / Error Budgets, Alerting Strategy, ML/AI Observability |
| **Data** | Data Ownership, Consistency Models, Event Sourcing, Schema Evolution, Rebuildable Derived Data, Historical Data Modeling, Data Quality Gates |
| **Design** | API Contract First, Bounded Contexts, Conway's Law Alignment, Fallacies of Distributed Computing, Field-First, Idempotency by Design, Separation of Concerns, Deterministic Core, Probabilistic Edge, Context Engineering, Agent-Legible Codebase, Simplest Agent Architecture First |
| **Delivery** | CI/CD Pipeline, Blue-Green / Canary, Feature Flags, Infrastructure as Code, Testing Strategy, Executable Architecture Guardrails, Eval-Driven Development, Model as a Versioned Dependency |
| **Operations** | Incident Response, Runbooks, Capacity Planning, FinOps Cost Visibility, Tech Debt Management |

## Installation

Skills follow the [Agent Skills open standard](https://agentskills.io). Each standalone
skill lives at `skills/<phase>-<skill-name>/SKILL.md`; the router lives at
`skills/groundwork/`. See [docs/HARNESSES.md](docs/HARNESSES.md) for per-harness details.

### Recommended: CLI installer

```bash
npx @kdowswell/groundwork install                      # auto-detects harness dirs; router skill only
npx @kdowswell/groundwork install --all-skills         # also install the standalone phase skills
npx @kdowswell/groundwork install --providers=claude,github,cursor,agents
npx @kdowswell/groundwork install --global             # user-level (~/.claude), Claude Code only
npx @kdowswell/groundwork install --hooks              # + Claude Code lifecycle hooks (skip if using the plugin)
npx @kdowswell/groundwork update                       # refresh an existing install
```

### Claude Code plugin

```
/plugin marketplace add kdowswell/groundwork
```

Then open `/plugin` and install groundwork from the list.

Whichever way you install, the model sees one skill: the `/groundwork` router, which carries the
context, approval, and verification rules. The phase skills set `disable-model-invocation`, so
they add nothing to every session's context and run only when you type one by name, such as
`/groundwork:greenfield-spec-from-idea` from the plugin
([ADR-011](docs/decisions/ADR-011-router-only-model-invocation.md)).

### Manual copy

```bash
cp -r skills/groundwork .claude/skills/           # Claude Code (router)
cp -r skills/* .github/skills/                    # GitHub Copilot (everything)
cp -r skills/groundwork .cursor/skills/           # Cursor (enable Agent Skills in settings)
cp -r skills/groundwork .agents/skills/           # Codex CLI / .agents standard
```

### skills.sh (via Vercel Agent Skills)

Install all skills at once:

```bash
npx skills add kdowswell/groundwork --all
```

Or install a specific phase:

```bash
npx skills add kdowswell/groundwork --skill greenfield-spec-from-idea --skill greenfield-architecture-sketch --skill greenfield-data-model-first --skill greenfield-signal-driven-principles --skill greenfield-adr-setup
```

Or install a single skill:

```bash
npx skills add kdowswell/groundwork --skill greenfield-spec-from-idea
```

### All agents — project context

Run `/groundwork init` once per project. It interviews you (six questions max, skipping
anything your repo already answers), writes `.groundwork/context.md`, and hands off to
`/groundwork principles` to select the active principles every later command honors.
`/groundwork doctor` and `npx @kdowswell/groundwork doctor` keep the file honest as the project drifts.

### Approvals

When you approve an artifact, the decision is recorded pinned to the artifact's SHA-256
([ADR-007](docs/decisions/ADR-007-hash-pinned-checkpoint-approvals.md)):

```bash
npx @kdowswell/groundwork approve docs/specs/orders.md --checkpoint=greenfield-spec-from-idea/scope
npx @kdowswell/groundwork approve docs/specs/orders.md --checkpoint=scope --decision=delegated   # "you pick"
npx @kdowswell/groundwork approve docs/spec.md docs/architecture.md docs/data-model.md       # one decision, a receipt per file
npx @kdowswell/groundwork verify                        # exit 1 if any approved artifact changed or vanished
npx @kdowswell/groundwork verify docs/specs/orders.md   # exit 0 only if this artifact may proceed
npx @kdowswell/groundwork verify --diff                 # also print what changed since each stale decision
```

Receipts live in `.groundwork/approvals/` and are meant to be committed, each beside a
`.snapshot` of the text that was decided on. Editing an approved artifact makes its receipt
stale, so drift after approval shows up in `verify` and `doctor` instead of slipping silently
into implementation, and `verify --diff` (or the review page) shows exactly what changed
([ADR-009](docs/decisions/ADR-009-derived-review-visuals.md)). Delegated decisions are recorded
as the agent's (`decidedBy: "agent-delegated"`), never as yours.

Changes to a running system work the same way
([ADR-012](docs/decisions/ADR-012-brownfield-behavior-deltas.md)). `/groundwork plan` writes the
change as **what changes** against the spec: what is added, what is modified (before →
after), what is removed, and what must keep working. You approve the plan once, before code.
When the change is implemented, the agent applies the delta to the spec **in the same change
set as the code**, so your pull request carries both and code review covers the spec edit. It
records that edit as an amendment rather than asking you again:

```bash
npx @kdowswell/groundwork approve docs/spec.md --decision=amended --via=docs/plan-calendars.md
```

Every change plan also gets a **risk tier**, derived from what the plan already says
([ADR-018](docs/decisions/ADR-018-risk-tiered-approvals.md)):

| Tier | When | What it changes |
|---|---|---|
| Low | Degraded or no user impact, a rollback that works as written, nothing removed, unchanged behavior already tested | You can approve it or just say "go ahead"; a go-ahead is recorded as delegated, and CI and code review are the gate |
| Moderate | Anything between | One approval before code, as usual |
| High | Catastrophic or silent failure, a one-way door, or removed behavior | One approval, plus a named reviewer and `/groundwork check` in the pull request (advice, not a block) |

After the code is written, `/groundwork check` reviews the diff against the approved plan
([ADR-019](docs/decisions/ADR-019-change-review-check.md)): behavior changes the plan didn't
declare, Unchanged behavior touched without a test, a missing spec amendment, and principle
violations the detector can't see. It returns GO or FIX with at most about ten items, never edits
code, and never blocks a merge.

The tier is stored with the approval (`approve <plan> --tier=high`) and shown by `verify`,
`doctor`, and the review page. No tier adds a stop.

An amendment is the agent's (`decidedBy: "agent-amended"`) and stands only while the plan's
approval does. The spec's review page shows exactly what the amendment changed, so it can be
checked against the plan.

Before asking you to accept a spec, architecture, or data model, the playbook runs a
**fresh-eyes review**. A fresh reviewer reads only the artifact, as the engineer who must build it, and lists
what it would still need to ask. The agent fixes wording the reviewer misread, makes and labels
calls that don't change what gets built, and brings you only the questions that do, in one
round. On Claude Code the plugin's read-only `groundwork-builder` agent does the reading; other
harnesses fall back to a deliberate cold read.

### Review pages

Long artifacts are easier to judge as a page than in a terminal:

```bash
npx @kdowswell/groundwork render docs/spec.md           # writes .groundwork/review/docs__spec.md.html
npx @kdowswell/groundwork render docs/spec.md --serve   # same page on 127.0.0.1, with Approve / Request changes
```

The page puts the document beside a decision panel: approval status, open questions for you,
cited principles, and detector findings for files the artifact names. With `--serve`, your
decision is recorded as an approval receipt pinned to exactly the version you read; if the
file changes before you click, nothing is recorded. The Markdown stays the source of truth.
Pages are generated, git-ignored, and contain no scripts
([ADR-008](docs/decisions/ADR-008-generated-html-review-views.md)). When a spec, architecture,
or data model is long or still has open questions, `/groundwork` offers the page when it asks
for your approval.

The page also draws what the artifact's template sections describe, so nobody has to author a
diagram ([ADR-009](docs/decisions/ADR-009-derived-review-visuals.md)). A spec opens with its
riskiest assumption and counts that link to their sections, shows scope beside non-goals, and
puts open questions on a board by category with their owners. An architecture gets a
system map (components in lanes by where they run, and the components each data-flow step
touches), its dependencies grouped by severity, and what the user waits for versus what runs
in the background. A data model gets an entity-relationship diagram (the "one" side above the
"many" side, colored by owner) and its consistency boundaries grouped by requirement. Every
fresh-eyes review gets a bar of how its questions were resolved, and the side panel shows which of
the project's active principles the artifact addresses. A stale artifact opens with its changes
since approval. Sections that
are missing or don't follow the template draw nothing.

## Repo Structure

```
groundwork/
├── principles/             Architectural principle library (53 across 8 categories)
│   ├── _schema/            Frontmatter JSON Schema
│   └── {category}/         One .md file per principle
├── skills/                 Agent Skills (flat)
│   ├── _schema/            Frontmatter JSON Schema
│   ├── groundwork/         The /groundwork router skill
│   │   ├── SKILL.md        Command table + routing rules (rule-marked)
│   │   ├── reference/      20 playbooks (16 compiled from phase skills + init, doctor, start, continue)
│   │   └── scripts/        context.mjs session loader, status.mjs, hook.mjs lifecycle hook dispatcher
│   ├── greenfield-*/       0-to-1 skills (5) — "design something new" playbooks
│   ├── exploration-*/      Research and prototype skills (4) — "decide under uncertainty" playbooks
│   └── brownfield-*/       Existing-system skills (7) — "change a running system" playbooks
├── agents/                 groundwork-builder — read-only builder-check reviewer (plugin)
├── hooks/                  hooks.json — Claude Code plugin lifecycle hooks (ADR-006)
├── cli/                    npx @kdowswell/groundwork — detect / doctor / install / update
│   ├── engine/             Deterministic detector (zero runtime dependencies)
│   └── data/               Generated principle index
├── eval/                   Skill quality harness (LLM judge) + behavior tests (trace asserts)
├── examples/case-study/    SlopMart before/after — detector fixtures + case study
├── context/                Project context templates and discovery question bank
├── docs/                   decisions/ (ADRs), case-study.md, HARNESSES.md
└── scripts/                Validators + sync scripts (principles, router playbooks)
```

## Validation & Tests

```bash
npm run validate:all      # principle + skill frontmatter and quality checks
npm run sync:all          # regenerate synced principles + router playbooks (CI-enforced)
npm run typecheck         # TypeScript
npm test                  # detector, CLI, and behavior suites (behavior skips without ANTHROPIC_API_KEY)
npm run eval              # LLM-judged skill-vs-baseline eval (45+ cases, costs tokens)
npm run eval:plugin       # end-to-end plugin cases in real Claude Code, with vs. without (eval/plugin/)
```

## Source Frameworks

The principle library distills from: AWS / Azure / Google Cloud Well-Architected Frameworks, 12-Factor App, Domain-Driven Design, Clean Architecture, Release It!, Site Reliability Engineering (Google), OWASP Top 10, NIST CSF, Designing Data-Intensive Applications (Kleppmann), and Enterprise Integration Patterns.

Every principle file attributes its sources directly. Groundwork distills — it does not reproduce.

## License

MIT
