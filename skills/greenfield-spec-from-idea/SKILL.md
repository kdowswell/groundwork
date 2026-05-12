---
name: greenfield-spec-from-idea
title: "Spec From Idea"
description: >
  Translates a raw idea, one-pager, or conversation into a structured spec with
  scope, success criteria, non-goals, and identified risks. Invoke at the start
  of any new project or feature — whenever someone describes an idea or problem
  to solve, requirements are being discussed without written scope, or the team
  is about to start work without a defined spec. Do not wait to be asked: if
  the work is greenfield and no spec exists, trigger this skill.
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

## How This Skill Works

This skill is a structured conversation: the agent asks, the human answers, and together they produce a `spec.md` that every downstream artifact — architecture sketch, ADRs, sprint plan — treats as the source of truth for scope and intent.

The agent's primary job is to resist solution-first thinking. Most ideas arrive as "I want to build X" — which describes the solution, not the problem. Before any scope or success criteria can be written, the problem must be stated in one sentence from the user's perspective. If it can't be, the idea isn't ready to spec yet.

The human's job is to answer questions honestly, including "I don't know." Open questions and deferred decisions are valid spec outputs. A spec that names its unknowns is more useful than one that papers over them.

**Key concepts used in the Steps:**
- **Problem statement** — one sentence describing what a specific user cannot do or does badly today
- **Success criteria** — measurable or falsifiable outcomes, not output descriptions
- **Non-goals** — explicit scope exclusions; as important as the goals list
- **Primary data entity and owner** — the core thing the system stores or transforms, and which team is the authoritative source
- **Riskiest assumption** — the one belief, if wrong, that requires the most rework

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
Step 5 exists to resolve what is the most common unforced error at spec time: data ownership that is implied by who will write the first migration rather than explicitly decided. The full complexity of contracts, consumer access patterns, and CDC pipelines doesn't need to be resolved at spec time — but ownership does, because it determines the access control model, the API contract, and which team's release schedule this feature lives on.

When naming the primary data entity in Step 5, ask:

- Which team or service is the system of record for this entity — is that decision explicit, or is it implied by who will write the first migration?
- Do other services or pipelines currently read this type of data directly? If yes, through what mechanism?
- When this feature needs data owned by another team, will it call an API, consume an event, or reach into that team's database?
- Is there a named team accountable for the quality and schema of this data as a product other teams depend on?

If the developer hesitates — or says "I guess we'd store it" — that is a Blocking open question. Do not proceed to architecture until it is resolved.

What good looks like at spec time: "The primary data entity is `Inspection`, owned by the Compliance service. Other services receive it via event stream. No other team writes to this entity."

What goes wrong when you skip it: two teams each store a version of the entity; a reporting pipeline reads from both; when either schema changes, the pipeline silently breaks. The incident at month four reveals that ownership was never decided — it was left ambiguous in the spec and both teams assumed the other had it.

Full reference: [principles/data-ownership.md](principles/data-ownership.md)

---

**field-first**
This principle governs the spec if the primary user identified in Step 2 is doing physical work while using the product — a worker, technician, driver, clinician, or first responder. If so, it is not a constraint to note and move on from; it is the operating context for every success criterion and scope decision in the spec. Office-based criteria written assuming a desk, large screen, full attention, and reliable connectivity will silently fail in the field.

Before writing success criteria in Step 4, ask:

- Where will the user physically be when they use this? Indoors, outdoors, in a vehicle, on a ladder, in a trench?
- What are they wearing on their hands? Bare-hand typing as a required input path may be an invalid assumption.
- What is the worst-case connectivity scenario — no signal for hours, intermittent, slow cellular?
- How divided is their attention? Are they responsible for their own physical safety while interacting with this product?
- How many seconds can they realistically spend on a single screen before returning to the physical task?

Success criteria that account for field context look different: "A technician can submit a report in under 60 seconds without removing gloves" describes the actual operating environment. "The form submits in under two seconds" does not — it measures the system, not the user in context.

What good looks like at spec time: success criteria name the worst-case operating environment explicitly, and any criterion that requires connectivity, sustained visual attention, or fine motor input flags that as a design constraint, not an assumption.

What goes wrong when you skip it: field-inappropriate success criteria pass through to architecture and build phases, where every decision treats them as valid. Adding "field mode" retrospectively — after the data model, auth flow, offline behavior, and workflow length are baked into a desktop-first design — is dramatically harder than building field-first from day one. Pilots crater. Workers revert to paper. No one can identify the spec as the root cause because by then the spec has been forgotten.

Full reference: [principles/field-first.md](principles/field-first.md)

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
