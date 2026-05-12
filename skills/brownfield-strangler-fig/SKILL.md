---
name: brownfield-strangler-fig
title: "Strangler Fig"
description: >
  Incrementally replaces a legacy component by routing new traffic to the
  replacement while existing traffic continues through the original. Use when
  a component needs replacing but a big-bang rewrite is too risky, or when
  the team says "we need to get off this" but can't stop the system to do it.
phase: brownfield
entry_criteria:
  - "The component to be replaced is identified"
  - "The interface (API, event, message format) between the component and its callers is known"
  - "A replacement strategy exists (rewrite from scratch, migrate to new service, etc.)"
exit_criteria:
  - "A routing layer exists that directs traffic to old or new implementation"
  - "Migration milestones are defined with measurable completion criteria"
  - "Decommission criteria for the original component are written"
principles:
  - feature-flags
  - health-checks
  - circuit-breakers
  - bounded-contexts
  - separation-of-concerns
  - api-contract-first
  - idempotency-by-design
  - testing-strategy
  - conways-law-organizational-alignment
time_box: "2-4 hours (planning)"
tags: [brownfield, migration, legacy, refactoring]
---

# Strangler Fig

## How This Skill Works

This skill plans an incremental replacement of a legacy component by routing traffic through a facade that progressively shifts calls to the new implementation. At no point is the old system unavailable while the new one is unfinished — the two coexist until the migration is complete.

The pattern is named after the strangler fig tree, which grows around a host tree and eventually replaces it. The original stays alive and functional throughout; there is no moment where both are simultaneously unavailable.

The agent structures the migration phases and routing strategy. The human provides what the agent cannot know: the system's traffic patterns, deployment constraints, the acceptable pace of cutover, and which behaviors must reach parity before any traffic shifts.

**Key concepts used in the Steps:**
- **Facade** — the routing layer that intercepts calls to the legacy component and directs them to old or new
- **Traffic routing** — the mechanism for shifting call volume from legacy to replacement (percentage, feature flag, request type)
- **Parity verification** — confirming the new implementation handles a given behavior correctly before legacy traffic shifts
- **Completion criteria** — the conditions under which the legacy component can be decommissioned
- **Rollback trigger** — the signal that causes traffic to shift back to the legacy path

## Steps

1. **Draw the component boundary.** Identify every caller of the component being replaced and the interface each caller uses. Draw a box around the component and list what crosses its boundary in both directions. This is the surface area the routing layer must intercept.

2. **Design the routing layer.** The routing layer sits between callers and both implementations. It must be able to:
   - Route a given request to either the old or the new implementation
   - Operate without changing the interface callers use
   - Allow gradual traffic shifting (not just binary old/new)
   
   The routing layer can be a proxy, a facade, a feature flag check, or a dispatching abstraction depending on the component type (HTTP service, library, batch job, etc.).

3. **Identify the migration seams.** Not everything can be migrated at once. Find the natural seam points — places where traffic can be cleanly partitioned (by user, by feature, by request type, by data age). The migration proceeds seam by seam, not all at once.

4. **Write the migration milestones.** For each seam, define:
   - The measurable completion criterion (X% of traffic routed to new, or "all reads, no writes", or "new users only")
   - The verification method (how you know the new implementation is correct for this seam)
   - The rollback action if the seam fails (reroute back through routing layer)

5. **Define the parity tests.** Before shifting any traffic to the new implementation, write tests that verify the new implementation produces the same output as the old for the same input. Run both in shadow mode if the component is complex — the new implementation handles traffic, the old handles it too, and results are compared without either being canonical.

6. **Write the decommission criteria.** The original component can be decommissioned when:
   - 100% of traffic is routed to the new implementation
   - The parity tests have passed for X days with no divergence
   - No callers reference the old implementation directly (bypassing the routing layer)
   - Operational runbooks reference only the new implementation
   
   The routing layer itself can be removed after decommission — it's temporary scaffolding.

7. **Plan for the long transition.** Strangler figs take longer than expected. During the transition, both implementations must be maintained. Bug fixes may need to be ported to both. Plan for this explicitly: who is responsible for the old implementation during migration, and what is the policy for bug fixes vs. new features on the old system?

## Checkpoints

**Is the interface stable enough to be intercepted?**
If the component's interface is changing rapidly during the replacement, the routing layer will continuously need to be updated. Consider stabilizing the interface first (publishing a fixed contract) before starting the strangler fig. A moving target is harder to wrap.

**Is shadow mode actually feasible for this component?**
Shadow mode (running both implementations and comparing) requires that the component's behavior is deterministic and side-effect-free — or that side effects from the shadow can be suppressed. For components that write data, trigger workflows, or charge money, shadow mode requires careful isolation. Verify feasibility before relying on it for parity testing.

**Is the migration scope creeping?**
The strangler fig can become an excuse to rewrite adjacent components ("as long as we're replacing this, we should also replace..."). Resist this. The pattern works because it replaces one thing at a time. Each additional component added to the migration increases the risk and the timeline. File a new migration plan for adjacent components.

## Principle Application

**feature-flags**
Step 3 (migration seams) and Step 4 (milestones) benefit directly from feature flags. A feature flag is the routing layer for many component types — it controls which implementation a given request uses, and its lifecycle (create, ramp, remove) maps directly to the migration stages.
Full reference: [principles/feature-flags.md](principles/feature-flags.md)

