---
name: brownfield-architecture-review
title: "Brownfield Architecture Review"
description: >
  Assesses an existing system against the principle library to identify
  architectural debt and prioritize improvements. Use before adding a major
  feature, refactoring core functionality, or extending a system — when the
  team needs to understand what architectural problems exist before adding
  more complexity. Output: ranked findings with concrete improvement proposals.
phase: brownfield
entry_criteria:
  - "The system exists in production or a near-production state"
  - "Sufficient codebase and operational context exists to assess it"
  - "Active principles have been selected (or will be selected during this review)"
exit_criteria:
  - "Each active principle is assessed as Compliant, At Risk, or Non-compliant"
  - "The highest-risk findings are ranked by impact"
  - "At least one concrete improvement is proposed for each Non-compliant finding"
principles:
  - structured-logging
  - alerting-strategy
  - health-checks
  - fault-isolation
  - graceful-degradation
time_box: "2-4 hours"
tags: [brownfield, architecture, audit, review]
---

# Brownfield Architecture Review

## How This Skill Works

This skill applies the principle library as a lens against an existing system to produce a prioritized list of architectural findings. The output is not a report card — it's a ranked action list that tells the team which structural problems are urgent, which are acceptable, and which will compound if left unaddressed while new work is added.

This is not a code quality review. The question is not "is this code well-written?" but "does this system's structure make it possible to build what we need to build safely and sustainably?" Those are different questions with different answers.

The agent drives the assessment by applying principles to what it can observe about the system. The human provides what the agent cannot see: the constraints that shaped past decisions, the business pressures that will shape new ones, and the team's capacity to address findings.

**Key concepts used in the Steps:**
- **Architectural debt** — structural decisions that now cost more to work with than they saved when made
- **Load-bearing component** — a component whose failure or refactoring would cascade broadly
- **Finding** — a specific observed gap between current structure and a principle, with an impact assessment
- **Improvement proposal** — a concrete, scoped action to address a finding

## Steps

1. **Select the principles to assess against.** If the project context doesn't already have active principles selected, run the `signal-driven-principles` skill first. The review is only as useful as the principles it's measured against. For a brownfield system, pay particular attention to: observability principles (the system exists; can you see what it's doing?), reliability principles (the system is in production; does it fail gracefully?), and any principles specific to the domain.

2. **Gather system artifacts.** Before assessing, read:
   - Architecture documentation (if any exists)
   - Deployment configuration and infrastructure definition
   - Monitoring and alerting configuration
   - Incident history (last 6 months if available)
   - Key service interfaces and data model schemas
   
   The artifacts reveal what the system actually is, not what the team thinks it is. Where artifacts contradict team beliefs, the artifacts are usually more accurate.

3. **Assess each active principle.** For each principle, determine its compliance status:
   - **Compliant** — the system meets the principle's "What Good Looks Like" criteria for this context
   - **At Risk** — the system partially meets the principle, but has gaps that create meaningful risk under expected conditions
   - **Non-compliant** — the system does not meet the principle's criteria and the gap is load-bearing
   
   For each non-Compliant finding, write one sentence describing the specific gap observed (not a generic statement about the principle).

4. **Rank findings by impact.** For each At Risk or Non-compliant finding, score the impact of the gap:
   - **High** — the gap affects the primary user path, could cause data loss, or creates significant on-call burden
   - **Medium** — the gap affects non-critical paths or creates risk only under specific conditions
   - **Low** — the gap is real but unlikely to materialize or has low consequence if it does
   
   Rank all findings by impact. The top 3 are the starting point for action items.

5. **Propose improvements for Non-compliant findings.** For each Non-compliant finding, write at least one concrete improvement:
   - Specific enough to be implemented (not "add logging" but "add structured log entries at the entry and exit of every external API call with duration, status code, and correlation ID")
   - Scoped to the minimum change that moves the finding from Non-compliant to At Risk or Compliant
   - Sized so the team knows what they're committing to

6. **Write the recommended sequence.** Improvements should be sequenced to pay down the highest-impact debt first and to avoid dependencies between improvements. If improvement A creates the foundation that improvement B requires, A must come before B.

7. **Checkpoint against the planned work.** For each finding, ask: does the planned feature or refactoring make this gap better, worse, or irrelevant? If planned work will make a Non-compliant finding worse, address the finding before starting the planned work.

## Checkpoints

**Is the assessment based on observation or assumption?**
"I think the system has health checks" is not a finding. "I looked at the deployment configuration and there are no readiness probes on any service" is a finding. Every finding should be traceable to an artifact, a log, an alert, or a direct observation. Assessments based on assumptions are unreliable and will lose credibility quickly.

**Are the improvement proposals proportionate to the risk?**
If every finding requires a major refactoring, the review has been calibrated too harshly. If every finding is addressed by a one-line change, it's been calibrated too leniently. The improvements should be proportionate: non-compliant high-impact findings require meaningful remediation; at-risk low-impact findings may need only documentation.

**Does the sequence make sense given the team's capacity?**
A review that produces 15 high-priority improvements and doesn't account for the team's sprint capacity produces a guilt list, not a plan. Pick the 3 improvements that have the highest leverage and fit in the available time. Schedule the rest.

## Principle Application

**structured-logging**
Step 2 (gather system artifacts) includes examining the logging configuration. For brownfield systems, the most common finding is that logging exists but is unstructured — present during development and useless during incidents.
Full reference: [principles/structured-logging.md](principles/structured-logging.md)

**alerting-strategy**
Existing alerting configuration is one of the most revealing artifacts in Step 2. How many alerts exist? Are they actionable? What's the false-positive rate?
Full reference: [principles/alerting-strategy.md](principles/alerting-strategy.md)

**health-checks**
Step 2 should include examining the health check configuration for all services. Missing or shallow health checks are one of the most common brownfield findings.
Full reference: [principles/health-checks.md](principles/health-checks.md)

**fault-isolation** and **graceful-degradation**
These principles are assessed together in Step 3 by asking: if the external dependencies listed in the architecture fail, how does the system behave? A system that hard-depends on every external service has high blast radius and fragile reliability characteristics.
Full reference: [principles/fault-isolation.md](principles/fault-isolation.md) · [principles/graceful-degradation.md](principles/graceful-degradation.md)

## Output Format

An `architecture-review-{{DATE}}.md` file:

```markdown
# Architecture Review: {{SYSTEM NAME}}

**Date:** YYYY-MM-DD
**Reviewer:** {{AGENT AND/OR TEAM}}
**Context:** {{WHY THIS REVIEW IS HAPPENING}}

## Findings

| Principle | Status | Gap | Impact |
|---|---|---|---|
| {{PRINCIPLE}} | Compliant / At Risk / Non-compliant | One sentence | High / Medium / Low |

## Top 3 Findings (Priority Order)

### 1. {{FINDING TITLE}} — {{PRINCIPLE}} (Non-compliant, High)
**Observed:** {{WHAT WAS FOUND}}
**Impact:** {{WHAT GOES WRONG IF NOT ADDRESSED}}
**Proposed improvement:** {{SPECIFIC CHANGE}}
**Effort estimate:** {{HOURS OR STORY POINTS}}

### 2. ...

### 3. ...

## Recommended Sequence
1. {{IMPROVEMENT}} — {{REASON IT COMES FIRST}}
2. ...

## Interaction with Planned Work
| Planned work | Finding affected | Direction | Recommendation |
|---|---|---|---|
| ... | ... | Makes it worse / better / irrelevant | Address before / after / during |
```
