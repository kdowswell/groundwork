<!-- generated from skills/greenfield-spec-from-idea/SKILL.md by scripts/sync-router-references.ts.
     Edit the source skill, then run: npm run sync:router -->

# Spec (`/groundwork spec`)

**Activity:** Design something new · **Time box:** 30-60 minutes

**Before you start:** load project context for this session if you have not already (see the
router's Steps); honor active principles throughout. Entry criteria below are what this playbook
works best from. If one doesn't hold, don't stop: draft from what exists, label what you assumed,
and name the command that would firm it up as your next step.

**Entry criteria:**
- A description of the intended product or feature exists (any fidelity)
- The primary problem being solved is stated or can be inferred

**Exit criteria:**
- A spec exists with: problem statement, scope, success criteria, non-goals, open questions
- The riskiest assumption is explicitly identified
- The primary data entity and its owner are named

---

## How This Skill Works

This skill runs in two phases:

**Phase 1 — Draft.** Produce a `spec.md` immediately from whatever information is available — partial, ambiguous, or incomplete. Use best-effort interpretation for gaps and flag them as open questions. Questions come after the draft, not before it: a spec with placeholders and named unknowns is immediately useful to review, critique, and build on; a list of questions is not a spec.

**Phase 2 — Resolve.** After the draft exists, work through blocking questions interactively. Do not leave the skill without attempting to resolve the questions that would change the architecture. For questions with a natural option set, enumerate the choices explicitly so the user can respond with a selection (e.g., "Which platform? A) iOS only  B) Android only  C) Both  D) Not decided yet"). For open-ended questions with no natural options, ask directly in conversation. Gather answers in batches of 1–3, update the spec with each answer, and re-categorize any resolved blocking questions as answered. If a question genuinely cannot be answered now, mark it with an explicit owner — not "TBD."

The two-phase approach exists because producing a draft first gives the human something concrete to react to, which surfaces better answers than asking abstract questions into a void. A human reading "Scope: offline-first mobile app" will answer "which platform?" more precisely than one who reads only "what device does your team use?"

The agent's primary job in Phase 1 is to resist solution-first thinking. Most ideas arrive as "I want to build X" — which describes the solution, not the problem. Before scope or success criteria can be written, the problem must be stated in one sentence from the user's perspective. If the input doesn't state it, infer the most plausible interpretation and flag it for validation — do not block on a confirmed problem statement before producing the draft.

The human's job is to answer questions honestly, including "I don't know." Open questions and deferred decisions are valid spec outputs. A spec that names its unknowns is more useful than one that papers over them.

**Key concepts used in the Steps:**
- **Problem statement** — one sentence describing what a specific user cannot do or does badly today
- **Success criteria** — measurable or falsifiable outcomes, not output descriptions
- **Non-goals** — explicit scope exclusions; as important as the goals list
- **Primary data entity and owner** — the core thing the system stores or transforms, and which team is the authoritative source
- **Riskiest assumption** — the one belief, if wrong, that requires the most rework

## Steps

**Grilling mode (opt-in).** Run this only when the user asks for it: a `--grill` argument, or a phrase such as "grill me" or "interview me first". Without that request, skip it entirely: write the full draft first and ask once at the end, as the numbered steps say. When it is requested:
- Before asking anything, read the repository, the project context, and existing decision records. Never ask a question they already answer.
- Walk the decision tree one branch at a time, in this order: the problem and who has it, then scope (in and out), then the success criteria, then the primary data entity and its owner. Ask **one** question per reply, and give your recommended answer with a one-line reason, so the user can accept it with "yes".
- Stop when every branch whose answer changes what gets built is resolved. Then follow the numbered steps in full; the fresh-eyes review should find little.
- Write each decision that crystallizes during the interview as a **Proposed** decision record, using the `adr` playbook's template, and cite it in the spec.

1. **Restate the problem, not the solution.** Before engaging with "what to build," articulate the problem it solves in one sentence: what is the user currently unable to do, or doing badly, that this changes? If the input makes this clear, write it. If not, write the most plausible interpretation and flag it: "Problem statement (needs validation): ..." — then continue. Do not wait for a confirmed problem statement before producing the draft spec.

2. **Identify the primary user and their context.** Name who experiences the problem. Where are they? What are they doing when they hit it? What's their constraint (time, attention, connectivity, tools)? This context will change every decision from data model to UI affordance.

3. **State the scope boundary.** Write one sentence each for:
   - What IS in scope for the first deliverable
   - What is explicitly NOT in scope (non-goals)
   The non-goals list is as important as the goals list. It's where scope creep enters.
   Then state the **scope stance** in one line: is this spec deliberately **expanding** the scope the request implied (and why), **holding** it, or **reducing** it (and what was cut)? It makes a scope change visible at the approval the user already gives, without asking a separate question.

4. **Define success criteria.** Write 2–4 measurable outcomes that indicate the problem is solved. Prefer behavioral criteria ("a technician can submit a field report in under 60 seconds without removing gloves") over output criteria ("the form has 5 fields"). If you can't make them measurable, write them as falsifiable: "users stop using the paper workaround." Where a criterion describes how the system responds, you may write it in EARS form ("WHEN <trigger>, THE SYSTEM SHALL <response>"; "WHILE <state>, …"; "IF <unwanted condition>, THEN …"); keep Given/When/Then wherever the project already uses it. Mark each criterion that must hold across a whole range of inputs, not just one example ("for every refund, the balance drops by exactly the refunded amount"), with **(property)**: those become property-based tests later.

5. **Name the primary data entity and its owner.** What is the core thing the system stores, tracks, or transforms? Who owns it — which team, service, or role is the authoritative source? This single decision shapes the data model, the access control model, and the API contract. Write it explicitly.

6. **Surface open questions.** List anything that must be resolved before building can start. Categorize each as:
   - **Blocking** — the answer changes the architecture
   - **Deferrable** — can be decided during build without structural cost

7. **Run a builder check before you ask the user anything.** It runs on the finished draft: write every earlier step in full first, and never open with questions. Do not defer it until open questions are resolved either. Its purpose is to gather every question into one round, asked at the end of the same response that delivers the complete spec, so the user is asked once. Hand the spec to a fresh reviewer: the spec file only, not this conversation. Give them this brief: "You will build exactly this. List every question you would need answered before you could start, and every place where two competent builders would build different things. Quote the line each question comes from. Do not suggest improvements." Use an isolated subagent if the runtime offers one. Otherwise do a deliberate cold read yourself, treating anything not written in the spec as unknown. Sort each question the reviewer returns into one of three groups:
   - **Answered by the spec:** the reviewer missed it. Tighten the wording so the next reader won't.
   - **Your call:** the answer doesn't change what gets built, or one option is clearly right. Decide, write the answer into the spec, and label it "Agent call:".
   - **For the user:** the answer changes what gets built.
   Bring the user only the last group, in one round, merged with any blocking questions still open (Step 8). Ask all of them in that one message, however many there are; do not hold any back for a later turn. Record every question and its resolution in the spec's Builder Check section. The section is never left out; if the cold read finds nothing, write "No open questions."

8. **Resolve blocking questions interactively.** After writing the spec, do not exit the skill with blocking questions still open if the user is present. Work through them in batches of no more than three at a time, starting with the most architecture-consequential question. For questions with a natural option set, enumerate the choices explicitly for the user to select (e.g., "Backend approach — A) Build new backend  B) Integrate with existing system  C) Not yet decided"). For fully open-ended questions with no natural options, ask directly in conversation. After each batch of answers, update the spec: move answered questions from the Open Questions table to the relevant spec section, and update entity ownership, scope, or success criteria as needed. If a question cannot be answered, record the owner explicitly (a name or role, not "TBD") and a condition under which it will be resolved.

9. **Identify the riskiest assumption.** Pick the one assumption in the spec that, if wrong, would require the most rework. Write it as a falsifiable statement. This becomes the first thing to test or validate — before the architecture is locked.

10. **Record the user's decision.** When the user answers the acceptance Checkpoint, run `npx @kdowswell/groundwork approve <spec path> --checkpoint=greenfield-spec-from-idea/accept`, adding `--decision=changes-requested` if they asked for changes or `--decision=delegated` if they told you to decide. Record only an answer the user gave in this conversation. If they decided in the review page, it is already recorded: confirm with `npx @kdowswell/groundwork verify` instead of recording it again, and never submit the page yourself. With no one available to answer, record nothing and leave the artifact marked as a draft. If the CLI is unavailable, write the decision and date at the top of the artifact instead and say it is unverified.

11. **Task list for a build-phase tool (opt-in).** Only when the user asks for one (`--tasks`, or "hand this to <build tool>"), after the spec is written, also write `.groundwork/tasks/<slug>.json`: a JSON array where each task is `{"id": "T1", "title": "...", "acceptance": "<the check that proves it done>", "criterion_ref": "<the spec line it implements>", "passes": false}`. Derive tasks from the success criteria and in-scope items (criteria marked (property) say so in their acceptance check), one per independently verifiable outcome, each acceptance check runnable without reading this conversation. The approval pins the spec, not the task list; regenerate the list if the spec changes.

## Checkpoints

**Is the problem statement about a user, or about the system?**
"The system needs to support X" is a solution statement. "Users cannot do Y without Z workaround" is a problem statement. If the first draft starts with the system, push back and ask what behavior changes for whom. The spec should be grounded in user context, not system capability.

**Does the primary data entity have a clear owner?**
If you write down the data entity and the developer hesitates on ownership ("I guess we'd store it?"), this is a load-bearing question. Unresolved data ownership becomes a multi-service coordination problem later. Surface it now as a Blocking open question.

**Is the operating context accounted for?**
If the primary user is a field worker, mobile user, or anyone not sitting at a desk, verify the success criteria reflect their actual context (time constraints, connectivity, input method). Office-context success criteria silently fail in field conditions.

**Are blocking questions still open after Phase 1?**
If the spec contains blocking questions after the draft is written, Phase 2 must run — even if it feels premature. A spec with blocking questions is a draft, not an output. If running in a non-interactive or fully-automated context (no human available to answer), mark the spec explicitly as "Draft — blocking questions unresolved" at the top and record that Phase 2 must run before architecture begins. Do not pass a draft spec to the next phase as if it were complete.

**Did the builder check surface questions that change what gets built?**
**Yes:** put them to the user before the acceptance Checkpoint, and fold each answer into the spec. Acceptance cannot be asked while any of them is open, because the user would be approving a spec that two builders would read differently. **No:** go straight to acceptance, and list the "Agent call:" decisions you made so the user can overturn any of them when they answer.

**Does the user accept this spec as the basis for architecture and data modeling?**
Ask once the spec is complete, and name the scope stance in the question when it is Expand or Reduce, so accepting the spec also accepts the scope change. If the spec is long or still has open questions for the user, offer once to show it as a review page (`npx @kdowswell/groundwork render <spec path> --serve`), where the user can read it beside its open questions and findings and decide there. **Accepted:** record the approval; architecture and data modeling may start from it, and any later edit to the spec makes the approval stale, so the next step re-asks. **Changes requested:** record that, revise, and ask again; nothing downstream starts from this version. **Delegated ("you decide"):** record it as delegated, state the calls you made in your next reply, and proceed. The agent never answers this Checkpoint on the user's behalf.

## Red Flags

Observable signs this playbook is being skipped or gamed. Check your own work against them before you ask for approval; each one you find is something to fix, not to explain away.

- The first reply is a list of questions rather than a full draft, and the user did not ask to be grilled.
- The Builder Check section is missing, or reads "No open questions" on a spec longer than about 150 lines.
- A success criterion has no number or observable condition ("fast", "easy to use", "scalable").
- The Non-goals list is empty.
- The spec names a specific product, framework, or vendor the user never chose.
- An acceptance decision is recorded with no answer from the user anywhere in the conversation.

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

**bounded-contexts**
Step 5 is the first moment in the greenfield process where a domain boundary is either drawn or accidentally left open. When you name the primary data entity and its owner, you are implicitly defining the first bounded context: this entity belongs here, under this team's vocabulary, governed by these rules. The risk at spec time is not the entity itself — it's the phrase "other services will also need this." That phrase is the start of a shared model, and shared models are where bounded contexts collapse.

Ask: is the data entity described the same way in all the contexts that will touch it? If billing calls it a "customer" and fulfillment calls it a "recipient" and support calls it a "contact," those are different concepts that happen to share a foreign key — not one entity owned by one team. Surface that at Step 5, not at integration time.

What good looks like at spec time: the entity has one name, one owner, and one definition that holds across every team that will depend on it — or the spec explicitly names the translation that will happen at each boundary.

What goes wrong when you skip it: the spec describes a single shared entity that three teams will each extend for their own use case. By the time those extensions conflict, the schema is live and the resolution costs are structural.

Full reference: [principles/bounded-contexts.md](principles/bounded-contexts.md)

---

**conways-law-organizational-alignment**
Step 5 (primary data entity and owner) is where this principle first applies. Naming an owner isn't only about data accountability — it determines which team's release schedule this feature lives on, whose API design conventions govern the contract, and who has authority to evolve the schema. If the spec implies that two teams share ownership of the primary entity, that's a signal that either the spec spans two bounded contexts (and should be scoped more narrowly) or the organization's team structure doesn't align with the domain's natural boundaries. Surface it as a Blocking open question at Step 6 rather than proceeding with ambiguous ownership. A spec that assigns ownership to "the platform team and the product team together" has not resolved ownership — it has deferred a structural decision that will resurface at every schema change.

Full reference: [principles/conways-law-organizational-alignment.md](principles/conways-law-organizational-alignment.md)

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

**testing-strategy**
Step 4 is where the spec decides whether its criteria can be tested independently of the code that will meet them. A criterion in EARS form with a clear trigger and response, marked (property) when it holds for every input in a range, becomes a property-based test that an agent can't satisfy just by asserting what its own code happens to do. Criteria written as one example ("a $10 refund leaves $90") get tested as one example, and the edge cases go unchecked.
Full reference: [principles/testing-strategy.md](principles/testing-strategy.md)

## Output Format

A `spec.md` file (or equivalent document) with this structure:

```markdown
# Spec: {{FEATURE OR PRODUCT NAME}}

## Problem
One sentence. What the user cannot do or does badly today.

## Primary User
Who. Where. What constraint they're operating under.

## Scope
**Scope stance:** Expand / Hold / Reduce — {{ONE LINE: WHAT CHANGED AGAINST THE REQUEST, AND WHY}}

### In scope
- ...

### Non-goals (explicitly out of scope)
- ...

## Success Criteria
1. Measurable or falsifiable outcome
2. WHEN {{TRIGGER}}, THE SYSTEM SHALL {{RESPONSE}} (property)
3. ...

## Primary Data Entity
Name: {{ENTITY}}
Owner: {{TEAM, SERVICE, OR ROLE}}

## Open Questions
| Question | Category | Owner |
|---|---|---|
| ... | Blocking / Deferrable | ... |

## Riskiest Assumption
{{STATE THE ASSUMPTION AS A FALSIFIABLE CLAIM}}

## Builder Check
| Question (from a cold read) | Resolution |
|---|---|
| ... | Answered in spec (wording tightened) / Agent call: ... / User: ... |
```

**Next step:** End your reply (not the artifact) with one recommended next command and why, worked out from what exists now (the router's Next steps table), never a list. Usually `architecture` once the spec is approved; `risks` first when the riskiest assumption could sink the idea, or `continue` when several design documents are still missing.
