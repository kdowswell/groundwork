<!-- generated from skills/brownfield-debt-triage/SKILL.md by scripts/sync-router-references.ts.
     Edit the source skill, then run: npm run sync:router -->

# Debt Triage (`/groundwork triage`)

**Phase:** Evolve (brownfield) · **Time box:** 60-90 minutes

**Before you start:** load project context for this session if you have not already (see the
router's Steps); honor active principles throughout. Entry criteria below must hold — if one
does not, say which and route to the command that establishes it instead of proceeding.

**Entry criteria:**
- A list of known technical debt items exists (or will be assembled in this skill)
- The current development focus (sprint goal, quarter goal) is known

**Exit criteria:**
- Each debt item is categorized by type and scored by cost-to-carry
- Debt items are prioritized: pay now, schedule, accept, or delete
- Items marked 'pay now' have an owner and estimated effort

---

## How This Skill Works

This skill makes technical debt explicit, categorized, and prioritized so the team can make a conscious decision about each item rather than ignoring debt collectively or addressing it randomly. The output is a debt register with a recommended action — pay, accept, or close — for each item.

Technical debt is not inherently bad. Some debt was the right tradeoff when it was made and remains acceptable. The goal is not to eliminate all debt — it's to identify which debt is actively costing the team and address only that.

The agent structures the categorization and surfaces the cost/risk framing for each item. The human provides what the agent cannot determine: actual velocity cost data, team capacity constraints, and the business context that determines whether a given item is blocking, tolerable, or irrelevant.

**Key concepts used in the Steps:**
- **Debt categories** — structural (architecture), tactical (implementation shortcuts), test (coverage gaps)
- **Pay** — address the debt in the current or upcoming sprint
- **Accept** — acknowledge and monitor; revisit when conditions change
- **Close** — no longer relevant; remove from the register
- **Cost signal** — observable evidence that a debt item is actively slowing work (frequent breakage, slow onboarding, recurring incidents)

## Steps

1. **Assemble the debt inventory.** Collect debt items from: code comments (`TODO`, `FIXME`, `HACK`, `WORKAROUND`), known performance issues, security findings not yet addressed, outdated dependencies, missing test coverage, architectural shortcuts taken during delivery, and team complaints. Add anything the team knows about intuitively but hasn't written down. Aim for completeness over organization at this step.

2. **Categorize each item.** Assign each debt item one of four types:
   - **Prudent debt** — a deliberate tradeoff taken to ship faster; the team knew it was debt when they took it
   - **Inadvertent debt** — discovered later; wasn't obvious it was debt when the code was written
   - **Reckless debt** — "we don't have time for tests" or "we'll fix it later" without a plan
   - **Architectural debt** — structural decisions that now constrain the team's ability to evolve the system
   
   The type affects the priority: architectural debt often compounds faster; prudent debt may have a repayment date already implied; reckless debt should not be repeated regardless of when it's paid.

3. **Score each item by cost-to-carry.** For each debt item, estimate the ongoing cost of leaving it unaddressed:
   - **Velocity tax** — does this debt slow down every feature built in this area? (1=none, 3=significant)
   - **Risk of incident** — does this debt increase the probability or severity of a production issue? (1=none, 3=high)
   - **Compounding rate** — does this debt get harder to fix as the system grows? (1=stays the same, 3=compounds fast)
   
   Total score = velocity tax + risk + compounding rate. Items with score ≥ 7 are the most urgent.

4. **Prioritize into four buckets:**
   - **Pay now** — high cost-to-carry, in or adjacent to the current sprint's focus area. Assign an owner and estimate the effort.
   - **Schedule** — high cost-to-carry, not in the current focus area. Add to the backlog with a target sprint.
   - **Accept** — low cost-to-carry. Explicitly acknowledge the debt and stop worrying about it. Remove from the active guilt list.
   - **Delete** — debt that has already been paid, or that is in code the team will never touch again. Remove from the inventory.

5. **Size the "pay now" items.** For each item in the "pay now" bucket, estimate the effort (hours or story points). Check: does the total effort fit in the sprint alongside the feature work? If not, prioritize within the "pay now" bucket and move excess to "schedule."

6. **Document the accepted debt.** For each item moved to "accept," write one sentence explaining why: "This API is slow but only used in the admin panel, which has 3 users. Not worth fixing until user count increases." This prevents the item from being rediscovered and re-debated in future triages.

## Checkpoints

**Is the team conflating debt with features?**
"We should rewrite the authentication module" may be a feature (if the module is functionally insufficient) or debt (if it works but is difficult to change). The distinction matters for prioritization: debt competes with the team's capacity to evolve; features compete with the team's capacity to deliver. Categorize correctly before prioritizing.

**Is the "pay now" bucket realistic?**
If the "pay now" bucket contains more work than the team can complete in two sprints, it's not a triage — it's a wishlist. The real question is: what is the highest-cost debt the team can address *in this sprint*? Everything else is scheduled or accepted.

**Are there items in "accept" that the team will keep rediscovering?**
If the same items keep appearing on every triage list and keep being moved to "accept," either the cost-to-carry is being underestimated (and they should be in "schedule"), or the team needs to formally close them (delete or document why they're accepted for good). Items that are perpetually reconsidered are a hidden velocity tax.

## Principle Application

**tech-debt-management**
This entire skill operationalizes this principle. The "Questions the Agent Should Ask" section from the principle drives the cost-to-carry scoring in Step 3. The "What Good Looks Like" section defines the target state: debt that is visible, categorized, and managed rather than invisible and accumulated.

When applying this skill, surface the principle's definition of load-bearing debt — debt in code that is about to be changed, that sits on a critical path, or that compounds with scale. These items get priority regardless of their origin.

**finops-cost-visibility**
The velocity tax and risk scoring in Step 3 captures developer time and incident cost. The principle extends this to infrastructure cost: some technical debt actively inflates cloud spend — over-provisioned resources holding on from an earlier scale decision, inefficient query patterns driving up compute or data-transfer costs, redundant data copies inflating storage, retry storms amplifying API call volume. When scoring an item's cost-to-carry in Step 3, include operational cost impact as part of the risk dimension, not just incident probability. An item that increases cloud spend by 20% per month carries a cost-to-carry that doesn't appear in incident metrics and may not surface in any alert — only in the monthly bill. Debt items tied to cost inefficiency that sit in actively changing code should score high on compounding rate: each new feature built on top of an inefficient pattern inherits its cost profile.
Full reference: [principles/finops-cost-visibility.md](principles/finops-cost-visibility.md)

## Output Format

A `debt-triage-{{DATE}}.md` file:

```markdown
# Debt Triage — {{DATE}}

**Sprint / planning cycle:** {{SPRINT OR QUARTER}}
**Conducted by:** {{TEAM OR INDIVIDUALS}}

## Inventory

| Item | Type | Velocity | Risk | Compounding | Total | Bucket |
|---|---|---|---|---|---|---|
| ... | Prudent / Inadvertent / Reckless / Architectural | 1-3 | 1-3 | 1-3 | n | Pay now / Schedule / Accept / Delete |

## Pay Now
| Item | Owner | Effort | Sprint |
|---|---|---|---|
| ... | ... | ... | Current |

## Scheduled
| Item | Target sprint | Notes |
|---|---|---|
| ... | ... | ... |

## Accepted
| Item | Reason |
|---|---|
| ... | One sentence why this is acceptable to leave |
```
