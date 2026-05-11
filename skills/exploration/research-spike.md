---
id: research-spike
title: "Research Spike"
phase: exploration
description: >
  Run a time-boxed technical investigation with a defined question, approach,
  and exit criteria so the spike produces a decision, not just information.
trigger: >
  When a technical question is blocking a decision and the answer isn't
  knowable without experimentation, prototyping, or deep reading.
entry_criteria:
  - "A specific question to answer is written down (not a topic to explore)"
  - "A time box is agreed upon"
  - "The decision that depends on this question is identified"
exit_criteria:
  - "The original question is answered with evidence"
  - "A recommendation is written (not just findings)"
  - "The decision that was blocked is unblocked or explicitly re-scoped"
time_box: "1-3 days"
tags: [exploration, research, discovery, prototype]
---

# Research Spike

## When to Use This Skill

Use this skill when a technical question must be answered before a decision can be made, and the answer requires more than reading documentation or asking a colleague. Typical triggers: "we don't know if this approach will perform at scale," "we've never integrated with this third-party API," "the library claims to support X but we need to verify it works in our stack."

A spike is not the same as open-ended exploration. It has a question, a time box, and a decision it must unblock. If those three things aren't defined before the spike starts, it will expand to fill all available time and produce a memo instead of a decision.

What goes wrong when you skip it: the team builds on an untested assumption. The assumption is wrong. The discovery happens in production or at a sprint review, not in a controlled spike. The rewrite cost is 10x the spike cost would have been.

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
