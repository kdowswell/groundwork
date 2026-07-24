<!-- generated from skills/exploration-tradeoff-analysis/SKILL.md by scripts/sync-router-references.ts.
     Edit the source skill, then run: npm run sync:router -->

# Tradeoff Analysis (`/groundwork compare`)

**Phase:** Explore (exploration) · **Time box:** 60-120 minutes

**Before you start:** load project context for this session if you have not already (see the
router's Steps); honor active principles throughout. Entry criteria below must hold — if one
does not, say which and route to the command that establishes it instead of proceeding.

**Entry criteria:**
- At least two distinct approaches have been identified
- The decision criteria are known (or need to be surfaced)
- The team agrees this decision is worth documenting

**Exit criteria:**
- Each approach is evaluated against the same criteria
- A recommendation is made and its reasoning is explicit
- Reversal conditions are documented: what would cause this decision to change

---

## How This Skill Works

This skill structures a comparison between meaningfully different approaches so the team makes a documented, reasoned decision — not one driven by whoever spoke last. The output is an analysis document with the decision, alternatives considered, failure modes for each, and the conditions under which the decision should be revisited.

Not every choice warrants this skill. It earns its time when: the approaches have significantly different failure modes, the decision is hard to reverse, reasonable engineers disagree, or the choice has implications beyond the immediate feature.

The agent structures the comparison by applying the principle library to each approach's failure modes and constraints. The human provides what the agent cannot derive: which failure modes are acceptable given the team's capabilities, what organizational constraints apply, and what has already been tried.

**Key concepts used in the Steps:**
- **Approach** — a meaningfully distinct implementation strategy with its own assumptions and failure modes
- **Failure mode** — the specific way an approach breaks or degrades under stress
- **Reversal condition** — the observable signal that would cause the team to revisit and potentially reverse the decision
- **Decision record** — the output artifact: decision, context, alternatives considered, rationale, reversal conditions

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
- Choosing between infrastructure options or architecturally different implementations → `finops-cost-visibility`

For each relevant principle, add at least one criterion that tests whether each approach aligns with the principle. The principle's "What Good Looks Like" section defines what a score of Strong looks like for that criterion.

**finops-cost-visibility**
Cost per unit of work should be a first-class criterion in Step 3 whenever the approaches being compared have meaningfully different cost profiles at scale. Add it when: the approaches use different infrastructure shapes (synchronous vs. async, object storage vs. block storage, on-demand vs. provisioned capacity), when one approach fans out significantly more than the other, or when AI/ML inference is part of the architecture. "Costs about the same" is only safe to assume when the approaches are structurally similar. Approaches that differ in fan-out, data transfer, or inference cost often have 5–10× cost differences at production scale that are invisible at current load. Score each approach's cost profile against expected peak load, not current load — the decision will outlive the scale it was made at.
Full reference: [principles/finops-cost-visibility.md](principles/finops-cost-visibility.md)

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
