---
name: prototype-review
title: "Prototype Review"
description: >
  Evaluate a proof-of-concept for architectural soundness and identify what
  must change before the prototype becomes the foundation for production code.
  Invoke when a working prototype exists and the team is deciding whether to
  build on it or rewrite.
phase: exploration
entry_criteria:
  - "A working prototype or proof-of-concept exists"
  - "Active principles are selected for the project"
  - "The original question or hypothesis the prototype was testing is known"
exit_criteria:
  - "The prototype is evaluated against production criteria it was not designed to meet"
  - "A clear list of 'must change before production' items is written"
  - "A recommendation is made: build on this prototype, rewrite, or hybrid"
principles:
  - fault-isolation
  - structured-logging
  - secrets-management
time_box: "2-4 hours"
tags: [exploration, prototype, code-review, architecture]
---

# Prototype Review

## When to Use This Skill

Use this skill when a prototype exists and the team is about to decide whether to build on top of it or rewrite. Prototypes are built to answer a question, not to be production code. They routinely carry assumptions, shortcuts, and missing concerns that are fine for exploration but dangerous in production.

The goal of this review is not to judge the prototype's code quality — it's to make explicit what the prototype traded away to move fast, and to decide consciously whether those trades are acceptable going forward.

What goes wrong when you skip it: the prototype becomes the product. The prototype's assumptions become the system's constraints. The team inherits a structure that was shaped by exploration goals, not production goals, and refactoring becomes progressively harder as more is built on top of it.

## Steps

1. **Clarify what the prototype was testing.** Before evaluating it, restate its original hypothesis: "This prototype was built to answer the question: X." Everything the prototype skipped is only a problem if it matters for production. Knowing the original question helps separate intentional shortcuts from accidental omissions.

2. **Audit for hardcoded values and environment assumptions.** Find every place where a configuration value, credential, endpoint, or environment assumption is hardcoded. These are the most dangerous artifacts of prototype code — they become invisible until they break in a different environment.

3. **Evaluate error handling coverage.** Identify the three most common failure modes for the prototype's core path. Check whether each failure is handled, partially handled, or silently ignored. Prototypes routinely use happy-path logic only — the question is whether that's acceptable for the use cases the team is planning.

4. **Check observability.** Can you tell what the prototype is doing while it runs? Is there logging? Are errors surfaced or swallowed? In production, "it's broken but we don't know why or where" is the cost of a prototype that was never made observable.

5. **Assess security surface.** Identify what data the prototype handles and what access controls exist. Prototypes routinely skip authentication, authorization, input validation, and secrets management. Each skip is a decision that must be made before production, not after.

6. **Evaluate the architecture against active principles.** For each principle in the project's active set, ask: does the prototype's structure make it easy or hard to comply with this principle in production? If the prototype's structure makes a principle expensive to implement, that's a structural cost the team is accepting.

7. **Write the recommendation.** Choose one:
   - **Build on it** — the prototype's structure is sound for production; specific items from the audit must be addressed, but the architecture can carry forward
   - **Rewrite** — the prototype's structure is shaped for exploration, not production; the learning is the output, not the code
   - **Hybrid** — keep the interface or data model, rewrite the implementation

## Checkpoints

**Is the prototype being evaluated against production criteria it was never designed to meet?**
A prototype that was built to test a UX hypothesis should not be faulted for having no distributed tracing. Separate: things the prototype skipped that must be addressed (because they are in scope for production), from things it skipped that are legitimately out of scope. Both categories need to be documented, but only the first affects the recommendation.

**Is there social pressure to build on the prototype because it was expensive to build?**
Sunk cost is the most common reason prototypes become production systems when they shouldn't. The question is not how long the prototype took — it's whether its structure is cheaper to extend than to replace. A prototype that took three weeks to build may be cheaper to throw away than to carry into a system that will run for three years.

**Is the "build on it" recommendation based on the prototype's strengths, or the team's reluctance to rewrite?**
Prototypes should be built on when their architecture aligns with the production goals. They should be rewritten when they don't. The recommendation must be based on the audit findings, not on the discomfort of suggesting a rewrite.

## Principle Application

**fault-isolation** (`principles/reliability/fault-isolation.md`)
Step 3 (error handling) is where this principle applies most directly. A prototype with no fault isolation means one failure takes down the whole path. The "What Goes Wrong" section of this principle describes exactly what happens when fault isolation is deferred from prototype to production.

**structured-logging** (`principles/observability/structured-logging.md`)
Step 4 (observability) is where this principle applies. Prototypes with no structured logging are operationally blind. The "Questions the Agent Should Ask" section from this principle drives the observability audit in Step 4.

**secrets-management** (`principles/security/secrets-management.md`)
Step 2 (hardcoded values) and Step 5 (security surface) are where this principle is most load-bearing. Hardcoded credentials in a prototype are the most common security vulnerability that makes it from exploration to production. The "What Good Looks Like" section describes the minimal standard before any code handles real credentials.

## Output Format

A `prototype-review-{{PROTOTYPE-NAME}}.md` file with:

```markdown
# Prototype Review: {{NAME}}

**Date:** YYYY-MM-DD
**Prototype question:** {{ORIGINAL HYPOTHESIS}}
**Reviewer:** {{AGENT AND/OR DEVELOPER}}

## Audit Findings

### Hardcoded values and environment assumptions
- [ ] {{ITEM}} — must change before production

### Error handling gaps
- [ ] {{FAILURE MODE}} — currently: {{HOW IT'S HANDLED}} — needs: {{WHAT'S REQUIRED}}

### Observability gaps
- [ ] {{GAP}}

### Security surface
- [ ] {{ITEM}}

### Principle compliance
| Principle | Assessment | Required changes |
|---|---|---|
| {{PRINCIPLE}} | Compliant / Non-compliant / N/A | ... |

## Must Change Before Production
1. ...

## Recommendation
{{BUILD ON IT | REWRITE | HYBRID}}

Rationale: ...
```
