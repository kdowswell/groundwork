---
id: tech-debt-management
title: Tech Debt Management
category: operations
sources:
  - name: Martin Fowler — Technical Debt
    url: https://martinfowler.com/bliki/TechnicalDebt.html
  - name: Martin Fowler — Technical Debt Quadrant
    url: https://martinfowler.com/bliki/TechnicalDebtQuadrant.html
  - name: Ward Cunningham — The WyCash Portfolio Management System (OOPSLA '92)
    url: https://c2.com/doc/oopsla92.html
  - name: Accelerate (Forsgren, Humble, Kim) — DORA Research Program
    url: https://dora.dev/research/
  - name: "GitClear — AI Copilot Code Quality: 2025 Look Back at 12 Months of Data"
    url: https://www.gitclear.com/ai_assistant_code_quality_2025_research
  - name: "Thoughtworks Technology Radar Vol. 34 — themes, incl. cognitive debt (Apr 2026)"
    url: https://www.thoughtworks.com/insights/podcasts/technology-podcasts/themes-technology-radar-34
applies_when:
  scope: [new_build, epic, feature, story, bug_fix]
  scale: [solo, team, enterprise]
  stage: [refinement, build, maintain]
  domains: [any_production]
tags: [operations, technical-debt, refactoring, code-quality, prioritization, sustainability, duplication, ai-assisted-development]
---

# Tech Debt Management

## Principle
Tech debt is the difference between the system you have and the system you would have built knowing what you know now. Like financial debt, some of it is a deliberate, productive choice (ship now, learn faster) and some of it is unintentional (you didn't know what you didn't know). Manage it the way you would manage a loan — make it visible, account for the interest you are paying, and make a deliberate decision about when to pay it down rather than letting it compound silently.

AI-generated change shifts what debt looks like. Assistants tend to add new code rather than reuse or restructure what exists, so debt accumulates as duplication and missing refactoring, faster than any one change makes visible. A second kind grows alongside it: cognitive debt, where code exists that nobody on the team has had to understand, so nobody can explain or safely change it. Measure duplication and churn, schedule deliberate consolidation instead of assuming it will happen in passing, and keep a human who can explain each important module.

## When This Matters
- The same area of the codebase is producing recurring bugs, slow change, or onboarding pain
- A new feature requires a workaround because of a known structural shortcut taken earlier
- The team feels "slower than they should be" but cannot point to a single cause
- A roadmap commitment depends on touching code that nobody wants to touch
- A migration, framework upgrade, or platform change is on the horizon and the cost depends on existing debt
- A senior engineer is leaving and their tacit knowledge of fragile areas is at risk
- AI coding agents write a large share of new code, so duplication and unreviewed complexity can grow faster than anyone notices

## When This Doesn't Matter
- Throwaway prototypes and spikes whose purpose is to be deleted
- Code in stable, low-change areas where current shortcomings impose no real cost
- Aesthetic preferences dressed up as debt — "I would have used a different pattern" is not debt if the existing one is working

## Questions the Agent Should Ask
- Is this debt deliberate (we knew, we chose this) or inadvertent (we now know better), and is it prudent (we understood the trade-off) or reckless (we didn't)?
- What is the interest you are paying on this debt — measurable in slower change, more bugs, harder onboarding, or higher operational toil?
- What upcoming work will be made significantly cheaper if this debt is paid down first, and what work is unaffected?
- Is this tracked somewhere visible to product and engineering, or does it live only in tribal memory and Slack rants?
- What is the smallest payment that meaningfully reduces the interest, versus the full rewrite that everyone says they want?
- Who else is touching this code in the next quarter, and could the payment be done as part of work already planned?
- Is this debt actually a constraint worth living with — sometimes the right answer is to leave it and move on?
- Is duplicated code rising as generated code increases, and when did the team last consolidate rather than add?
- For each important module, is there a person who can explain how it works and why, or was it generated and merged without anyone needing to understand it?

## What Good Looks Like
- Known debt is recorded somewhere durable (backlog, register, code comments) with the impact and the trigger that should prompt repayment
- Each piece of debt is classified by intent (deliberate / inadvertent) and judgment (prudent / reckless), so the team treats them differently
- Repayment happens incrementally, alongside feature work in the same area, rather than as a quarterly "tech debt sprint" that gets cancelled
- Product and engineering share the conversation about debt — it is described in terms of cost and risk, not "the code is ugly"
- The team can name the top three pieces of debt and what would change if they were paid down
- Debt that is no longer painful gets retired from the register; the list is curated, not append-only
- Duplication and churn are measured over time, and consolidation passes are planned work, not something expected to happen as a side effect of features
- Every important module has a named person who can explain it; generated code that nobody understands is recorded as debt like any other

## What Goes Wrong When You Skip This
- Velocity quietly halves over two years; nobody can point to a cause because no individual change made it worse, and the team is told to "just go faster"
- A simple feature request becomes a six-week project because it requires touching code that everyone has been routing around
- A "tech debt sprint" gets approved, scope-creeps into a rewrite, and is cancelled at 60% — leaving the system worse than before
- Reckless debt — a hack everyone forgot about — causes a production incident years later because the original author left and the workaround was never documented
- Six months of agent-written features each add a slightly different copy of the same validation logic; a rule change now has to be found and fixed in nine places, and the copies have already drifted apart
- An incident lands in a module that was generated, merged, and never needed explaining; nobody on call knows how it works, and recovery waits on someone reading it for the first time

## Further Reading
Ward Cunningham's original metaphor and Martin Fowler's debt quadrant together establish how to talk about debt: not as a moral failing but as a financing choice with quantifiable interest. The DORA research behind *Accelerate* connects the discipline of paying debt down to measurable delivery performance and team well-being. GitClear's study of 211 million changed lines from 2020 to 2024 found copy/pasted lines rose from 8.3% to 12.3% of changes while lines associated with refactoring fell from 25% to under 10%, a pattern it links to the spread of AI coding assistants. Thoughtworks' Technology Radar Vol. 34 names cognitive debt, the loss of understanding that comes from not doing the work yourself, as a theme of agent-assisted development.
