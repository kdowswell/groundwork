---
name: exploration-prototype-review
disable-model-invocation: true
title: "Prototype Review"
description: >
  Evaluates a proof-of-concept for architectural soundness and identifies what
  must change before it becomes the foundation for production code. Use when a
  working prototype or POC exists and the team is deciding whether to build on
  it, rewrite it, or treat it as throwaway validation.
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
  - separation-of-concerns
  - fallacies-of-distributed-computing
  - idempotency-by-design
time_box: "2-4 hours"
tags: [exploration, prototype, code-review, architecture]
---

# Prototype Review

## How This Skill Works

This skill applies an architectural lens to a prototype to make explicit what it traded away to move fast — and to decide whether those trades are acceptable as the foundation for production code. The output is an assessment with a build / rewrite / discard recommendation and a list of what must change before the prototype can be built upon.

This is not a code quality review. Prototypes are built to answer a question, and doing that well often means deliberate shortcuts. The question is not "is this good code?" but "what did this prototype prove, what did it skip, and what are the consequences of building on top of it?"

The agent applies the principle library to surface what the prototype leaves unaddressed. The human provides what the agent cannot determine from the code alone: what question the prototype was built to validate, which shortcuts were deliberate, and what the constraints on a rewrite would be.

**Key concepts used in the Steps:**
- **Prototype purpose** — the specific question or assumption the prototype was built to validate
- **Deliberate trade** — a shortcut acceptable for exploration but not acceptable in production
- **Production concern** — a requirement the prototype does not address (error handling, auth, observability, data ownership)
- **Build / rewrite / discard** — extend the prototype, replace it cleanly, or treat it as validated learning only

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

**fault-isolation**
Step 3 (error handling) is where this principle applies most directly. A prototype with no fault isolation means one failure takes down the whole path — a pattern that follows the code into production if not caught here.
Full reference: [principles/fault-isolation.md](principles/fault-isolation.md)

**structured-logging**
Step 4 (observability) is where this principle applies. Prototypes with no structured logging are operationally blind; the habit of logging nothing carries forward unless explicitly called out in the review.
Full reference: [principles/structured-logging.md](principles/structured-logging.md)

**secrets-management**
Step 2 (hardcoded values) and Step 5 (security surface) are where this principle is most load-bearing. Hardcoded credentials in a prototype are the most common security vulnerability that makes it from exploration to production.
Full reference: [principles/secrets-management.md](principles/secrets-management.md)

**separation-of-concerns**
Step 6 (evaluate architecture against active principles) is where this principle applies most directly. Prototypes are characteristically built in a single layer — business logic, data access, and output formatting all in the same file or function — because that's the fastest way to answer the prototype's question. The review must distinguish between intentional shortcuts (acceptable in exploration) and structural entanglement that would propagate to production as unmaintainable code. If the "build on it" path is chosen, separation of concerns failures become the primary refactoring target.
Full reference: [principles/separation-of-concerns.md](principles/separation-of-concerns.md)

**fallacies-of-distributed-computing**
Step 1 (clarify what the prototype was testing) should include: what distributed computing assumptions did this prototype make? Prototypes routinely hardcode timeouts (or have none), assume network calls succeed, and test only on localhost where latency is zero and the network is perfectly reliable. The review must surface which of those assumptions will be invalid in production. For a prototype that makes network calls, assess each one: is there a timeout? What happens on failure? Is the behavior tested with latency injected? The gap between prototype assumptions and production reality is often larger in the distributed layer than anywhere else.
Full reference: [principles/fallacies-of-distributed-computing.md](principles/fallacies-of-distributed-computing.md)

**idempotency-by-design**
Step 3 (error handling) is where this principle applies. Prototypes that mutate state — write to a data store, call an external API that has side effects, send a message — are almost never idempotent. The review must ask: what happens if the client retries this operation? Is there a mechanism to detect and suppress duplicates, or will a retry create a second record, a second charge, a second message? If the path to production includes any state-mutating operation with at-least-once delivery or retry logic, idempotency cannot be left as a "we'll add it later" item — it affects the data model and the write path design.
Full reference: [principles/idempotency-by-design.md](principles/idempotency-by-design.md)

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
