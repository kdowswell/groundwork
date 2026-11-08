---
name: greenfield-eval-suite
disable-model-invocation: true
title: "Eval Suite"
description: >
  Designs the evaluation suite for a feature that depends on model output:
  measurable pass conditions per task, a case set (typical, edge, adversarial
  including prompt injection, and regression cases from real failures),
  deterministic graders before calibrated model judges, release-blocking and
  tracked thresholds that account for run-to-run variance, paired with/without
  runs, and re-run triggers on model upgrades. Invoke before building or
  changing a feature that generates, extracts, classifies, summarizes, answers
  from retrieved content, or takes actions through an agent, and whenever a
  prompt, model, tool, or retrieval change is about to ship without an eval gate.
phase: greenfield
entry_criteria:
  - "The AI feature and the tasks it performs are described (if not, infer them from the spec or the code and confirm them at acceptance)"
  - "A spec with success criteria exists (if not, derive pass conditions from the user's description and mark them provisional)"
  - "Real failures, transcripts, or production traces are available (if not, seed the set from the spec and hand-run outputs, and mark the set provisional until the first traces arrive)"
exit_criteria:
  - "Every task has a pass condition a grader can decide without interpretation"
  - "The case set covers typical, edge, adversarial (including prompt injection through every untrusted channel), and regression cases, split into a capability set and a regression set"
  - "Every grader is named deterministic or model-graded; every model grader has a calibration plan against human labels"
  - "Thresholds separate what blocks a release from what is tracked, with trials per case set above the measured run-to-run spread"
  - "Paired-run protocol and re-run triggers (including model version changes) are written down"
  - "The user has accepted the thresholds, or the suite is marked as a draft"
principles:
  - eval-driven-development
  - model-as-versioned-dependency
  - prompt-injection-containment
  - ml-ai-observability
time_box: "45-90 minutes"
tags: [evals, ai-systems, testing, quality-gates, greenfield, llm, agents]
---

# Eval Suite

## How This Skill Works

A feature built on a model has no compiler and no test that proves it right. The eval suite is the closest thing: a set of cases, graders, and thresholds that decides whether a change to the model, prompt, tool definitions, retrieval, or harness is allowed to ship. This skill drafts that suite as one document, `eval-suite.md`, before the feature is built or changed.

Write the full draft first from whatever exists (spec, code, transcripts, the user's description), then ask once at the end. The questions that matter are few and mostly business calls: what pass rate is good enough to ship, which failures block a release, and how much cost a quality gain may add. Those numbers belong to the user. The agent proposes them with reasons; the user accepts them.

The suite is built from experience with evals that mislead. A judge told to score "quality" rewards confident, long answers. A suite of cases the system already passes reports 100% for months and says nothing. One run per case turns noise into a "regression" or an "improvement". A small, cheap model can pass a case on one run and fail it on the next with nothing changed. Each Step below exists to close one of these gaps.

**Key concepts used in the Steps:**
- **Task**: one job the feature does for a user, with an input and an observable outcome
- **Pass condition**: a sentence that a script or a calibrated judge can decide as pass or fail without interpreting intent
- **Capability set**: cases the system still fails; shows whether a change helps
- **Regression set**: cases that should pass almost every time; shows whether a change broke something
- **Trial**: one run of one case; a case runs several trials because the same input can produce different outputs
- **Paired run**: the same cases, graders, and trial count run against the current behavior and the proposed behavior, so the difference is attributable to the change
- **Behavior version**: the model version, prompts, tool definitions, retrieval settings, and harness settings, treated as one unit

## Steps

1. **List the tasks and write what good means for each, measurably.** For each task, write the input, the outcome a user needs, and one pass condition per quality dimension: correctness, safety, format, cost, latency. State pass conditions directly ("cites at least one retrieved passage that contains the answer", "files exactly one ticket, in the project named in the request"), never as adjectives ("helpful", "accurate", "appropriate"). Include the cases where the right behavior is to refuse, ask, or do nothing, and write their pass condition too.

2. **Start from real failures.** Read the transcripts, traces, bug reports, support complaints, and hand-run outputs that exist before inventing anything. Name each failure pattern in a short phrase and count how often it appears. Each named pattern becomes at least one case. If nothing exists yet, run the current prompt or prototype by hand on 10–20 realistic inputs, read every output, and name the failures you see. Mark the set provisional and say when it will be refreshed from real traffic.

3. **Build the case set.** Aim for a few dozen cases to start, each with a reference answer or a pass condition. Cover four types:
   - **Typical**: the inputs most users send, in proportion to how often they send them
   - **Edge**: empty, very long, ambiguous, multilingual, out-of-scope, and missing-information inputs
   - **Adversarial**: prompt injection placed in every channel that reaches the model's context (the user's message, retrieved documents, tool results, uploaded files, stored memory), plus requests to leak data or act outside scope. Write the pass condition on the outcome (no ticket created, no data in the response, no outbound link rendered), not on whether the model "noticed" the attack
   - **Regression**: one case per past incident or fixed bug, named after it
   Tag each case as capability or regression. Each trial starts from a clean environment, so state left by one trial cannot make the next pass or fail.

