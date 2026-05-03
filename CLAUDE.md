# CLAUDE.md

## Project Overview
groundwork is an architectural grounding framework for AI coding agents.
It provides principle files that agents reference during planning to make
architecturally informed decisions.

## Key Principles
- Principle files are distillations, not reproductions of source material
- Every principle file must include source attribution with links
- The applies_when frontmatter is what enables dynamic principle selection
- Agent instructions are written for agent consumption, not human documentation
- The onboarding interview is optional — groundwork works without it

## Architecture Decisions
- Principles are plain markdown with YAML frontmatter — no runtime dependencies
- Multi-agent-platform support: Claude Code, Copilot, Cursor, generic
- Onboarding generates a team profile that customizes principle selection
- Skill files are self-contained — one file the agent can consume

## When Writing a New Principle
1. Create a new .md file in the appropriate principles/ category
2. Include full frontmatter: id, title, category, sources, applies_when, tags
3. Write sections: Principle, When This Matters, When This Doesn't,
   Questions the Agent Should Ask, What Good Looks Like,
   What Goes Wrong When You Skip This, Further Reading
4. Attribute all sources with name and URL
5. Keep the language direct and evaluative — the agent needs to reason with this,
   not recite it
6. Run the validation workflow to ensure frontmatter schema compliance

## Content Standards
- Never reproduce source material — distill and attribute
- Write in second person for agent-facing content ("consider whether...", "ask the developer...")
- Include concrete examples of good and bad outcomes
- Every principle must have at least one source attribution
- Keep principles focused — one concept per file, not a survey of a topic

## Onboarding Questions
- Questions should be answerable in under 60 seconds each
- Provide sensible defaults for every question
- The generated profile should be human-readable and editable
- Don't ask questions that the agent can infer from the codebase
