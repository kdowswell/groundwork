# Project Context — groundwork

## Stack
- Languages: TypeScript (validators, eval harness), plain ESM JavaScript (CLI), Markdown content
- Frameworks: none (Node.js >= 20, tsx for dev-time TS, vitest for tests)
- Datastores: none — content library plus stateless tooling
- Cloud / hosting: GitHub (repo, Actions CI); npm registry for CLI distribution

## Team
- Size: solo maintainer
- Composition: one developer plus AI coding agents
- Architectural ownership: maintainer owns all decisions; recorded in docs/decisions/

## Scale Targets
- Users: skill-library consumers (individual developers and teams); no runtime service
- Throughput: n/a — CLI runs locally and in consumers' CI
- Availability: n/a

## Compliance & Domain
- Industry: developer tooling
- Regulatory: none
- Data residency: n/a — no data collected

## Delivery Process
- Release cadence: continuous on main; npm releases tagged
- Branching strategy: feature branches, PR into main
- Feature flags: none
- CI / CD: GitHub Actions — typecheck, principle/skill validation, sync-freshness, vitest

## Quality Bar
- Test coverage: detector rules and CLI covered by vitest; skills covered by eval harness (LLM judge) and behavior tests
- Code review: PR review before merge
- Documentation: CLAUDE.md for contributors, README for consumers, ADRs for decisions

## Stage
- Current stage: build
- Last reviewed: 2026-07-24

## Active Principles
- testing-strategy — validators, detector tests, and the eval harness are the product's quality bar; a skills library that ships broken guidance is worse than none
- supply-chain-security — published npm CLI with zero runtime dependencies by policy; lockfile committed; provenance matters because consumers run this in CI
- separation-of-concerns — the two-layer model (principles = knowledge, skills = process) and the compile step between standalone skills and router playbooks exist to keep responsibilities from bleeding
- tech-debt-management — generated artifacts are committed and CI-enforced; drift between source and generated output is treated as debt with a mechanical payoff path
