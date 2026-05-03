# groundwork

Architectural grounding for AI coding agents. A skill framework that injects best-practice architectural awareness into how agents plan and build software — guiding teams into the pit of success.

> "You can outsource your thinking, but you cannot outsource your understanding." — Andrej Karpathy

## What This Is

AI coding agents are fast but architecturally naive. They'll build what you ask for, but they won't ask whether you should build it that way. They don't know your team's scale targets, your compliance constraints, or whether event-driven makes more sense than request-response for your use case.

groundwork is a collection of architectural skill files that agents consume during their planning phase. When a developer asks an agent to build something, the agent references the relevant principles — informed by the scope of work, the maturity of the system, and the team's own standards — and weaves that awareness into its plan before writing a line of code.

It's not a linter. It's not a gatekeeper. It's the architectural judgment that most agents are missing.

## How It Works

1. **Install** — Drop groundwork into your repo as a skill, instruction set, or custom command.
2. **Onboard** *(optional)* — Run a guided interview to tailor guidance to your team's stack, process, and constraints.
3. **Build** — The agent references relevant principles when planning work, not interrupting during coding.

The agent selects which principles matter based on:

- **Scope** — New build vs. epic vs. feature vs. story vs. bug fix
- **Scale** — Solo project vs. team vs. enterprise
- **Stage** — Greenfield ideation vs. active development vs. production hardening vs. maintenance
- **Domain** — The compliance, security, and operational requirements of the target industry

## Why This Exists

We're in the middle of a paradigm shift — what Andrej Karpathy calls the move from "vibe coding" to "agentic engineering." The agents are superhuman at generating code but architecturally ungrounded. They don't know what they don't know.

Groundwork exists because agentic engineering demands that someone maintain architectural judgment while agents handle implementation. That someone is you. This tool makes sure your agent knows what you know — your constraints, your patterns, your quality bar — so it can plan and build with the same architectural awareness you would bring to the work yourself.

The alternative is entropy. Every agent-generated PR that ignores your data residency requirements, every service boundary drawn without considering blast radius, every shared database that seemed fine until it wasn't — that's the cost of ungrounded agents moving fast without judgment.

## Core Concepts

### Principles, Not Rules

Each piece of architectural guidance is a **principle file** — a distilled, actionable summary of an established architectural concept. Principle files are not reproductions of source material. They are editorial distillations that capture: *what* the principle is, *when* it applies, *why* it matters, *how to evaluate* it in context, and *source* attribution.

This is the citation + distillation model. The agent gets enough grounding to reason well. The developer gets breadcrumbs to go deeper. Original authors and frameworks are always attributed.

See [`principles/reliability/fault-isolation.md`](principles/reliability/fault-isolation.md) for the canonical example.

### Phase-Aware Selection

The agent doesn't dump every principle into context. It selects what's relevant based on where the developer is in the process: **Ideation**, **Discovery**, **Refinement**, **Build**, or **Maintain**. The agent infers the current phase from context — repo state, the nature of the request, conversation history — or the developer can signal it explicitly.

### Scope Calibration

A new build needs fundamentally different guidance than a feature within an existing system. groundwork calibrates to scope:

| Scope | Architectural Depth |
|-------|---------------------|
| **New Build** | Full system design — boundaries, infrastructure, data strategy, deployment |
| **Epic** | Cross-cutting concerns — how this epic affects existing architecture |
| **Feature** | Pattern consistency — does this follow established patterns |
| **Story** | Implementation guidance — tactical best practices |
| **Bug Fix** | Root cause awareness — why did this break |

## Repo Structure

```
groundwork/
├── principles/         The core knowledge base (one .md per principle)
│   └── _schema/        JSON Schema for principle frontmatter
├── profiles/           Generated team/project profiles (from onboarding)
├── skills/             Agent-consumable skill bundles (Claude Code, Copilot, Cursor, generic)
├── onboarding/         Guided interview to tailor guidance to a team
├── examples/           Worked example profiles + generated skill files
└── scripts/            Tooling — principle validator, etc.
```

## Status

Early scaffold. See `package.json` for tooling. Run `npm run validate` to check principle frontmatter against the schema.

## Source Frameworks

groundwork distills principles from established architectural frameworks. Each principle file attributes its sources. Initial frameworks include the AWS / Azure / Google Cloud Well-Architected Frameworks, 12-Factor App, Domain-Driven Design, Clean Architecture, Release It!, Site Reliability Engineering, OWASP Top 10, NIST CSF, Designing Data-Intensive Applications, and Enterprise Integration Patterns.

> **Attribution Policy:** Principle files contain distilled guidance — the principle in plain language, when it applies, and how to evaluate it — not reproduced content. Developers are always directed to source material for comprehensive treatment.

## License

MIT
