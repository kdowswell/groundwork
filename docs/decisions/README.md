# Architecture Decision Records

This directory is groundwork's own ADR log — the `greenfield-adr-setup` skill
(`/groundwork adr`) applied to this repository. Every architecturally significant decision
gets a numbered, dated, immutable record here.

**When to write an ADR:** the decision constrains future work, was chosen over real
alternatives, would surprise a new contributor, or is expensive to reverse.

**Format:** `ADR-NNN-<slug>.md`, statuses `Proposed | Accepted | Superseded by ADR-NNN`.
Never edit an accepted ADR's decision — write a new one that supersedes it.

## Index

- [ADR-001: Record architecture decisions](ADR-001-record-architecture-decisions.md)
- [ADR-002: Router skill as the single entry point](ADR-002-router-skill-single-entry-point.md)
- [ADR-003: Compile router playbooks from standalone skills](ADR-003-compile-playbooks-from-skills.md)
- [ADR-004: Durable project context in .groundwork/context.md](ADR-004-durable-project-context.md)
- [ADR-005: Deterministic detector CLI in dependency-free ESM](ADR-005-deterministic-detector-cli.md)
- [ADR-006: Plugin-shipped lifecycle hooks with a single fail-open dispatcher](ADR-006-plugin-lifecycle-hooks.md)
- [ADR-007: Hash-pinned checkpoint approvals and a builder check](ADR-007-hash-pinned-checkpoint-approvals.md)
- [ADR-008: Generated HTML review views over Markdown sources](ADR-008-generated-html-review-views.md)
