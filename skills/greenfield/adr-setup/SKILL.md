---
name: adr-setup
title: "ADR Setup"
description: >
  Establish Architecture Decision Records from the first day of a project so
  structural decisions are documented as they're made, not reconstructed later.
  Invoke when a project has made at least one structural decision that would be
  expensive to reverse, or when the architecture-sketch skill surfaces
  high-stakes decisions that need to be captured.
phase: greenfield
entry_criteria:
  - "At least one structural decision has been made or is being made"
  - "A location for ADRs is chosen (directory, wiki, or doc system)"
exit_criteria:
  - "ADR format is established and documented"
  - "At least one ADR is written for the highest-stakes current decision"
  - "The team knows the process for adding new ADRs"
time_box: "30-45 minutes"
tags: [architecture, documentation, process, greenfield]
---

# ADR Setup

## When to Use This Skill

Use this skill whenever a project makes a structural decision that would be expensive to reverse. This includes: choice of data store, synchronous vs. asynchronous communication model, authentication approach, deployment topology, and language or framework choice when it has significant downstream implications.

The goal is not to document everything — it's to capture the decisions that future developers will ask "why did they do it this way?" If the question has an answer worth preserving, write an ADR. If the answer is "seemed fine at the time," the decision probably didn't need an ADR — or it did and no one recorded it.

What goes wrong when you skip it: six months in, a new engineer asks why the system uses approach X instead of Y. Nobody knows. The original reasons may have been good ones that should still apply, or they may have been temporary constraints that have since changed. Without ADRs, the team can't tell the difference.

## Steps

1. **Choose the ADR location.** Pick one: a directory in the repository (`docs/decisions/` or `adr/`), a team wiki, or a shared document system. The repository is strongly preferred — ADRs that live with the code stay in sync with the code; ADRs that live in a wiki drift. If the team has an existing convention, use it.

2. **Establish the ADR format.** The format should include:
   - **Number and title** — sequential, descriptive (ADR-001: Use PostgreSQL as the primary data store)
   - **Date** — when the decision was made
   - **Status** — Proposed / Accepted / Deprecated / Superseded
   - **Context** — the situation that forced a decision (not the decision itself)
   - **Decision** — the choice made, stated as a declarative sentence
   - **Consequences** — what becomes easier, harder, or impossible because of this decision
   - **Alternatives considered** — what was rejected and why (this is the most underrated section)

3. **Write the first ADR.** Start with the highest-stakes structural decision already made or being made. Use the format from Step 2. Do not retroactively document decisions that were made months ago from memory — those ADRs will be unreliable. Start from now.

4. **Define the threshold for writing new ADRs.** Not every decision needs an ADR. Write one when:
   - The decision would be expensive (>1 week of work) to reverse
   - The decision surprised the team or wasn't obvious
   - The decision required a tradeoff that future developers need to understand
   - A reasonable developer would question the choice without context
   Document this threshold so the team applies it consistently.

5. **Integrate into the workflow.** Decide when ADRs get written: at the time of decision (ideal), during architecture review, or during sprint planning when technical choices are made. Pick one and make it a team habit, not an afterthought.

## Checkpoints

**Is the format lightweight enough to actually use?**
If the ADR template has more than 6 sections, it will not be used consistently. Reduce it. An incomplete ADR is better than no ADR, but a template that's too heavy produces no ADRs. The format should take 15-20 minutes to fill in for a typical decision.

**Are the alternatives considered section actually considered?**
The most valuable part of an ADR is what was rejected and why. If the alternatives section is empty or says "we didn't consider alternatives," the ADR is only half done. Ask: "what would a reasonable engineer have suggested instead?" Write that down and explain why it was not chosen.

**Is the ADR location accessible to everyone who will need it?**
If ADRs live in a directory that new engineers don't know to look in, they won't be consulted. Mention the ADR directory in the README and CLAUDE.md so it's discoverable.

## Principle Application

This skill doesn't reference specific principles — it provides the mechanism by which principle-grounded decisions are preserved across time. When an active principle drives a structural decision, the ADR for that decision should reference the principle: "Per the fault-isolation principle, we will not allow the payment service to take down the catalog service."

This creates a chain: the principle library explains the WHY; the ADR records the WHERE and HOW for this specific project.

## Output Format

A directory `docs/decisions/` (or equivalent) containing:

```
docs/decisions/
├── README.md          (explains the ADR process and format)
├── ADR-001-<slug>.md
├── ADR-002-<slug>.md
└── ...
```

Each ADR file follows this template:

```markdown
# ADR-{{NUMBER}}: {{TITLE}}

**Date:** YYYY-MM-DD
**Status:** Accepted

## Context
The situation that made a decision necessary. What constraints existed?
What was changing or uncertain?

## Decision
We will {{DO X}} rather than {{Y or Z}}.

## Consequences
**Positive:** ...
**Negative:** ...
**Neutral:** ...

## Alternatives Considered
- **{{ALTERNATIVE A}}** — rejected because ...
- **{{ALTERNATIVE B}}** — rejected because ...
```
