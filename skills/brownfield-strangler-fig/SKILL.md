---
name: brownfield-strangler-fig
title: "Strangler Fig"
description: >
  Incrementally replace a legacy component by routing new traffic to the
  replacement while existing traffic continues through the original. Invoke
  when a component needs to be replaced but a big-bang rewrite is too risky
  to attempt.
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
time_box: "2-4 hours (planning)"
tags: [brownfield, migration, legacy, refactoring]
---

# Strangler Fig

## When to Use This Skill

Use this skill when a component needs to be replaced and the risk of a big-bang rewrite is unacceptable. The strangler fig pattern replaces a system incrementally by intercepting calls to the old component, routing some to the new one, and gradually shifting 100% of traffic to the replacement.

The pattern is named after the strangler fig tree, which grows around a host tree and eventually replaces it. The original stays alive and functional until the replacement is complete; there is no moment where both are dead simultaneously.

What goes wrong when you skip it and attempt a big-bang rewrite: the rewrite takes 3x longer than estimated, the old system gets emergency patches during the rewrite that must be ported, and the cutover date keeps slipping. Eventually either the old system is shipped with the new system still unfinished, or the rewrite is abandoned and the old system lives forever.

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
Step 3 (migration seams) and Step 4 (milestones) benefit directly from feature flags. A feature flag IS the routing layer for many component types — it controls which implementation a given request uses. The flag lifecycle described in this principle (create, ramp, remove) maps directly to the migration stages. The "What Good Looks Like" section describes the expected lifespan.

**health-checks**
Both implementations must have health checks during the transition. If the new implementation starts failing, the routing layer must be able to detect this and reroute to the old implementation. The "Questions the Agent Should Ask" section from this principle drives the health check design for both implementations.

**circuit-breakers**
The routing layer is a natural place to implement a circuit breaker on the new implementation. If the new implementation's error rate exceeds a threshold, the circuit breaker routes 100% of traffic back to the old implementation until the issue is resolved. The "What Good Looks Like" section defines the circuit breaker state machine.

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
