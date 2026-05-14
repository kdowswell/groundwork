# CLAUDE.md

## Project Overview

groundwork is a phase-based, framework-agnostic skills library for AI coding agents and the humans who work with them. It organizes architectural knowledge into two layers:

- **Principles** (`principles/`) — distilled knowledge about what good architecture looks like, sourced from established frameworks (AWS Well-Architected, DDIA, Twelve-Factor, OWASP, SRE Workbook, etc.)
- **Skills** (`skills/`) — executable process workflows agents follow at a specific development phase

Skills reference principles. Principles know nothing about skills. The principle library is the knowledge base; the skills layer is where that knowledge becomes action.

## Repo Shape

```
groundwork/
├── principles/             Distilled architectural principle library (8 categories, 32+ files)
│   ├── _schema/            JSON Schema for principle frontmatter
│   ├── reliability/        Circuit breakers, fault isolation, health checks, degradation, chaos
│   ├── security/           Secrets, zero trust, least privilege, classification, supply chain
│   ├── scalability/        Horizontal scaling, caching, partitioning, async processing
│   ├── observability/      Structured logging, tracing, SLOs, alerting
│   ├── data/               Ownership, consistency models, event sourcing, schema evolution
│   ├── design/             Field-first (hostile conditions UX)
│   ├── delivery/           CI/CD, blue-green/canary, feature flags, IaC
│   └── operations/         Incident response, runbooks, capacity planning, tech debt
├── skills/                 Phase-prefixed skill workflows (Agent Skills standard, flat)
│   ├── _schema/            JSON Schema for skill frontmatter
│   ├── greenfield-*/       Phase 1: 5 skills (greenfield-spec-from-idea, etc.)
│   │   └── SKILL.md        Literal filename required by Agent Skills standard
│   ├── exploration-*/      Phase 2: 4 skills
│   └── brownfield-*/       Phase 3: 6 skills
├── context/                Project context artifacts
│   ├── project-context.template.md   Project context capture (principle selection input)
│   └── discovery-questions.md        Question bank for gathering project context
└── scripts/
    ├── validate-principles.ts         Principle frontmatter schema validator (CI)
    └── validate-skills.ts             Skill frontmatter schema validator (CI)
```

## Two Layers

**Principles** are timeless knowledge. They describe patterns and tradeoffs that apply across languages, frameworks, and teams. They are distillations of published frameworks and research, not opinions.

**Skills** are situational processes. They guide an agent through a specific kind of work at a specific phase. They are prescriptive step sequences, not knowledge artifacts. A skill tells you *how to do something*; a principle tells you *what good looks like when you're done*.

## Phase Model

| Phase | Directory | When it applies |
|---|---|---|
| **Greenfield** | `skills/greenfield-*/` | Building something new from scratch: idea → spec → architecture → initial implementation |
| **Exploration** | `skills/exploration-*/` | Research spikes, prototypes, assumption testing, tradeoff analysis |
| **Brownfield** | `skills/brownfield-*/` | Adding to, improving, or safely modifying an existing system |

## Core Invariants

- Principle files are *distillations*, not reproductions of source material. Every principle MUST include source attribution with links.
- The `applies_when` frontmatter enables dynamic principle selection — do not omit it.
- Agent-facing content is written in second person ("consider whether...", "ask the developer...").
- Skills contain no technology names in their Steps sections — use abstract terms (data store, message queue, compute layer).
- Skill Checkpoints must be genuine decision forks, not rhetorical questions. Each must describe what changes based on the answer.
- Skill "Principle Application" sections must be specific — synthesize what the principle means in that phase and context, not a pointer to "go read the principle."

## When Writing a New Principle

1. Create a new `.md` file under the appropriate `principles/<category>/` directory
2. Filename MUST be kebab-case and MUST match the `id` frontmatter field
3. Include full frontmatter: `id`, `title`, `category`, `sources` (≥1 with name+url), `applies_when` (scope/scale/stage/domains arrays), and optional `tags`
4. Write all required sections in order: Principle, When This Matters, When This Doesn't, Questions the Agent Should Ask, What Good Looks Like, What Goes Wrong When You Skip This, Further Reading
5. Run `npm run validate` to confirm frontmatter validates against the schema before committing

## When Writing a New Skill

1. Create a new directory directly under `skills/` — name MUST be `<phase>-<skill-name>` in kebab-case and MUST match the `name` frontmatter field
2. Create `SKILL.md` inside that directory (literal filename, required by the Agent Skills standard)
3. Include required frontmatter per the Agent Skills standard: `name`, `description`
4. `description` carries both what the skill does and when to invoke it — phrase it as: "Does X. Invoke when Y."
5. Add groundwork extensions as needed: `phase`, `entry_criteria`, `exit_criteria`, `principles`, `time_box`, `tags`
6. Write all five required body sections in order: When to Use This Skill, Steps, Checkpoints, Principle Application, Output Format
7. Run `npm run validate:skills` to confirm frontmatter validates against the schema before committing

## Content Standards

**Principles:**
- Never reproduce source material — distill and attribute
- Include concrete examples of good and bad outcomes
- Every principle must have at least one source attribution
- Keep principles focused — one concept per file, not a survey of a topic

**Skills:**
- `description` combines what + when: "Does X. Invoke when Y." — this is the only field agent runtimes read for auto-invocation
- Steps use action verbs and are executable by an agent without further clarification
- No technology names in Steps — use abstract terms (data store, identity provider, message queue)
- No agent-runtime–specific tool names in Steps — describe the behavior abstractly (e.g., "enumerate choices for the user" not "call AskUserQuestion")
- Checkpoints are real forks: each checkpoint changes something downstream based on the answer
- Principle Application synthesizes how the principle applies in *this specific phase and context*
- Output Format describes the artifact's structure, not its content

## Validation

```bash
npm run validate          # validate principle frontmatter
npm run validate:skills   # validate skill frontmatter
npm run validate:all      # both
npm run typecheck         # TypeScript type checking on scripts
```
