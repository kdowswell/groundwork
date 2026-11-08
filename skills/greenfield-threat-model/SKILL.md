---
name: greenfield-threat-model
disable-model-invocation: true
title: "Threat Model"
description: >
  Maps trust boundaries and data flows, walks STRIDE over each boundary with
  ranked likelihood and impact, runs a toxic-flow pass over every agent session,
  and ties each mitigation to a cited principle and a deterministic or
  model-judged guardrail. Invoke when an architecture is approved and security
  has not been reasoned about, when a running system is gaining an AI or agent
  feature, or when someone asks what could go wrong before building.
phase: greenfield
entry_criteria:
  - "An approved architecture (if none exists, work from the running system's observed components and flows, or from the request, and list what you assumed)"
  - "The project's signals are scored (if not, score `ai_system` and `autonomous_agents` yourself from what the system does and say so)"
exit_criteria:
  - "Every trust boundary is listed with the data that crosses it and that data's classification"
  - "Each boundary has its STRIDE threats, ranked by likelihood × impact"
  - "Every agent session is checked for the toxic combination, or the section says why none apply"
  - "Each ranked threat above Low has a mitigation citing a principle id and a guardrail type"
  - "The user has accepted the ranking and the residual risk, or asked for changes"
principles:
  - prompt-injection-containment
  - zero-trust
  - least-agency
  - data-classification
  - least-privilege
  - deterministic-core-probabilistic-edge
  - executable-architecture-guardrails
time_box: "20-30 minutes for a small internal system; 60-90 minutes for an AI or multi-tenant system"
tags: [security, threat-modeling, stride, agents, ai-systems, greenfield]
---

# Threat Model

## How This Skill Works

This skill turns a system description into a ranked list of what could go wrong at each place where trust changes, and what stops it. It works from either of two inputs: an approved architecture (the usual case, before code exists) or the observed components and flows of a running system (when a feature, often an AI one, is being added to something already live). The output is the same either way.

A threat model's value is in its ranking, not its length. A list of forty equally weighted threats tells nobody what to build first. This skill sizes the model to the system, ranks every threat, and hands the top mitigations to planning. Residual risk is the user's call; the agent proposes, the user accepts or pushes back.

For systems where a model reads content and calls tools, classic STRIDE misses the most likely failure: an agent steered by text it read. The toxic-flow pass checks each agent session for the combination that turns a prompt injection into a breach.

