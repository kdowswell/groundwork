<!-- generated from skills/brownfield-architecture-review/SKILL.md by scripts/sync-router-references.ts.
     Edit the source skill, then run: npm run sync:router -->

# Brownfield Architecture Review (`/groundwork review`)

**Phase:** Evolve (brownfield) · **Time box:** 2-4 hours

**Before you start:** load project context for this session if you have not already (see the
router's Steps); honor active principles throughout. Entry criteria below must hold — if one
does not, say which and route to the command that establishes it instead of proceeding.

**Entry criteria:**
- The system exists in production or a near-production state
- Sufficient codebase and operational context exists to assess it
- Active principles have been selected (or will be selected during this review)

**Exit criteria:**
- Each active principle is assessed as Compliant, At Risk, or Non-compliant
- The highest-risk findings are ranked by impact
- At least one concrete improvement is proposed for each Non-compliant finding

---

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

**separation-of-concerns**
Step 2 (gather system artifacts) and Step 3 (assess each active principle) together reveal whether the system's layers have stayed clean or have eroded over time. The most common brownfield finding is business logic that has migrated into the data layer (stored procedures, triggers, computed columns) or the delivery layer (thick controllers, middleware that enforces business rules), making the system hard to test and harder to change. Assess whether the team can explain in one sentence what each module is responsible for. If they can't — or the sentence contains "and" — that's an At Risk or Non-compliant finding.
Full reference: [principles/separation-of-concerns.md](principles/separation-of-concerns.md)

**bounded-contexts**
Step 2 should include reading the data model schemas and service interface definitions to assess whether domain boundaries are explicit and respected. The most common finding is a "god service" or "platform team's database" that has accumulated entities from multiple domains because it was convenient — not because it represents a coherent bounded context. Assess: do teams outside this service's domain write directly to its data store? Are there entities in the schema that no single team owns? Do the same terms mean different things in different parts of the codebase?
Full reference: [principles/bounded-contexts.md](principles/bounded-contexts.md)

**fallacies-of-distributed-computing**
Step 2 should include reviewing how the system handles network calls — timeouts, retry logic, circuit breakers, and error handling for each external dependency. The eight fallacies are a checklist: does the system assume network calls succeed? Does it have no timeout (assuming latency is negligible)? Does it assume the schema of an external API never changes? Does it trust that all internal calls come from trusted sources? For brownfield systems, these findings are often concentrated around the oldest integrations — the ones nobody has touched since launch.
Full reference: [principles/fallacies-of-distributed-computing.md](principles/fallacies-of-distributed-computing.md)

**idempotency-by-design**
Step 3 should assess the write paths: are the system's state-mutating operations safe to retry? This is frequently a Non-compliant finding in brownfield systems that were not designed with at-least-once delivery in mind. Look specifically at: API endpoints that create or modify records (do they accept or generate idempotency keys?), message handlers (do they check for prior processing of the same message ID?), and scheduled jobs (can they be triggered twice safely?). Silent failures from duplicate processing are among the hardest to detect post-hoc.
Full reference: [principles/idempotency-by-design.md](principles/idempotency-by-design.md)

**api-contract-first**
Step 2 should include reviewing the system's API surface: is there a machine-readable contract? Is it in sync with the implementation? Is there a versioning policy, and is it followed? The most common brownfield finding is an API that was designed code-first and reflects internal implementation details — field names that are database column names, operations named after internal functions, error responses that expose stack traces. Assess whether callers could generate a client from the contract alone, and whether breaking changes are made with or without a versioning protocol.
Full reference: [principles/api-contract-first.md](principles/api-contract-first.md)

**conways-law-organizational-alignment**
Step 2 (gather system artifacts) should include mapping team ownership alongside the technical artifacts: which team owns which service, and does that ownership map match what the architecture diagram implies? Step 3 (assess each active principle) should explicitly evaluate whether service boundaries align with team boundaries. The most common finding is a service that multiple teams contribute to on a regular cadence — which produces coupling in the code that mirrors the coupling in the org. A system that routinely requires cross-team coordination for routine feature delivery is non-compliant with this principle regardless of how clean the code looks internally. Proposed improvements in Step 5 should address both the technical structure and the ownership model; fixing the code without clarifying ownership recreates the problem.
Full reference: [principles/conways-law-organizational-alignment.md](principles/conways-law-organizational-alignment.md)

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
