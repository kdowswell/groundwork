---
name: greenfield-architecture-sketch
disable-model-invocation: true
title: "Architecture Sketch"
description: >
  Defines system boundaries, key components, data flows, and critical interfaces
  before writing a line of code, so structural decisions are made deliberately.
  Use when a spec exists and implementation is about to start, when no one has
  drawn the system boundary, or when the team is about to build without a design.
phase: greenfield
entry_criteria:
  - "A spec exists with a problem statement, scope, and primary data entity"
  - "Active principles have been selected (signal-driven-principles skill)"
exit_criteria:
  - "System boundary is drawn: what is inside this system vs. outside"
  - "Major components are named with one-sentence responsibilities"
  - "Data flows between components are described"
  - "External dependencies are listed with failure-mode notes"
  - "At least one ADR captures the highest-stakes structural decision"
principles:
  - fault-isolation
  - async-processing
  - horizontal-scaling
  - separation-of-concerns
  - bounded-contexts
  - fallacies-of-distributed-computing
  - api-contract-first
  - conways-law-organizational-alignment
time_box: "45-90 minutes"
tags: [architecture, design, greenfield]
---

# Architecture Sketch

## How This Skill Works

This skill converts a spec into a structural diagram — a documented system boundary with named components, data flows, and critical interfaces. The sketch does not need to be right; it needs to be documented so that when it changes, the change is a deliberate revision rather than invisible drift.

What emerges from skipping this step is not "no architecture" — it's an architecture decided implicitly by whoever wrote the first code. This skill makes those decisions explicit before the code locks them in.

The agent draws the structural questions out of the spec and proposes a sketch. The human corrects, constrains, and contributes context the agent cannot infer: organizational boundaries, team ownership, existing infrastructure constraints, and operational requirements not captured in the spec.

**Key concepts used in the Steps:**
- **System boundary** — what this system is responsible for and what it hands off to external systems
- **Component** — a named, deployable or logical unit with a defined responsibility
- **Data flow** — the movement of data between components, including direction and synchrony
- **Critical interface** — a contract between components where a change has significant downstream consequences
- **Stateful vs. stateless** — whether a component holds persistent state; stateful components constrain scaling and deployment

## Steps

1. **Draw the system boundary.** **First, if a spec file is named or present in the project, run `npx @kdowswell/groundwork verify <spec path>` from the project root, and act on the first Checkpoint before writing anything else.** With no spec file, work from the request as given. Write one sentence: "This system is responsible for X and hands off Y to Z." Anything inside the boundary is your problem; anything outside is a dependency. Ambiguity here is technical debt's favorite entry point.