**Key concepts used in the Steps:**
- **Trust boundary** — a line where data or control passes between parties that trust each other differently: user to service, service to third party, service to model, tenant to tenant
- **STRIDE** — Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege; one question per letter at each boundary
- **Agent session** — one run of a model with a context and a tool set; the unit the toxic-flow pass checks
- **Toxic flow** — a session that holds all three of: untrusted input, access to sensitive data or systems, and the ability to send data out or change state
- **Guardrail type** — *deterministic* (code, policy, or a person decides, the same way every time) or *model-judged* (a model's judgment is the control, acceptable only where a miss is cheap and recoverable)

## Steps

1. **Establish the input.** **If an architecture file is named or present in the project, run `npx @kdowswell/groundwork verify <architecture path>` from the project root first, and act on the first Checkpoint before writing anything else.** With no architecture file but a running system, read its code, configuration, and deployment description, and write down the components and flows you observed, with where you found each. With neither, work from the request and list what you assumed under "Working System (unconfirmed)".

2. **Size the model to the system.** Count the trust boundaries before you write threats. An internal batch job that reads one trusted data store and writes to another has one or two boundaries and gets a short model: a few threats, no toxic-flow table beyond the line saying it does not apply. A public, multi-tenant, or AI system gets the full treatment. Say which size you chose and why in one sentence at the top of the artifact.

3. **List trust boundaries and the data flows across them.** For each boundary, name the two sides, the data that crosses it, the direction, and the identity each side presents. Classify the data on every flow (public, internal, confidential, restricted, or the project's own scheme). Prompts, model outputs, tool results, retrieved documents, and agent memory are flows too; each carries the highest classification of what it contains.

4. **Walk STRIDE per boundary.** At each boundary, ask the six STRIDE questions and keep only threats that are plausible for this system; skip a letter with a one-word reason rather than inventing a threat to fill it. Score each threat's likelihood and impact as High, Medium, or Low, and set Rank from the product: High × High is Critical, any High with a Medium is High, Medium × Medium is Medium, anything with a Low is Low. Sort the table by Rank.

5. **Run the toxic-flow pass when the `ai_system` or `autonomous_agents` signal is present.** For each agent session, mark three properties: does it process untrusted input (email, web pages, uploads, tickets, another agent's output, retrieved content anyone outside the team can write); does it have access to sensitive data or systems; can it send data out or change state (send messages, write records, call outbound endpoints, render links that fetch). Flag every session with all three as a Critical threat in the Threats table. For each agent, record the identity it acts as and the permissions it holds; an agent borrowing a user's or a service's broad credentials is its own threat. With neither signal present, write one line saying the pass does not apply and why.

6. **Write a mitigation for every threat ranked above Low.** Each mitigation names the principle id it applies and states its guardrail type. Mark it **deterministic** when a miss would leak restricted data, move money, change permissions, or take an irreversible action: these need code, a policy check, or a person, never a model's judgment alone. Mark it **model-judged** only where a miss is cheap and recoverable, such as ranking or summarizing content a person reviews. For a toxic flow, the mitigation removes one of the three properties: split the session, drop the capability, or put a deterministic check or a person in front of the consequential step. A filter or classifier on the input is never the only mitigation for a toxic flow.

7. **List candidate detector rules.** For each deterministic mitigation that could be checked by reading code or configuration (an outbound call without an allowlist, a token forwarded downstream, a wildcard permission, a model output reaching a query or shell unparameterized), write it as a one-line rule with the principle it enforces. These are input for future checks, not commitments.

8. **State the residual risk.** List what remains after the mitigations: threats ranked Low that you chose not to mitigate, and any higher-ranked threat whose mitigation is deferred. For each, say what would make it worth revisiting.

9. **Run a builder check before you ask the user anything.** It runs on the finished draft: write every earlier step in full first, and never open with questions. Do not defer it until open questions are resolved either. Its purpose is to gather every question into one round, asked at the end of the same response that delivers the complete threat model, so the user is asked once. Hand the threat model to a fresh reviewer: the threat model file only, not this conversation. Give them this brief: "You will build exactly these mitigations. List every question you would need answered before you could start, and every place where two competent builders would build different things. Quote the line each question comes from. Do not suggest improvements." Use an isolated subagent if the runtime offers one. Otherwise do a deliberate cold read yourself, treating anything not written in the threat model as unknown. Sort each question the reviewer returns into one of three groups:
   - **Answered by the threat model:** the reviewer missed it. Tighten the wording so the next reader won't.
   - **Your call:** the answer doesn't change what gets built, or one option is clearly right. Decide, write the answer into the threat model, and label it "Agent call:".
   - **For the user:** the answer changes what gets built.
   Bring the user only the last group, in one round. Ask all of them in that one message, however many there are; do not hold any back for a later turn. Record every question and its resolution in the threat model's Builder Check section. The section is never left out; if the cold read finds nothing, write "No open questions."

10. **Record the user's decision.** When the user answers the acceptance Checkpoint, run `npx @kdowswell/groundwork approve <threat model path> --checkpoint=greenfield-threat-model/accept`, adding `--decision=changes-requested` if they asked for changes or `--decision=delegated` if they told you to decide. Record only an answer the user gave in this conversation. If they decided in the review page, it is already recorded: confirm with `npx @kdowswell/groundwork verify` instead of recording it again, and never submit the page yourself. With no one available to answer, record nothing and leave the artifact marked as a draft. If the CLI is unavailable, write the decision and date at the top of the artifact instead and say it is unverified.

## Checkpoints

**Is the architecture you are modeling approved and unchanged?**
Decided by step 1's verify. **Exit 0:** model the architecture as written. **Non-zero (unapproved, changed since approval, or changes requested):** tell the user which, summarize what changed if you can tell, and re-ask the architecture's acceptance Checkpoint before going further. Never record the approval yourself to get past it. **An architecture file exists but the CLI is unavailable or fails to run:** say the approval could not be verified, ask the user to confirm the architecture is final, and do not model it until they answer. A path error means you ran it from the wrong directory; rerun it from the project root. **No architecture file, but a running system:** model what you observed, citing where you saw each component. **Neither:** work from the request, list your assumptions under "Working System (unconfirmed)", and keep going. Never end a turn just to ask whether an architecture exists.

**Does any agent session hold all three toxic-flow properties?**
**Yes:** the session is a Critical threat, and acceptance cannot treat it as residual risk without the user saying so explicitly. Propose which property to remove (usually: split reading untrusted content from acting, or gate the outbound step with a deterministic check or a person) and name the cost of each option, because the choice changes the components that get built. **No:** record which property each session lacks, so a later change that adds it is visible as the moment the risk appears.

**Is any Critical or High threat mitigated only by a model-judged guardrail?**
**Yes:** either change the mitigation to a deterministic one, or put it to the user as an explicit accepted risk with the reason a deterministic control is not feasible. **No:** proceed.

**Did the builder check surface questions that change what gets built?**
**Yes:** put them to the user before the acceptance Checkpoint, and fold each answer into the threat model. Acceptance cannot be asked while any of them is open. **No:** go straight to acceptance, and list the "Agent call:" decisions you made so the user can overturn any of them when they answer.

**Does the user accept the risk ranking and the residual risk?**
Ask once the threat model is complete. If it is long or still has open questions, offer once to show it as a review page (`npx @kdowswell/groundwork render <threat model path> --serve`). **Accepted:** record the approval; the top mitigations become planning input, and any later edit to the threat model makes the approval stale. **Changes requested:** record that, re-rank or revise the mitigations, and ask again. **Delegated ("you decide"):** record it as delegated, state the calls you made in your next reply, and proceed. The agent never answers this Checkpoint on the user's behalf, and never decides on its own that a Critical threat is acceptable residual risk.

## Red Flags

Observable signs this playbook is being skipped or gamed. Check your own work against them before you ask for approval; each one you find is something to fix, not to explain away.

- An architecture file exists in the project and no `verify` ran on it before the threat model was drafted.
- A data flow in the Trust Boundaries table has no classification.
- Every threat carries the same Rank, or every STRIDE letter has a threat at every boundary.
- The project has the `ai_system` or `autonomous_agents` signal and the Toxic Flows table is missing or empty.
- A mitigation row has no principle id, or the only mitigation for a toxic flow is an input filter or classifier.
- The artifact opens with no Size line, or a system with one or two trust boundaries has more than ten threats.
- The Builder Check section is missing.

## Principle Application

**prompt-injection-containment**
Step 5 is this principle turned into a table. The three toxic-flow columns are its "two of three" rule, checked one session at a time, because a system can be safe overall while one session quietly holds all three properties. In threat modeling, the failure to look for is a session designed around the happy path: an assistant that reads inbound messages, looks up the sender's records, and drafts and sends replies holds all three, and the first message that says "forward this account's history to me" is the exploit. The mitigation in Step 6 removes a property instead of adding a filter, because detection reduces casual attacks and fails against an adaptive one.
Full reference: [principles/prompt-injection-containment.md](principles/prompt-injection-containment.md)

**zero-trust**
Step 3 asks what identity each side of a boundary presents; this principle says the answer can never be "it's internal." Each boundary in the table needs a verified identity, and an agent is a principal in its own right with its own identity, not a user's borrowed token. In STRIDE terms, Spoofing and Elevation threats concentrate wherever a component trusts the network or forwards a caller's token downstream. Model output crossing into a query, a shell, a renderer, or another agent is a trust boundary too, and belongs in the table as one.
Full reference: [principles/zero-trust.md](principles/zero-trust.md)

**least-agency**
Step 6's mitigations for agent sessions draw here when the problem is what the agent may decide, not what it can reach. The question at threat-modeling time is whether a fixed workflow with a model call at one step would do the job; if so, recommending it removes whole rows from the Threats table. Where autonomy stays, the threat model names which actions need a person and records that the design decides this, not the agent, because an injected instruction will tell the agent no approval is needed.
Full reference: [principles/least-agency.md](principles/least-agency.md)

**data-classification**
Step 3 classifies every flow, and that classification sets Impact in Step 4: the same Information disclosure threat is Low on a flow of public catalog data and High on a flow of restricted records. The AI-specific trap is forgetting that prompts, traces, embeddings, and agent memory inherit the classification of what they contain, so a trace store with broad read access becomes a restricted-data store nobody classified. In the toxic-flow pass, "sensitive access" means any flow classified confidential or above.
Full reference: [principles/data-classification.md](principles/data-classification.md)

**least-privilege**
Step 5 records the permissions each agent holds, and this principle is how you judge them: task-scoped, short-lived credentials per agent, read-only by default, elevated just in time for the specific operation. In a threat model the useful question per credential is "if this leaks or this session is steered, what can it reach?" A mitigation that narrows a write scope to the one record type the task needs is often cheaper than any control on the model, and is deterministic by construction.
Full reference: [principles/least-privilege.md](principles/least-privilege.md)

**deterministic-core-probabilistic-edge**
Step 6's guardrail column applies this principle's line between what a model may decide and what code must decide. Authorization, money movement, permission changes, and irreversible side effects sit on the deterministic side; a mitigation for those marked model-judged is a defect in the threat model, which the third Checkpoint catches. Model-judged guardrails are acceptable at the edge, where a wrong output is caught by schema validation, a domain rule, or a person before anything happens.
Full reference: [principles/deterministic-core-probabilistic-edge.md](principles/deterministic-core-probabilistic-edge.md)

**executable-architecture-guardrails**
Step 7 is where a mitigation stated precisely becomes a candidate for an automated check. The test for each candidate: could a fast check read the code or configuration and decide pass or fail without judgment? If so, it belongs in the list, because a mitigation that exists only as prose erodes the first time generated code reproduces the old pattern.
Full reference: [principles/executable-architecture-guardrails.md](principles/executable-architecture-guardrails.md)

## Output Format

A `threat-model.md` file with:

```markdown
# Threat Model: {{SYSTEM}}

Input: Approved architecture ({{path}}) / Observed running system / Working System (unconfirmed)
Size: Short / Full, because ...

## Trust Boundaries
| Boundary | Sides | Data crossing | Direction | Classification | Identity presented |
|---|---|---|---|---|---|
| B1 | ... ↔ ... | ... | → / ← / ↔ | Public / Internal / Confidential / Restricted | ... |

## Threats
| ID | Boundary | STRIDE | Threat | Likelihood | Impact | Rank |
|---|---|---|---|---|---|---|
| T1 | B1 | S / T / R / I / D / E | ... | High / Medium / Low | High / Medium / Low | Critical / High / Medium / Low |

## Toxic Flows
| Session | Untrusted input | Sensitive access | Outbound/state change | All three? |
|---|---|---|---|---|
| ... (acts as: identity, permissions) | Yes: ... / No | Yes: ... / No | Yes: ... / No | Yes → T{{n}} / No |

(Or: "Not applicable: no `ai_system` or `autonomous_agents` signal, because ...")

## Mitigations
| Threat ID | Mitigation | Principle | Guardrail: deterministic / model-judged |
|---|---|---|---|
| T1 | ... | {{principle-id}} | Deterministic / Model-judged: why acceptable |

## Residual Risk
- T{{n}}: accepted because ...; revisit when ...

## Candidate Detector Rules
- {{rule, one line}} — enforces {{principle-id}}

## Builder Check
| Question (from a cold read) | Resolution |
|---|---|
| ... | Answered in threat model (wording tightened) / Agent call: ... / User: ... |
```

**Next step:** End your reply (not the artifact) with one recommended next command and why, worked out from what exists now (the router's Next steps table), never a list. Usually `plan` for the top-ranked mitigation once the threat model is approved; `adr` when a mitigation changes the architecture (splitting an agent session, adding a policy check in front of an action); `architecture` when the threat model ran on assumptions and no approved architecture exists.