**health-checks**
Both implementations must have health checks during the transition. If the new implementation starts failing, the routing layer must detect this and reroute to the old implementation automatically.
Full reference: [principles/health-checks.md](principles/health-checks.md)

**circuit-breakers**
The routing layer is a natural place to implement a circuit breaker on the new implementation. If the new implementation's error rate exceeds a threshold, the circuit breaker routes 100% of traffic back to the old implementation until the issue is resolved.
Full reference: [principles/circuit-breakers.md](principles/circuit-breakers.md)

**bounded-contexts**
Step 1 (drawing the component boundary) is where the strangler fig reveals whether the component being replaced corresponds to a clean bounded context or cuts across multiple domains. A component that owns entities from several domains is harder to replace because "replace this component" actually means "simultaneously re-draw multiple domain boundaries." If the component boundary in Step 1 doesn't correspond to a coherent domain, the migration plan must decide: replace the whole component at once (riskier but cleaner) or split the replacement into multiple bounded-context migrations. That decision belongs in Step 4 as an explicit milestone seam.
Full reference: [principles/bounded-contexts.md](principles/bounded-contexts.md)

**separation-of-concerns**
One of the implicit goals of a strangler fig migration is often to improve the separation of concerns that the legacy component violated. Step 1 (component boundary) should document not just what the component does today but what concerns it has mixed — business logic in the data layer, presentation logic in the service layer, configuration baked into business rules. The replacement's design should separate those concerns explicitly, and Step 4 (migration milestones) should sequence the migration to avoid importing the mixed-concern structure into the new implementation.
Full reference: [principles/separation-of-concerns.md](principles/separation-of-concerns.md)

**api-contract-first**
Step 2 (routing layer design) depends entirely on the stability of the interface the legacy component exposes to its callers. If that interface is undocumented or implicit, the routing layer cannot be built without first making the contract explicit. Before designing the routing layer, write down the interface the component exposes — the request/response shape, the error vocabulary, the versioning (if any). That contract is what the routing layer intercepts, and it must remain stable for callers throughout the migration. Any breaking change to the contract must be negotiated with callers as a separate migration from the implementation migration.
Full reference: [principles/api-contract-first.md](principles/api-contract-first.md)

**idempotency-by-design**
Step 5 (parity tests) must include idempotency verification for all state-mutating operations handled by the component being replaced. During the shadow mode phase, both implementations will receive the same requests — including requests that the original implementation handled idempotently. If the new implementation is not idempotent where the old one was, shadow mode will produce duplicate side effects (duplicate writes, duplicate charges, duplicate notifications). Verify idempotency parity before any traffic shifts, not as a post-migration cleanup item.
Full reference: [principles/idempotency-by-design.md](principles/idempotency-by-design.md)

**testing-strategy**
Step 5 (parity tests) is a testing strategy question. Apply the pyramid: unit-level parity tests (same output for same input, in-process) cover the bulk of behaviors quickly and cheaply. Integration-level parity tests (both implementations running against real dependencies) catch behaviors that unit parity misses. Shadow mode — running both implementations in parallel on live traffic and comparing outputs — is the equivalent of an E2E parity test: expensive, hard to maintain, and necessary only for behaviors that cannot be verified any other way. Define parity tests at the lowest feasible fidelity first and reserve shadow mode for the highest-risk behaviors. If a large portion of the component's behavior requires shadow mode to verify, that's a signal the component has insufficient unit-level observability — consider adding it before starting the migration.
Full reference: [principles/testing-strategy.md](principles/testing-strategy.md)

**conways-law-organizational-alignment**
Step 1 (component boundary) and Step 7 (long transition plan) are where organizational structure becomes load-bearing. The legacy component being replaced exists because some team built it — but by the time a strangler fig migration starts, it may be maintained by multiple teams, owned by none, or inherited by a team that didn't design it. Step 7's question — "who is responsible for the old implementation during migration?" — requires a named team, not "we all are." Unowned legacy components during a migration attract neglect; bugs go unresolved because each team assumes the other is handling it. If the migration is also an opportunity to clarify ownership of the replacement, make that explicit: who owns the new component after decommission? That team should own the routing layer, the parity tests, and the decommission criteria from the start.
Full reference: [principles/conways-law-organizational-alignment.md](principles/conways-law-organizational-alignment.md)

## Output Format

A `strangler-fig-{{COMPONENT-NAME}}.md` file:

```markdown
# Strangler Fig: {{COMPONENT NAME}}

**Date:** YYYY-MM-DD
**Component being replaced:** {{NAME}}
**Replacement:** {{NAME OR DESCRIPTION}}
**Estimated duration:** {{RANGE}}

## Component Boundary
Callers: ...
Interface: ...

## Routing Layer Design
Type: {{PROXY | FACADE | FEATURE FLAG | DISPATCHER}}
Implementation plan: ...

## Migration Seams
| Seam | Completion criterion | Verification | Rollback |
|---|---|---|---|
| ... | ... | ... | ... |

## Parity Tests
- [ ] {{TEST}}

## Decommission Criteria
- [ ] 100% traffic to new implementation
- [ ] Parity tests passing for {{N}} days
- [ ] No direct callers of old implementation
- [ ] Runbooks updated

## Long Transition Plan
Old implementation maintainer: {{WHO}}
Bug fix policy during migration: {{PORT TO BOTH | OLD ONLY | NEW ONLY}}
```
