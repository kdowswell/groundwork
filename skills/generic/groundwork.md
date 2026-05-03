# Architectural Guidance — groundwork

> Generic skill template. Drop into any agent's instruction file (CLAUDE.md, .github/copilot-instructions.md, .cursorrules, system prompt). Platform-specific installers live in sibling directories under `skills/`.

## Your Team Profile

<!-- Generated from `npx groundwork onboard`. Edit by hand if no profile exists. -->
<!-- Example shape:
- Stack: TypeScript, Next.js, PostgreSQL, AWS (ECS Fargate)
- Team: 8 engineers, 2 senior, 1 staff architect
- Scale target: 10K DAU, 99.9% availability
- Compliance: SOC 2 Type II in progress
- Release cadence: Weekly, feature-flagged
- Quality bar: 80% coverage, PR reviews required, no direct main commits
-->

## How to Use This Guidance

When planning any task larger than a bug fix:

1. **Identify scope** — Is this a new build, epic, feature, or story?
2. **Identify stage** — Are we in ideation, discovery, refinement, build, or maintenance?
3. **Select relevant principles** from the sections below based on scope and stage.
4. **Incorporate into your plan** — Reference specific principles when explaining your approach.
5. **Ask the right questions** — Each principle includes questions to consider; use them.

Do not dump all principles into every plan. Select what's relevant. A feature-level story doesn't need a full system design review.

## Principles

<!-- TODO: bundled subset populated from principles/ during build. The full set lives in the groundwork repo at https://github.com/kurtdowswell/groundwork (link TBD). -->

### Reliability

<!-- TODO: populate from principles/reliability/ -->
- **Fault Isolation** — A failure in one component should not cascade. Design boundaries so blast radius is contained.

### Security

<!-- TODO: populate from principles/security/ -->

### Scalability

<!-- TODO: populate from principles/scalability/ -->

### Observability

<!-- TODO: populate from principles/observability/ -->

### Data

<!-- TODO: populate from principles/data/ -->

### Design

<!-- TODO: populate from principles/design/ -->

### Delivery

<!-- TODO: populate from principles/delivery/ -->

### Operations

<!-- TODO: populate from principles/operations/ -->