4. **Pick a grader for every pass condition, deterministic first.** For each pass condition, ask whether code can decide it: schema validity, exact or normalized match, a required field present, a citation that points to a retrieved passage, the arguments of an action call, a forbidden string absent. Use a code check wherever the answer is yes. Use a model judge only for what remains (faithfulness to a source, tone, whether an answer addresses the question). Give each judge one dimension, a binary pass or fail, an explicit "can't tell" option, and the pass condition written out in full; if two people could read the criterion differently, rewrite it until they could not. Grade outcomes, not the exact sequence of steps, so a valid alternative path is not marked wrong. Pin the judge's model version too.

5. **Plan judge calibration against human labels.** For each model judge, have a person label a sample of outputs (30–50 to start, with both passes and failures) without seeing the judge's verdicts. Measure agreement on passing outputs and on failing outputs separately; a judge that passes everything agrees with people on passes and is useless on failures. Set the agreement a judge needs before it may gate a release. Where it falls short, sharpen the criterion and re-measure, split the dimension, or keep that dimension tracked rather than blocking. Re-run calibration when the judge's model or prompt changes.

6. **Set thresholds and gates.** For each dimension, propose a threshold and a reason, and sort it into one of two groups:
   - **Blocks a release**: regression-set pass rate, safety and adversarial outcomes, format validity that downstream code depends on
   - **Tracked**: capability-set progress, judged quality that is not yet calibrated, cost and latency trends below a ceiling
   Set trials per case and say which rule applies: "passes at least once in k trials" for output a user can retry, "passes in all k trials" for actions a user cannot undo. Run the current behavior several times and record the run-to-run spread of each score; place every blocking threshold outside that spread, and treat any change smaller than it as no change. Raise the trial count for cheaper, smaller models, whose results vary more between runs. Treat a sudden 0% or 100% on a case as a likely broken case or grader and investigate it before acting on it.

7. **Define paired runs.** Every change to the behavior version runs the suite twice on the same cases, graders, and trial counts: once without the change (current behavior) and once with it. Report the difference per case and per dimension, not one blended score. Change one thing per paired run where you can; a model upgrade shipped with a prompt rewrite cannot say which one moved the score. Before trusting any score that moved, read the transcripts behind the cases that moved.

8. **Write the re-run triggers.** The suite runs in the delivery pipeline on every change to the model version, a prompt, a tool definition, retrieval settings or the indexed content, the harness, or a judge. It also runs when the provider announces a deprecation of the pinned model, before any migration is promoted. When the model changes, each harness workaround written for the old model gets its own paired run with and without it. Name how new cases arrive after launch: who reviews sampled production traces, how often, and how a new failure pattern becomes a case.

9. **Run a builder check before you ask the user anything.** It runs on the finished draft: write every earlier step in full first, and never open with questions. Do not defer it until open questions are resolved either. Its purpose is to gather every question into one round, asked at the end of the same response that delivers the complete suite, so the user is asked once. Hand the suite to a fresh reviewer: the suite file only, not this conversation. Give them this brief: "You will implement and run exactly this eval suite. List every question you would need answered before you could start, and every place where two competent builders would grade the same output differently. Quote the line each question comes from. Do not suggest improvements." Use an isolated subagent if the runtime offers one. Otherwise do a deliberate cold read yourself, treating anything not written in the suite as unknown. Sort each question the reviewer returns into one of three groups:
   - **Answered by the suite:** the reviewer missed it. Tighten the wording so the next reader won't.
   - **Your call:** the answer doesn't change what gets graded or gated, or one option is clearly right. Decide, write the answer into the suite, and label it "Agent call:".
   - **For the user:** the answer changes what blocks a release, or what counts as a pass.
   Bring the user only the last group, in one round, merged with the threshold questions for acceptance. Ask all of them in that one message, however many there are; do not hold any back for a later turn. Record every question and its resolution in the suite's Builder Check section. The section is never left out; if the cold read finds nothing, write "No open questions."

