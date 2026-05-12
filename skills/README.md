# Skills

Skills are executable process artifacts — step-by-step workflows an agent follows at a specific phase of development. They differ from principles: principles describe *what good looks like*; skills describe *how to get there*.

## Directory Structure

Each skill lives in its own named directory containing a `SKILL.md` file — this is the [Agent Skills open standard](https://agentskills.io) structure, compatible with Claude Code, GitHub Copilot, Cursor, and skills.sh. Skill directories are flat (no phase subdirectories) and prefixed with their phase so the phase is legible after installation.

```
skills/
├── greenfield-spec-from-idea/
│   └── SKILL.md
├── greenfield-architecture-sketch/
│   └── SKILL.md
├── exploration-research-spike/
│   └── SKILL.md
└── brownfield-safe-change-plan/
    └── SKILL.md
```

To add supporting reference files to a skill, place them alongside `SKILL.md`:

```
skills/greenfield-spec-from-idea/
├── SKILL.md
└── references/
    └── example-spec.md
```

## Three Phases

| Phase | Prefix | When to use |
|---|---|---|
| **Greenfield** | `greenfield-` | Creating something new from scratch (idea → spec → architecture) |
| **Exploration** | `exploration-` | Research spikes, prototyping, assumption testing, tradeoff analysis |
| **Brownfield** | `brownfield-` | Adding to or safely improving an existing system |

## Skill File Format

Each skill is a Markdown file with YAML frontmatter. The schema follows the [Agent Skills open standard](https://agentskills.io) — two fields are required; all others are groundwork extensions.

```yaml
---
# Required (Agent Skills standard)
name: kebab-case-name        # must match the directory name; the invocation identifier
description: >               # what the skill does + when to invoke it
  ...                        # this is what agent runtimes read for auto-invocation

# Optional (Agent Skills standard)
title: "Human Readable Title"
disable-model-invocation: true   # only user can invoke; model cannot auto-trigger
user-invocable: false            # hide from user menus; model-triggered only
allowed-tools: [Bash, Read]      # tools pre-approved without prompting

# Optional (groundwork extensions)
phase: greenfield             # greenfield | exploration | brownfield
entry_criteria:              # what must be true before starting
  - "..."
exit_criteria:               # what must be true when done
  - "..."
principles:                  # principle ids this skill references
  - principle-id
time_box: "30-60 minutes"
tags: [tag1, tag2]
---
```

Required body sections (in order):

1. **When to Use This Skill** — scenario, symptoms, what goes wrong if skipped
2. **Steps** — numbered, action-verb steps with explicit human/agent decision points
3. **Checkpoints** — genuine forks requiring human judgment (question → what changes)
4. **Principle Application** — per referenced principle: how this skill uses it specifically
5. **Output Format** — structure of the artifact produced

## Authoring Rules

- **`description` carries both what and when** — agent runtimes use this single field for auto-invocation. Phrase it as: what the skill does, then "Invoke when..." for the trigger condition.
- **No technology names in Steps** — use abstract terms (data store, message queue, compute layer). Technology decisions belong in the output artifact.
- **Checkpoints are real forks** — not rhetorical questions. Each checkpoint changes something downstream.
- **Principle Application is specific** — not a pointer to "go read the principle," but a synthesis of what the principle means in this exact phase and context.
- **Steps are executable** — an agent should be able to follow them alone or with minimal human input at each numbered step.
- **Second person throughout** — "Read the...", "Ask the developer...", "Identify the..."

## Validation

```bash
npm run validate:skills
```

Checks all skill files against `skills/_schema/skill.schema.json` and verifies filename ↔ id and directory ↔ phase alignment.
