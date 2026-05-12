---
name: tradeoff-analysis
title: "Tradeoff Analysis"
description: >
  Produce a structured comparison of two or more implementation approaches that
  captures the decision, alternatives considered, and reversal conditions.
  Invoke when the team is choosing between meaningfully different approaches
  with architectural implications that will be expensive to change later.
phase: exploration
entry_criteria:
  - "At least two distinct approaches have been identified"
  - "The decision criteria are known (or need to be surfaced)"
  - "The team agrees this decision is worth documenting"
exit_criteria:
  - "Each approach is evaluated against the same criteria"
  - "A recommendation is made and its reasoning is explicit"
  - "Reversal conditions are documented: what would cause this decision to change"
time_box: "60-120 minutes"
tags: [exploration, architecture, decision, adr]
---

# Tradeoff Analysis

## When to Use This Skill

Use this skill when the team is choosing between two meaningfully different approaches and the choice will shape the system for a significant time. The analysis is meant to be lightweight enough to do in a meeting but rigorous enough to be useful when someone asks "why did we choose this?" six months from now.

Not every choice needs a tradeoff analysis. Use it when: the approaches have significantly different failure modes, the decision is hard to reverse, reasonable engineers disagree about which is better, or the choice has implications beyond the immediate feature.

What goes wrong when you skip it: the team picks an approach, usually the one suggested by whoever spoke last or loudest, and doesn't document why. Six months later, the choice is reconsidered because someone joined the team who has strong opinions about it. The debate restarts from scratch because no one wrote down why the original choice was made.

## Steps

1. **Name the decision precisely.** Write one sentence: "We are deciding: X." The sentence should be specific enough that someone reading it in a year can tell exactly what was being decided. "We are deciding which data store to use" is too vague. "We are deciding whether to use a relational or document data store for the event log" is specific.

2. **List the approaches.** Write 2–4 distinct approaches. If you can describe more than 4, you have too many options — collapse similar ones, or pick the 3 most viable for comparison. Each approach should be a real option the team would seriously consider, not a strawman.

3. **Define the decision criteria.** Write 4–7 criteria that matter for this specific decision. Criteria should be:
   - Specific to this decision (not generic)
   - Evaluable without perfect information
   - Weighted by importance if they're not equal
   
   Common categories: operational complexity, performance at expected scale, team familiarity, migration cost from current state, cost of reversal.

4. **Evaluate each approach against each criterion.** Use a simple scale (Strong / Adequate / Weak) or a numeric score (1-3). Be specific about *why* each approach scores how it does — the reasoning is what will be useful later, not the score.

5. **Identify the non-negotiables.** Are there criteria where one approach scores Weak and the score is disqualifying? If a compliance requirement rules out approach A, the analysis is over — document that and move to the remaining options.

6. **Make a recommendation.** State which approach the agent recommends and why. The recommendation should follow from the evaluation — if it doesn't, either the criteria are wrong or there's an unstated factor driving the recommendation. Surface it.

7. **Write the reversal conditions.** What would cause this decision to change in the future? "If the team grows beyond X engineers," "if the data volume exceeds Y," "if the compliance requirements change to include Z." These conditions are the early warning system for when the decision should be revisited.

## Checkpoints

**Are the criteria genuinely relevant to this decision, or generic?**
"Developer experience" and "community support" appear in almost every tradeoff analysis and are often the least informative criteria. Ask: what is the specific decision being made, and what criteria are most load-bearing for *that* decision? Generic criteria produce generic analyses that don't help with the actual choice.

**Does the recommendation follow from the evaluation, or is the evaluation backfilling a predetermined conclusion?**
If the evaluation was written after the recommendation was already known, it will look balanced on the surface and consistently find reasons to prefer the chosen approach. A useful test: would a different evaluator reach the same conclusion from the same criteria and scores? If not, either the criteria are biased or the recommendation is not well-founded.

**Are the reversal conditions specific?**
"If things change" is not a reversal condition. "If monthly active users exceed 100K and the data store becomes a query bottleneck" is. Vague reversal conditions will never be recognized when they occur; specific ones might be.

## Principle Application

The applicable principles depend entirely on what is being compared. Before writing the criteria, scan the active principle set for principles that are directly relevant to the decision:

- Choosing between consistency approaches → `consistency-models`
- Choosing a deployment topology → `horizontal-scaling`, `fault-isolation`
- Choosing an authentication approach → `least-privilege`, `zero-trust`
- Choosing a data architecture → `data-ownership`, `schema-evolution`

For each relevant principle, add at least one criterion that tests whether each approach aligns with the principle. The principle's "What Good Looks Like" section defines what a score of Strong looks like for that criterion.

## Output Format

A `tradeoff-{{DECISION-SLUG}}.md` file (often becomes the basis for an ADR):

```markdown
# Tradeoff: {{DECISION}}

**Date:** YYYY-MM-DD
**Context:** {{ONE SENTENCE ON WHY THIS DECISION IS BEING MADE NOW}}

## Approaches
1. **{{APPROACH A}}** — brief description
2. **{{APPROACH B}}** — brief description

## Evaluation

| Criterion | Weight | Approach A | Approach B |
|---|---|---|---|
| {{CRITERION}} | High / Medium / Low | Strong / Adequate / Weak | ... |

### Reasoning
**{{CRITERION}}:** Approach A scores Strong because... Approach B scores Weak because...

## Non-Negotiables
- {{CRITERION}}: Approach A is disqualified because...

## Recommendation
**Approach {{X}}** because:
- ...

## Reversal Conditions
This decision should be revisited if:
- ...
```
