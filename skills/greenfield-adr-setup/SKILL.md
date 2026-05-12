---
name: greenfield-adr-setup
title: "ADR Setup"
description: >
  Establishes Architecture Decision Records so structural decisions are
  documented as they're made, not reconstructed later. Use at the start of any
  new project, when a high-stakes architectural decision has been made, when
  the architecture-sketch skill surfaces decisions that need to be captured, or
  when the team lacks a record of why past decisions were made.
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

## How This Skill Works

This skill establishes a lightweight ADR practice so structural decisions are captured as they're made, not reconstructed from memory months later. The output is an ADR directory with the first set of populated records — one per high-stakes decision already made.

An ADR is not documentation for its own sake. It answers one question: "why did we do it this way?" If that question has an answer worth preserving, write the ADR. If the answer is "seemed fine at the time," the decision probably needs an ADR more than most.

The agent structures the ADR format and populates records based on decisions the human describes. The human provides the context the agent cannot infer from code: the constraints present when the decision was made, the alternatives that were considered, and the conditions under which the decision should be reconsidered.

**Key concepts used in the Steps:**
- **ADR** — a short document capturing a single architectural decision: context, decision, alternatives, consequences
- **Status** — the state of the decision: proposed, accepted, deprecated, or superseded
- **Context** — the forces and constraints that made this decision necessary at the time
- **Consequences** — what becomes easier, harder, or constrained as a result of this decision
- **Superseded by** — a link to the ADR that replaces this one if the decision is later reversed

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
