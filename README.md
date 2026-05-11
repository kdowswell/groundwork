# groundwork

A phase-based, framework-agnostic skills library for AI coding agents. Groundwork gives agents the architectural judgment they're missing — and grounds every planning decision in established practice, not instinct.

> "You can outsource your thinking, but you cannot outsource your understanding." — Andrej Karpathy

## What This Is

AI coding agents are fast but architecturally naive. They'll build what you ask for, but they won't ask whether you should build it *that way*. They don't know your team's scale targets, your compliance constraints, or whether you're adding to a mature system or starting from scratch.

groundwork is a two-layer library:

**Principles** — distilled architectural knowledge sourced from established frameworks (AWS Well-Architected, DDIA, Twelve-Factor, OWASP, SRE Workbook, and more). Each principle is a focused, actionable summary with source attribution: what the principle is, when it applies, how to evaluate it, and what goes wrong when you skip it.

**Skills** — executable process workflows organized by development phase. Skills tell an agent *how to do something*; principles tell it *what good looks like when done*. Skills reference principles — principles are independent.

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

32 principles across 8 categories:

| Category | Principles |
|---|---|
| **Reliability** | Circuit Breakers, Fault Isolation, Graceful Degradation, Health Checks, Chaos Engineering |
| **Security** | Secrets Management, Zero Trust, Least Privilege, Data Classification, Supply Chain Security |
| **Scalability** | Horizontal Scaling, Caching Strategy, Data Partitioning, Async Processing |
| **Observability** | Structured Logging, Distributed Tracing, SLO / Error Budgets, Alerting Strategy |
| **Data** | Data Ownership, Consistency Models, Event Sourcing, Schema Evolution |
| **Design** | Field-First (Hostile Operating Conditions) |
| **Delivery** | CI/CD Pipeline, Blue-Green / Canary, Feature Flags, Infrastructure as Code |
| **Operations** | Incident Response, Runbooks, Capacity Planning, Tech Debt Management |

## How to Use

Drop any skill file into your agent's context (CLAUDE.md, `.github/copilot-instructions.md`, `.cursorrules`, system prompt) and invoke it when the development phase matches.

For project-specific grounding:

1. Copy `context/project-context.template.md` into your project and fill it in
2. Run the `signal-driven-principles` skill to select the principles that apply to your project
3. Invoke the relevant phase skill when starting a greenfield, exploration, or brownfield task

The library is intentionally agent-agnostic — it works with Claude Code, Copilot, Cursor, Gemini, or any agent that can consume markdown instructions.

## Repo Structure

```
groundwork/
├── principles/             Architectural principle library
│   ├── _schema/            Frontmatter JSON Schema
│   └── {category}/         One .md file per principle
├── skills/                 Phase-organized skill workflows
│   ├── _schema/            Frontmatter JSON Schema
│   ├── greenfield/         0-to-1 skills (5)
│   ├── exploration/        Research and prototype skills (4)
│   └── brownfield/         Existing-system skills (6)
├── context/                Project context artifacts
│   ├── project-context.template.md
│   └── discovery-questions.md
└── scripts/
    ├── validate-principles.ts
    └── validate-skills.ts
```

## Validation

```bash
npm run validate          # validate all principle frontmatter
npm run validate:skills   # validate all skill frontmatter
npm run validate:all      # both
```

## Source Frameworks

The principle library distills from: AWS / Azure / Google Cloud Well-Architected Frameworks, 12-Factor App, Domain-Driven Design, Clean Architecture, Release It!, Site Reliability Engineering (Google), OWASP Top 10, NIST CSF, Designing Data-Intensive Applications (Kleppmann), and Enterprise Integration Patterns.

Every principle file attributes its sources directly. Groundwork distills — it does not reproduce.

## License

MIT
