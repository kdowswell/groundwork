---
name: exploration-research-spike
title: "Research Spike"
description: >
  Runs a time-boxed technical investigation with a defined question, approach,
  and exit criteria so the spike produces a decision, not just information. Use
  when a technical question is blocking a decision, when the team says "we need
  to research this first," or when the right approach requires a proof of concept.
phase: exploration
entry_criteria:
  - "A specific question to answer is written down (not a topic to explore)"
  - "A time box is agreed upon"
  - "The decision that depends on this question is identified"
exit_criteria:
  - "The original question is answered with evidence"
  - "A recommendation is written (not just findings)"
  - "The decision that was blocked is unblocked or explicitly re-scoped"
time_box: "1-3 days"
principles:
  - testing-strategy
tags: [exploration, research, discovery, prototype]
---

# Research Spike

## How This Skill Works

This skill structures a technical investigation so it produces a specific decision, not just information. The output is a spike report: a stated question, the approach taken, what was found, and the decision the findings enable.

A spike is not open-ended exploration. It has a question, a time box, and a decision it must unblock. If those three things are not defined before the spike starts, it will expand to fill available time and produce a memo instead of a conclusion.

The agent structures the investigation — defining the question, setting exit criteria, and tracking findings against the original question. The human provides the domain context and directs the investigation toward the areas of highest uncertainty.

**Key concepts used in the Steps:**
- **Spike question** — the specific, answerable question the spike is designed to resolve
- **Time box** — the maximum time allocated; findings at the time box are the findings, even if incomplete
- **Exit criteria** — the condition under which the spike is complete (question answered, or sufficient information to make the decision)
- **Decision** — the specific choice the spike unblocks; a spike that ends without a decision has not met its exit criteria
- **Spike report** — the output artifact: question, approach, findings, decision

## Steps

1. **Write the question precisely.** The question should be answerable with YES, NO, or a specific value — not "how does X work?" but "can X handle Y requests per second with Z latency at P95?" If you can't write a precise question, the thing you're investigating is still a topic, not a spike. Narrow it further.

2. **Identify the decision this unblocks.** Write it down: "Once we know the answer to this question, we will decide X." This is the spike's success criterion. If the spike can't unblock a decision, it's not necessary — or the decision is already made without knowing it.

3. **Set the time box.** Choose the minimum time to get a reliable answer, not the time it would take to be certain. Spikes are bounded uncertainty reduction, not exhaustive research. Common choices: 2 hours (feasibility check), 1 day (integration test), 3 days (performance characterization). If more time is needed, the scope is too large — split the spike.

4. **Define the approach before starting.** Write 2–4 steps you will take to answer the question. This forces you to commit to a method rather than wandering through the problem space. If you don't know how to approach it, that's a finding worth reporting — "we don't know how to investigate this" is a useful output.

5. **Run the investigation.** Follow the approach from Step 4. If you discover mid-spike that the approach is wrong, stop and document what you learned, then revise the approach rather than silently pivoting.

6. **Write the recommendation, not just the findings.** Findings describe what you observed. Recommendations say what to do about it. The output of a spike is a recommendation that unblocks the decision, supported by findings as evidence. "We found X, Y, and Z" is a memo. "Based on X, Y, and Z, we should do A rather than B" is a spike output.

7. **Dispose of spike code.** Code written during a spike is exploration code, not production code. Delete it or clearly mark it as throwaway. The spike output is the recommendation document, not the code. If the code is worth keeping, it needs a real code review and real tests — it wasn't written to those standards.

## Checkpoints

**Is the time box being respected?**
If you're approaching the time limit and don't have an answer, stop and write a partial finding: "We found X but couldn't answer Y within the time box. We recommend extending by N hours to investigate Z specifically." Do not silently continue past the time box — that's scope expansion disguised as diligence.

**Is the recommendation concrete?**
If the recommendation says "it depends," that's often a sign the question was too broad. Ask: "What does it depend on?" Write those as sub-questions. Each one is a smaller spike with its own recommendation.

**Has spike code been cleanly separated from production code?**
If spike code lives in the same branch as production code with no clear boundary, it will gradually become production code through inertia. Keep spike branches separate from the main development branch.

## Principle Application

This skill doesn't reference specific principles by design — its job is to answer a question that may surface which principles apply. However, if the spike is investigating reliability, scalability, or security characteristics, the agent should check the relevant principles for known failure modes and "What Good Looks Like" criteria before writing the recommendation. Those sections contain the industry-validated bar against which spike findings should be evaluated.

**testing-strategy**
Step 4 (define the approach) is implicitly a test design question — the approach is the experiment, and the question is what fidelity it needs. The test pyramid gives vocabulary for calibrating this: if the spike is answering a feasibility question ("can this library do X?"), a targeted unit-level test is usually sufficient — write it, run it, get the answer. A performance or integration question needs a test against real infrastructure. A user behavior question cannot be answered by code at all; it needs qualitative research with actual users. Picking the wrong fidelity level wastes the time box: over-investing in a full-stack environment to answer a feasibility question, or asking engineers to imagine user behavior instead of talking to users. The spike report in Step 6 should name the level of evidence gathered so readers can assess the confidence of the recommendation. "We ran a unit-level feasibility test" carries different weight than "we ran a load test against production-equivalent infrastructure" — both are valid for their question; neither substitutes for the other.
Full reference: [principles/testing-strategy.md](principles/testing-strategy.md)

## Output Format

A `spike-{{QUESTION-SLUG}}.md` file with:

```markdown
# Spike: {{QUESTION}}

**Time box:** {{N hours/days}}
**Date:** YYYY-MM-DD
**Decision unblocked:** {{WHAT THIS ENABLES}}

## Approach
1. ...

## Findings
- ...

## Recommendation
We should {{DO X}} because {{EVIDENCE Y AND Z}}.

If the answer had been different (e.g., performance didn't meet the bar), we would have {{ALTERNATIVE PATH}}.

## Spike Code
Location: {{BRANCH OR "DELETED"}}
Status: {{Throwaway (deleted) | Kept for reference (not production-ready)}}
```
