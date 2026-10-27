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
/groundwork init              # one-time: capture project context + active principles
/groundwork                   # menu of all commands
/groundwork plan <change>     # e.g. plan a safe production change
```

And in CI or locally, no LLM required:

```bash
npx @kdowswell/groundwork detect .       # deterministic production-readiness + AI-slop scan
```

## The /groundwork Router

One skill, seventeen commands. The router loads project context once per session, routes to
exactly one playbook per request, and never runs work from a bare `/groundwork` (you get a
menu). Choose the phase from the request, not the repo's age — a new feature spec in a
ten-year-old codebase is still Define work.

| Category | Commands |
|---|---|
| **Setup** | `init` (write project context), `doctor` (report/repair context drift) |
| **Define** | `spec`, `sketch`, `model`, `principles`, `adr` |
| **Explore** | `spike`, `assume`, `compare`, `vet` |
| **Evolve** | `review`, `triage`, `upgrade`, `retro`, `plan`, `strangle` |

Every command is compiled from a standalone phase skill (below) by `npm run sync:router` —
the standalone skills stay the source of truth and remain individually installable.

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

| Phase | Skills | Use when |
|---|---|---|
| **Greenfield** | 5 | Creating something new: idea → spec → architecture |
| **Exploration** | 4 | Research spikes, prototypes, assumption testing, tradeoffs |
| **Brownfield** | 6 | Adding to, improving, or safely changing an existing system |

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

## Principle Library

46 principles across 8 categories:

| Category | Principles |
|---|---|
| **Reliability** | Circuit Breakers, Fault Isolation, Graceful Degradation, Health Checks, Chaos Engineering |
| **Security** | Secrets Management, Zero Trust, Least Privilege, Data Classification, Supply Chain Security, Prompt Injection Containment, Least Agency |
| **Scalability** | Horizontal Scaling, Caching Strategy, Data Partitioning, Async Processing |
| **Observability** | Structured Logging, Distributed Tracing, SLO / Error Budgets, Alerting Strategy, ML/AI Observability |
| **Data** | Data Ownership, Consistency Models, Event Sourcing, Schema Evolution |
| **Design** | API Contract First, Bounded Contexts, Conway's Law Alignment, Fallacies of Distributed Computing, Field-First, Idempotency by Design, Separation of Concerns, Deterministic Core, Probabilistic Edge |
| **Delivery** | CI/CD Pipeline, Blue-Green / Canary, Feature Flags, Infrastructure as Code, Testing Strategy, Executable Architecture Guardrails, Eval-Driven Development, Model as a Versioned Dependency |
| **Operations** | Incident Response, Runbooks, Capacity Planning, FinOps Cost Visibility, Tech Debt Management |

## Installation

Skills follow the [Agent Skills open standard](https://agentskills.io). Each standalone
skill lives at `skills/<phase>-<skill-name>/SKILL.md`; the router lives at
`skills/groundwork/`. See [docs/HARNESSES.md](docs/HARNESSES.md) for per-harness details.

### Recommended: CLI installer

```bash
npx @kdowswell/groundwork install                      # auto-detects harness dirs; router skill only
npx @kdowswell/groundwork install --all-skills         # also install the 15 standalone phase skills
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
context, approval, and verification rules. The 15 phase skills set `disable-model-invocation`, so
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

### Checkpoint approvals

When you resolve a Checkpoint, record it as a receipt pinned to the artifact's SHA-256
([ADR-007](docs/decisions/ADR-007-hash-pinned-checkpoint-approvals.md)):

```bash
npx @kdowswell/groundwork approve docs/specs/orders.md --checkpoint=greenfield-spec-from-idea/scope
npx @kdowswell/groundwork approve docs/specs/orders.md --checkpoint=scope --decision=delegated   # "you pick"
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
change as a **behavior delta** against the spec: what is added, what is modified (before →
after), what is removed, and what must keep working. You approve the plan once, before code.
When the change is implemented, the agent applies the delta to the spec **in the same change
set as the code**, so your pull request carries both and code review covers the spec edit. It
records that edit as an amendment rather than asking you again:

```bash
npx @kdowswell/groundwork approve docs/spec.md --decision=amended --via=docs/plan-calendars.md
```

An amendment is the agent's (`decidedBy: "agent-amended"`) and stands only while the plan's
approval does. The spec's review page shows exactly what the amendment changed, so it can be
checked against the plan.

Before asking you to accept a spec, sketch, or data model, the playbook runs a **builder
check**. A fresh reviewer reads only the artifact, as the engineer who must build it, and lists
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
([ADR-008](docs/decisions/ADR-008-generated-html-review-views.md)). When a spec, sketch, or
data model is long or still has open questions, `/groundwork` offers the page at the
acceptance Checkpoint.

The page also draws what the artifact's template sections describe, so nobody has to author a
diagram ([ADR-009](docs/decisions/ADR-009-derived-review-visuals.md)). A spec opens with its
riskiest assumption and counts that link to their sections, shows scope beside non-goals, and
puts open questions on a board by category with their owners. An architecture sketch gets a
system map (components in lanes by where they run, and the components each data-flow step
touches), its dependencies grouped by severity, and what the user waits for versus what runs
in the background. A data model gets an entity-relationship diagram (the "one" side above the
"many" side, colored by owner) and its consistency boundaries grouped by requirement. Every
builder check gets a bar of how its questions were resolved, and the side panel shows which of
the project's active principles the artifact addresses. A stale artifact opens with its changes
since approval. Sections that
are missing or don't follow the template draw nothing.

## Repo Structure

```
groundwork/
├── principles/             Architectural principle library (46 across 8 categories)
│   ├── _schema/            Frontmatter JSON Schema
│   └── {category}/         One .md file per principle
├── skills/                 Agent Skills (flat)
│   ├── _schema/            Frontmatter JSON Schema
│   ├── groundwork/         The /groundwork router skill
│   │   ├── SKILL.md        Command table + routing rules (rule-marked)
│   │   ├── reference/      17 playbooks (15 compiled from phase skills + init, doctor)
│   │   └── scripts/        context.mjs session loader, hook.mjs lifecycle hook dispatcher
│   ├── greenfield-*/       0-to-1 skills (5) — source of truth for Define playbooks
│   ├── exploration-*/      Research and prototype skills (4) — Explore playbooks
│   └── brownfield-*/       Existing-system skills (6) — Evolve playbooks
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