10. **Record the user's decision.** When the user answers the acceptance Checkpoint, run `npx @kdowswell/groundwork approve <suite path> --checkpoint=greenfield-eval-suite/accept`, adding `--decision=changes-requested` if they asked for changes or `--decision=delegated` if they told you to decide. Record only an answer the user gave in this conversation. If they decided in the review page, it is already recorded: confirm with `npx @kdowswell/groundwork verify` instead of recording it again, and never submit the page yourself. With no one available to answer, record nothing and leave the suite marked as a draft. If the CLI is unavailable, write the decision and date at the top of the suite instead and say it is unverified.

## Checkpoints

**Can code decide this pass condition?**
**Yes:** it gets a deterministic grader and may block a release as soon as the suite runs. **No:** it gets a model judge, which needs a calibration sample before it can block anything; until the agreement figure exists, the dimension is tracked, and the Thresholds table says so.

**Does one session combine untrusted input, access to sensitive data, and the ability to act or send data out?**
**Yes:** adversarial cases must target the consequential action through every untrusted channel, their outcomes block a release, and they run under "passes in all k trials". A failing case here is a design finding for the architecture, not only an eval result. **No:** adversarial cases still cover injection that changes the output a user sees, and they block only when the output feeds another system.

**Can the user retry a bad output, or does the output cause an action they cannot undo?**
**Retry:** use "passes at least once in k trials" and a lower trial count. **Cannot undo:** use "passes in all k trials", raise the trial count, and gate the action itself behind a deterministic check or a person if the pass rate cannot reach the threshold.

**Is there real failure data to build from?**
**Yes:** the regression set starts from it, and every incident gets a case. **No:** seed from hand-run outputs, mark the case set and thresholds provisional, and set a date or traffic level at which they are rebuilt from production traces. Provisional thresholds may still gate; say so at acceptance.

**Did the builder check surface questions that change what gets graded or gated?**
**Yes:** put them to the user before the acceptance Checkpoint, and fold each answer into the suite. Acceptance cannot be asked while any of them is open, because two engineers would build different gates from it. **No:** go straight to acceptance, and list the "Agent call:" decisions you made so the user can overturn any of them when they answer.

**Does the user accept these thresholds as the release gate?**
Thresholds are a business call: they trade quality against cost and shipping speed. Ask once the suite is complete. If the suite is long, offer once to show it as a review page (`npx @kdowswell/groundwork render <suite path> --serve`). **Accepted:** record the approval; the blocking thresholds become the gate for every change to the behavior version, and any later edit to the suite makes the approval stale. **Changes requested:** record that, revise, and ask again; nothing is gated on this version. **Delegated ("you decide"):** record it as delegated, state the thresholds you chose and why in your next reply, and proceed. The agent never answers this Checkpoint on the user's behalf.

## Red Flags

Observable signs this playbook is being skipped or gamed. Check your own work against them before you ask for approval; each one you find is something to fix, not to explain away.

- A judge criterion contains "good", "appropriate", "helpful", "high quality", or "accurate" with no pass condition written next to it.
- Every case in the set passes on the current system, or the Case Set table has no capability cases.
- Every adversarial case puts the injected instruction in the user's own message; none places it in retrieved content, a tool result, or an uploaded file.
- Trials per case is 1, or a blocking threshold sits inside the measured run-to-run spread.
- A model judge appears in the blocking group with no human-label agreement figure or calibration plan.
- Re-run Triggers does not name a model version change, or the suite never names the pinned model version.
- An acceptance decision is recorded with no answer from the user anywhere in the conversation.

## Principle Application

**eval-driven-development**
This principle is the spine of the skill; the Steps turn it into a document a team can implement. The part teams most often skip is the split in Step 3: without a capability set, the suite reports success on what already works and cannot show that a change helped; without a regression set, a prompt fix for one complaint quietly breaks three other cases. Step 4's ordering (code checks first, then one-dimension binary judges) and Step 5's calibration exist because a judge nobody compared against people will rate fluent wrong answers as passes, and the dashboard stays green while users complain. Step 6's trial counts make consistency a measured property: a feature that passes once in development and two times in three in production was never tested for what users see.

What good looks like at this phase: a few dozen cases drawn from real failures, each with a pass condition, a grader type, and a set label; thresholds written down before the first run.

Full reference: [principles/eval-driven-development.md](principles/eval-driven-development.md)

---

