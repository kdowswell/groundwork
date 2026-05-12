---
name: greenfield-spec-from-idea
title: "Spec From Idea"
description: >
  Translate a raw idea, one-pager, or conversation into a structured spec with
  scope, success criteria, non-goals, and identified risks. Invoke when a
  developer says "I want to build X" or provides a vague product idea without
  defined requirements or scope.
phase: greenfield
entry_criteria:
  - "A description of the intended product or feature exists (any fidelity)"
  - "The primary problem being solved is stated or can be inferred"
exit_criteria:
  - "A spec exists with: problem statement, scope, success criteria, non-goals, open questions"
  - "The riskiest assumption is explicitly identified"
  - "The primary data entity and its owner are named"
principles:
  - data-ownership
  - field-first
time_box: "30-60 minutes"
tags: [planning, requirements, greenfield, spec]
---

# Spec From Idea

## When to Use This Skill

Use this skill when a project or feature is in the idea stage — when the developer knows what they want to build but hasn't yet defined what "done" means, what's in scope, or what could go wrong. It turns unstructured intent into a structured starting point that every downstream artifact (architecture sketch, ADR, sprint plan) can reference.

What goes wrong when you skip it: the team starts building from a shared but unstated assumption. Scope expands invisibly. Features ship that solve the wrong problem. Two months in, someone asks "what were we actually trying to achieve?" and the answer isn't written down anywhere.

## Steps

1. **Restate the problem, not the solution.** Before engaging with "what to build," articulate the problem it solves. Ask: "What is the user currently unable to do, or doing badly, that this changes?" Write one sentence. If you cannot write it, the idea isn't ready to spec yet — return to the developer and ask.

2. **Identify the primary user and their context.** Name who experiences the problem. Where are they? What are they doing when they hit it? What's their constraint (time, attention, connectivity, tools)? This context will change every decision from data model to UI affordance.

3. **State the scope boundary.** Write one sentence each for:
   - What IS in scope for the first deliverable
   - What is explicitly NOT in scope (non-goals)
   The non-goals list is as important as the goals list. It's where scope creep enters.

4. **Define success criteria.** Write 2–4 measurable outcomes that indicate the problem is solved. Prefer behavioral criteria ("a technician can submit a field report in under 60 seconds without removing gloves") over output criteria ("the form has 5 fields"). If you can't make them measurable, write them as falsifiable: "users stop using the paper workaround."

5. **Name the primary data entity and its owner.** What is the core thing the system stores, tracks, or transforms? Who owns it — which team, service, or role is the authoritative source? This single decision shapes the data model, the access control model, and the API contract. Write it explicitly.

6. **Surface open questions.** List anything that must be resolved before building can start. Categorize each as:
   - **Blocking** — the answer changes the architecture
   - **Deferrable** — can be decided during build without structural cost

7. **Identify the riskiest assumption.** Pick the one assumption in the spec that, if wrong, would require the most rework. Write it as a falsifiable statement. This becomes the first thing to test or validate — before the architecture is locked.

## Checkpoints

**Is the problem statement about a user, or about the system?**
"The system needs to support X" is a solution statement. "Users cannot do Y without Z workaround" is a problem statement. If the first draft starts with the system, push back and ask what behavior changes for whom. The spec should be grounded in user context, not system capability.

**Does the primary data entity have a clear owner?**
If you write down the data entity and the developer hesitates on ownership ("I guess we'd store it?"), this is a load-bearing question. Unresolved data ownership becomes a multi-service coordination problem later. Surface it now as a Blocking open question.

**Is the operating context accounted for?**
If the primary user is a field worker, mobile user, or anyone not sitting at a desk, verify the success criteria reflect their actual context (time constraints, connectivity, input method). Office-context success criteria silently fail in field conditions.

## Principle Application

**data-ownership**
Step 5 directly operationalizes this principle. The most load-bearing section is "Questions the Agent Should Ask" — use those questions to drive the conversation in Step 5. If ownership is ambiguous after Step 5, mark it as a Blocking open question and do not proceed to architecture until it's resolved.

**field-first**
If the primary user is not a desk worker, Steps 2 and 4 must account for field conditions: gloves, sunlight, connectivity, divided attention, PPE. The success criteria in Step 4 should be written for the worst-case operating environment, not the best case. If the developer hasn't thought about the physical context, ask the "Questions the Agent Should Ask" section from this principle.

## Output Format

A `spec.md` file (or equivalent document) with this structure:

```markdown
# Spec: {{FEATURE OR PRODUCT NAME}}

## Problem
One sentence. What the user cannot do or does badly today.

## Primary User
Who. Where. What constraint they're operating under.

## Scope
### In scope
- ...

### Non-goals (explicitly out of scope)
- ...

## Success Criteria
1. Measurable or falsifiable outcome
2. ...

## Primary Data Entity
Name: {{ENTITY}}
Owner: {{TEAM, SERVICE, OR ROLE}}

## Open Questions
| Question | Category | Owner |
|---|---|---|
| ... | Blocking / Deferrable | ... |

## Riskiest Assumption
{{STATE THE ASSUMPTION AS A FALSIFIABLE CLAIM}}
```
