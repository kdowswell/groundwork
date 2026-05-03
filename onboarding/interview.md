# Onboarding Interview

> **Status:** Outline only. The interview script and structured Q&A flow are a Phase 2 deliverable.

The onboarding interview tailors groundwork's principle selection to a specific team's context. The output is a `profiles/<name>.md` file (see [`templates/profile.template.md`](templates/profile.template.md)) that the skill installer references when deciding which principles to surface and which questions to ask.

## Sections

The interview covers six sections. Each section's questions live in `questions/<section>.md` (Phase 2).

| Section | Purpose |
|---|---|
| **Team Shape** | Team size, structure, experience levels |
| **Stack** | Languages, frameworks, cloud provider |
| **Delivery Process** | SDLC, branching strategy, release cadence |
| **Compliance** | Regulatory requirements, industry constraints |
| **Scale Targets** | Users, throughput, availability requirements |
| **Quality Bar** | Testing expectations, code review, documentation |

## Design Constraints

- Each question is answerable in under 60 seconds.
- Every question has a sensible default.
- The generated profile is human-readable and editable.
- The interview never asks for information the agent could infer from the codebase.

## Modes

- **Plain text** — Runs as a chat-based Q&A through the host agent.
- **Structured (agent-ui)** — Uses `assess`, `decide`, `rank`, and `collect` components for a smoother experience. See [`agent-ui-integration.md`](agent-ui-integration.md).

## Re-triggering

`npx groundwork onboard --update` re-runs the interview with the current profile pre-loaded so the user only revisits what's changed (e.g., team scaled from 5 → 15, new compliance regime, cloud migration).
