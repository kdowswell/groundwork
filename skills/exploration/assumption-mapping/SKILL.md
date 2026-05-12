---
name: assumption-mapping
title: "Assumption Mapping"
description: >
  Surface and rank the riskiest assumptions in a plan before committing to it,
  so the most dangerous unknowns are tested first. Invoke when a spec or plan
  exists and the team is about to commit to building it — before architecture
  is finalized or significant code is written.
phase: exploration
entry_criteria:
  - "A plan, spec, or idea exists with enough detail to identify assumptions"
  - "The team is about to make a commitment (sprint planning, architecture lock, hiring)"
exit_criteria:
  - "Assumptions are listed and categorized by type"
  - "Each assumption is scored for risk (impact × uncertainty)"
  - "The top 3 riskiest assumptions have a validation plan"
time_box: "60-90 minutes"
tags: [exploration, risk, planning, validation]
---

# Assumption Mapping

## When to Use This Skill

Use this skill before committing to a plan that will be expensive to change — before an architecture is locked, before a sprint is planned, before a contract is signed, before significant code is written. Its job is to make the invisible assumptions in a plan visible so they can be tested before they become surprises.

Every plan rests on assumptions. Some are well-founded; some are guesses dressed up as facts. Assumption mapping separates them and forces the team to test the dangerous ones before building on top of them.

What goes wrong when you skip it: the plan is built. Three months in, an assumption breaks. The assumption was never articulated explicitly, so the team doesn't realize it has broken until the system fails. The cost to fix it is proportional to how much was built on top of it.

## Steps

1. **List all the assumptions in the plan.** Read the spec, the architecture sketch, and any supporting documents. Write down every claim that is asserted without evidence. Common assumption categories:
   - **User behavior** — "users will do X," "users care about Y"
   - **Technical feasibility** — "this library supports X," "this API returns Y format"
   - **Scale** — "the system will handle Z requests," "the data will fit in memory"
   - **Integration** — "the third-party system is reliable," "the authentication flow works as documented"
   - **Business** — "this is the right problem to solve," "customers will pay for this"
   - **Regulatory** — "this complies with X," "this data can be stored in Y region"
   
   Aim for 15–30 assumptions. Fewer means the plan is either very small or assumptions are being missed.

2. **Score each assumption on two dimensions:**
   - **Impact if wrong** (1–5): How much work would need to be undone or redone if this assumption turned out to be false? 5 = architecture-level rewrite; 1 = one-line fix.
   - **Current uncertainty** (1–5): How confident is the team that this assumption is true right now? 5 = pure guess; 1 = validated by evidence.
   
   Calculate **risk = impact × uncertainty**. Sort by risk descending.

3. **Identify the top 5 highest-risk assumptions.** These are the assumptions most likely to break the plan at the highest cost. Write each as a falsifiable statement: "We assume X because Y. This would be false if Z."

4. **Choose a validation method for the top 3.** For each high-risk assumption, pick the cheapest way to test it:
   - **User interview** — for behavior and value assumptions
   - **Technical spike** — for feasibility and performance assumptions
   - **Paper prototype / mockup** — for UX and workflow assumptions
   - **API/SDK test** — for integration assumptions
   - **Legal/compliance check** — for regulatory assumptions
   
   The goal is to find the cheapest falsification, not the most thorough validation.

5. **Set validation deadlines.** For each of the top 3 assumptions with a validation plan, set a date by which the assumption will be tested. If the deadline passes before validation, the assumption remains a known risk — it shouldn't silently become a certainty.

6. **Document accepted risks.** For assumptions ranked 4 and below in your validation list, explicitly accept them as risks. Write: "We are proceeding with this assumption unvalidated. If it breaks, the estimated recovery cost is X." This is not a failure — it's a documented decision.

## Checkpoints

**Are any of the top assumptions about users being tested with users?**
User behavior assumptions can only be validated by observing or interviewing actual users. Technical staff testing user assumptions by imagining what they would do is not validation. If a top assumption is about user behavior and the validation plan doesn't involve users, the plan is wrong.

**Is the validation happening before the commitment, not during build?**
If the validation deadlines are after the sprint starts or after architecture is locked, the validation can't change the plan — it can only confirm or deny it. Validation that can't change the outcome isn't validation; it's post-hoc reassurance.

**Are any assumptions really constraints?**
Some things that look like assumptions are actually constraints — things that are true regardless of what the team does. "We must comply with GDPR" is not an assumption; it's a constraint. Constraints should be noted as such and not subjected to risk scoring — they must be addressed, not validated.

## Principle Application

This skill surfaces which principles become load-bearing based on which assumptions are accepted. Specifically:

If a high-risk assumption is related to **reliability** (third-party system reliability, network availability), the `fault-isolation` and `graceful-degradation` principles become load-bearing — the architecture must be designed to handle the assumption being wrong.

If a high-risk assumption is about **data** (user data ownership, data format from external source), the `data-ownership` and `schema-evolution` principles become load-bearing — the data model must be designed to accommodate being wrong about the data.

If a high-risk assumption is about **scale** (traffic volume, data size), validate it before the scalability principles are selected in `signal-driven-principles` — the right principles depend on the right scale target.

## Output Format

An `assumption-map.md` file with:

```markdown
# Assumption Map: {{PLAN OR FEATURE NAME}}

**Date:** YYYY-MM-DD
**Plan version:** {{LINK TO SPEC}}

## All Assumptions
| # | Assumption | Category | Impact (1-5) | Uncertainty (1-5) | Risk |
|---|---|---|---|---|---|
| 1 | We assume users will... | User behavior | 4 | 3 | 12 |
| ... | | | | | |

## Top 5 Highest-Risk Assumptions
1. **{{ASSUMPTION}}** — Risk: {{SCORE}}
   - Validation method: {{METHOD}}
   - Deadline: {{DATE}}
   - Owner: {{WHO}}

## Accepted Risks (Not Validating)
- {{ASSUMPTION}} — Estimated recovery cost if wrong: {{EFFORT}}

## Constraints (Not Assumptions)
- {{CONSTRAINT}} — must be addressed; not subject to risk scoring
```