2. **Name the major components.** List 3–7 components with a one-sentence responsibility for each, where each runs (the user's device, the backend, a third party), and whether it holds persistent state. A component is a distinct unit that could in principle be deployed, tested, or replaced independently. If a component's responsibility spans more than one sentence, split it.

3. **Trace the primary data flow.** Follow the data entity from Step 5 of the spec-from-idea skill through the system: where it enters, what transforms it, where it's stored, who reads it, and where it exits. Write this as a numbered sequence, naming the components each step touches by their names from Step 2. Every hop between components is a potential failure point — note it.

4. **List external dependencies.** For each system outside the boundary that this system depends on, record:
   - What this system requests from it
   - What happens if it is slow or unavailable
   - Whether the failure is catastrophic (blocks the primary path) or degraded (reduces capability)

5. **Identify the synchronous/asynchronous boundary.** Draw a line between: things that must complete before the user gets a response, and things that can happen later. Anything that crosses the network or is slow should be on the async side unless there is a strong reason it can't be.

6. **Note the three highest-stakes structural decisions.** These are the choices that would be most expensive to reverse after significant code is written. Write each as a decision statement: "We will use X rather than Y because Z." Each becomes an ADR (see adr-setup skill).

7. **Check active principles against the sketch.** For each principle in the project's active set, ask: does the sketch violate it or create tension with it? Document any tensions explicitly — they are not necessarily blockers, but they must be acknowledged.

8. **Run a builder check before you ask the user anything.** It runs on the finished draft: write every earlier step in full first, and never open with questions. Do not defer it until open questions are resolved either. Its purpose is to gather every question into one round, asked at the end of the same response that delivers the complete sketch, so the user is asked once. Hand the sketch to a fresh reviewer: the sketch file only, not this conversation. Give them this brief: "You will build exactly this. List every question you would need answered before you could start, and every place where two competent builders would build different things. Quote the line each question comes from. Do not suggest improvements." Use an isolated subagent if the runtime offers one. Otherwise do a deliberate cold read yourself, treating anything not written in the sketch as unknown. Sort each question the reviewer returns into one of three groups:
   - **Answered by the sketch:** the reviewer missed it. Tighten the wording so the next reader won't.
   - **Your call:** the answer doesn't change what gets built, or one option is clearly right. Decide, write the answer into the sketch, and label it "Agent call:".
   - **For the user:** the answer changes what gets built.
   Bring the user only the last group, in one round. Ask all of them in that one message, however many there are; do not hold any back for a later turn. Record every question and its resolution in the sketch's Builder Check section. The section is never left out; if the cold read finds nothing, write "No open questions."

9. **Record the user's decision.** When the user answers the acceptance Checkpoint, run `npx @kdowswell/groundwork approve <architecture path> --checkpoint=greenfield-architecture-sketch/accept`, adding `--decision=changes-requested` if they asked for changes or `--decision=delegated` if they told you to decide. Record only an answer the user gave in this conversation. If they decided in the review page, it is already recorded: confirm with `npx @kdowswell/groundwork verify` instead of recording it again, and never submit the page yourself. With no one available to answer, record nothing and leave the artifact marked as a draft. If the CLI is unavailable, write the decision and date at the top of the artifact instead and say it is unverified.

## Checkpoints

**Is the spec you are building on approved and unchanged?**
Decided by step 1's verify. **Exit 0:** the spec is unchanged since the user accepted it (or delegated the choice), so build on it as written. **Non-zero (unapproved, changed since approval, or changes requested):** tell the user which, summarize what changed if you can tell, and re-ask the spec's acceptance Checkpoint before going further. Never record the approval yourself to get past it. **A spec file exists but the CLI is unavailable or fails to run:** this is not the no-file case. Say the approval could not be verified, ask the user to confirm the spec is final, and stop there: do not draft from it until they answer. A path error from the CLI means you ran it from the wrong directory; rerun it from the project root before concluding anything. **No spec file available** (none named, none in the project, even if the user mentions one elsewhere): work from the request as given. List the requirements you assumed under "Working Spec (unapproved)" in the output, and keep going; the acceptance Checkpoint at the end covers them with this artifact. Never end a turn just to ask whether a spec exists.

**Are the component responsibilities distinct?**
If two components share the same primary noun in their responsibility statements (both "manage users," both "store events"), consolidate or clarify the boundary between them. Overlapping responsibilities become coordination problems at runtime.

**Does every external dependency have a failure mode?**
If you wrote a dependency without a failure mode, the implicit assumption is "it will always be available." That assumption will be wrong at the worst possible time. Ask: "What happens to the user if this is down for 30 minutes?" If the answer is "nothing works," that's a catastrophic dependency — treat it as such in the architecture.

**Does the asynchronous boundary match the user's experience expectations?**
If the user expects an immediate response to an action but the action crosses a slow external dependency synchronously, the user will experience unpredictable latency. This is a checkpoint where the developer must decide: accept the latency, make it async, or cache.

**Did the builder check surface questions that change what gets built?**
**Yes:** put them to the user before the acceptance Checkpoint, and fold each answer into the sketch. Acceptance cannot be asked while any of them is open, because the user would be approving a sketch that two builders would read differently. **No:** go straight to acceptance, and list the "Agent call:" decisions you made so the user can overturn any of them when they answer.

**Does the user accept this sketch as the basis for data modeling and implementation?**
Ask once the sketch is complete. If the sketch is long or still has open questions for the user, offer once to show it as a review page (`npx @kdowswell/groundwork render <sketch path> --serve`), where the user can read it beside its open questions and findings and decide there. **Accepted:** record the approval; data modeling and implementation may start from it, and any later edit to the sketch makes the approval stale, so the next step re-asks. **Changes requested:** record that, revise, and ask again; nothing downstream starts from this version. **Delegated ("you decide"):** record it as delegated, state the calls you made in your next reply, and proceed. The agent never answers this Checkpoint on the user's behalf.

## Principle Application

**fault-isolation**
Step 4 is where fault-isolation thinking applies. Each external dependency is a potential failure zone. For each, ask: can a failure in that dependency be contained, or does it cascade to the primary path? If it cascades, that's the most important structural problem in the sketch.
Full reference: [principles/fault-isolation.md](principles/fault-isolation.md)

**async-processing**
Step 5 operationalizes this principle. The question is: which work is synchronous because it must be (the user is waiting), and which is synchronous by accident (because it was easiest to write that way)?
Full reference: [principles/async-processing.md](principles/async-processing.md)

**horizontal-scaling**
If the scale target in the project context is team-scale or enterprise, check the sketch against this principle at Step 7. Stateful components that can't be replicated become bottlenecks. The sketch should make stateful vs. stateless components explicit.
Full reference: [principles/horizontal-scaling.md](principles/horizontal-scaling.md)

**separation-of-concerns**
Step 2 (naming components) and Step 3 (tracing the primary data flow) are where separation of concerns is either built in or lost. When naming components, check each responsibility statement: does it contain "and"? A component that persists data *and* enforces business rules *and* sends notifications has mixed concerns — those are three failure zones sharing a deployment unit. The flow trace in Step 3 should reveal clean handoffs between named concerns; if the trace skips through one component to reach another, that component may be doing too much.

Step 6 (three highest-stakes decisions) is the right moment to make the concern boundaries explicit in an ADR if they are non-obvious.
Full reference: [principles/separation-of-concerns.md](principles/separation-of-concerns.md)

**bounded-contexts**
Step 2 is where component responsibilities either align with domain boundaries or cut across them. If two components share vocabulary but use it to mean different things ("order" in the fulfilment component vs. "order" in the billing component), that's a bounded context seam that belongs in the architecture, not buried in shared data model code. When sketching components in Step 2, ask: does this component boundary correspond to a team boundary, a domain boundary, or both? If neither, its scope probably needs revisiting.

Step 4 (external dependencies) is where relationships to *other* bounded contexts appear. Each external dependency is a context boundary — treat it as such in the failure-mode notes.
Full reference: [principles/bounded-contexts.md](principles/bounded-contexts.md)

**fallacies-of-distributed-computing**
Steps 4 and 5 are where the eight fallacies are most load-bearing. Step 4 lists external dependencies — each one implicitly assumes the network is reliable, latency is low, and the remote system is available. For every dependency, challenge those assumptions explicitly in the failure-mode column: what happens when the network drops, when the call takes 10× longer than expected, when the remote system's schema changes without warning? Step 5 (sync/async boundary) is where latency and reliability assumptions are operationalized: a synchronous call to a slow external service inherits all of that service's latency variance directly into the user's response time.
Full reference: [principles/fallacies-of-distributed-computing.md](principles/fallacies-of-distributed-computing.md)

**api-contract-first**
Step 6 (highest-stakes structural decisions) and the "critical interfaces" listed in the output format are where API contracts live. The most expensive contracts to change after code is written are the ones between components with independent deployment cycles — services owned by different teams, or a backend and a mobile client. For each critical interface identified in the sketch, note whether a contract has been defined or whether it's currently implied. Implied contracts become breaking changes nobody planned for.
Full reference: [principles/api-contract-first.md](principles/api-contract-first.md)

**conways-law-organizational-alignment**
Steps 2 and 6 are where this principle is most load-bearing. When naming components in Step 2, ask: does each component map to one team's ownership, or will multiple teams contribute to the same component? Components that multiple teams share tend to accumulate conflicting assumptions and coupling that mirrors the organizational boundary — each team bends the component toward its own use case. If the sketch produces a component that two teams will both own, that's a structural signal: either split the component along team lines, or designate one team as owner with a clear contract for the other to consume. In Step 6 (highest-stakes decisions), if the proposed architecture requires the organization to be restructured to deliver it effectively, name that dependency in an ADR — it is a structural decision, not a side effect to discover after the architecture is locked.
Full reference: [principles/conways-law-organizational-alignment.md](principles/conways-law-organizational-alignment.md)

## Output Format

An `architecture.md` file (or equivalent diagram + notes) with:

```markdown
# Architecture: {{SYSTEM NAME}}

## System Boundary
This system is responsible for: ...
It hands off to: ...
It receives from: ...

## Components
| Component | Runs on | State | Responsibility |
|---|---|---|---|
| ... | Device / Backend / Third party | Stateful / Stateless | One sentence |

## Primary Data Flow
1. ...
2. ...

## External Dependencies
| Dependency | What we need | Failure mode | Severity |
|---|---|---|---|
| ... | ... | ... | Catastrophic / Degraded |

## Sync / Async Boundary
**Synchronous (user waits):** ...
**Asynchronous (background):** ...

## Structural Decisions (see ADRs)
1. We will use X rather than Y because Z.
2. ...

## Active Principle Tensions
- {{PRINCIPLE}}: ...

## Builder Check
| Question (from a cold read) | Resolution |
|---|---|
| ... | Answered in sketch (wording tightened) / Agent call: ... / User: ... |
```
