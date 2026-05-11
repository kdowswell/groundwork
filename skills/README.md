# Skills

Skills are executable process artifacts — step-by-step workflows an agent follows at a specific phase of development. They differ from principles: principles describe *what good looks like*; skills describe *how to get there*.

## Three Phases

| Phase | Directory | When to use |
|---|---|---|
| **Greenfield** | `greenfield/` | Creating something new from scratch (idea → spec → architecture) |
| **Exploration** | `exploration/` | Research spikes, prototyping, assumption testing, tradeoff analysis |
| **Brownfield** | `brownfield/` | Adding to or safely improving an existing system |

## Skill File Format

Each skill is a Markdown file with YAML frontmatter. Required frontmatter fields:

```yaml
---
id: kebab-case-name          # must match filename
title: "Human Readable Title"
phase: greenfield             # greenfield | exploration | brownfield
description: >               # one sentence: what and when
  ...
trigger: >                   # agent-readable scenario that should activate this skill
  ...
entry_criteria:              # what must be true before starting
  - "..."
exit_criteria:               # what must be true when done
  - "..."
principles:                  # optional: principle ids this skill references
  - principle-id
time_box: "30-60 minutes"    # optional
tags: [tag1, tag2]           # optional
---
```

Required body sections (in order):

1. **When to Use This Skill** — scenario, symptoms, what goes wrong if skipped
2. **Steps** — numbered, action-verb steps with explicit human/agent decision points
3. **Checkpoints** — genuine forks requiring human judgment (question → what changes)
4. **Principle Application** — per referenced principle: how this skill uses it specifically
5. **Output Format** — structure of the artifact produced

## Authoring Rules

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