**model-as-versioned-dependency**
Step 8 exists because the model underneath the feature changes on the provider's schedule. The suite names the pinned model version, and a version change is a re-run trigger like any code change, never an exception because "it's the same model, just newer". Treat model, prompts, tool definitions, retrieval, and harness as one behavior version, which is why Step 7 asks for one change per paired run: a model upgrade bundled with a prompt rewrite cannot say which moved the score. A deprecation notice starts a paired run against the replacement well before the retirement date, and every harness workaround written for the old model is re-tested with and without it.

What goes wrong when you skip it: the provider repoints an alias, output formatting shifts slightly, a downstream parser fails on a fraction of requests, and there was no deploy on your side to explain it.

Full reference: [principles/model-as-versioned-dependency.md](principles/model-as-versioned-dependency.md)

---

**prompt-injection-containment**
Step 3's adversarial cases test containment; they do not replace it. Place injected instructions in each channel that reaches the model's context (retrieved documents, tool results, files, memory), not only in the user's message, because the realistic attack arrives in content the user never wrote. Write pass conditions on outcomes: the ticket was not filed to the attacker's project, the response contains no customer data, no link to an outside address was rendered. A high pass rate on adversarial cases is evidence about the cases you thought of, not proof of safety; an adaptive attacker will find phrasings the suite lacks. So when the Checkpoint finds all three of untrusted input, sensitive access, and external action in one session, a passing suite never justifies removing the human or deterministic check in front of the consequential step.

Full reference: [principles/prompt-injection-containment.md](principles/prompt-injection-containment.md)

---

**ml-ai-observability**
The suite and production monitoring are one loop. Step 2 starts from traces, and Step 8 names who reads sampled production traces, how often, and how a new failure pattern becomes a case. The graders built here are reused on live traffic: deterministic checks run on every response, and a calibrated judge scores a sample. For that to work, traces must record the input, the output (or a reference to it under an opt-in retention policy), and the model version that actually responded, so a failure found in production can become a reproducible case. When a production quality signal drops with no change on your side, the recorded model version is the first thing to check.

Full reference: [principles/ml-ai-observability.md](principles/ml-ai-observability.md)

## Output Format

An `eval-suite.md` file (or equivalent document) with this structure:

```markdown
# Eval Suite: {{FEATURE}}

Behavior version under test: {{PINNED MODEL VERSION}}, prompts {{REF}}, tools {{REF}}, retrieval {{REF}}
Status: {{Draft / Provisional (no real failure data yet) / Accepted}}

## Tasks and What Good Means
| Task | Input | Dimension | Pass condition (stated directly) |
|---|---|---|---|
| ... | ... | Correctness / Safety / Format / Cost / Latency | ... |

## Case Set
| Type | Capability | Regression | Total | Source |
|---|---|---|---|---|
| Typical | n | n | n | traces / hand-run / spec |
| Edge | n | n | n | ... |
| Adversarial (channel: user / retrieved / tool / file / memory) | n | n | n | ... |
| Regression (incident or bug id) | n | n | n | ... |

Cases live at: {{PATH}}. Each trial starts from a clean environment: {{HOW}}

## Graders
| Pass condition | Grader | Type | Calibration (labels, agreement on passes / failures) |
|---|---|---|---|
| ... | ... | Deterministic / Model judge ({{PINNED JUDGE VERSION}}) | n/a / planned / measured |

## Thresholds and Gates
Trials per case: k = {{N}}; rule: passes at least once in k / passes in all k
Measured run-to-run spread: {{PER DIMENSION}}

| Dimension | Threshold | Blocks release / Tracked | Reason |
|---|---|---|---|
| ... | ... | ... | ... |

## Paired Runs
What is compared, which cases and trial counts, how per-case differences are reported, and who reads the transcripts behind cases that moved.

## Re-run Triggers
- Model version change, including a provider deprecation notice
- Prompt, tool definition, retrieval or indexed-content, harness, or judge change
- Production trace review: {{WHO}}, {{HOW OFTEN}}, how new failures become cases

## Builder Check
| Question (from a cold read) | Resolution |
|---|---|
| ... | Answered in suite (wording tightened) / Agent call: ... / User: ... |
```

**Next step:** End your reply (not the artifact) with one recommended next command and why, worked out from what exists now (the router's Next steps table), never a list. Usually `architecture` when the suite came before the system design, since its trace and gating needs shape the design; `plan` when the suite gates a change to a running feature; or `spike` when no threshold can be proposed until someone measures how the model performs on the task.
