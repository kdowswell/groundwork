# ADR-020: `/groundwork threat`: one threat-model skill for new and running systems, with a toxic-flow pass for agents

**Date:** 2026-11-08
**Status:** Accepted

## Context

The Thoughtworks Radar (Vol. 35) puts *threat modeling* in Adopt, with humans leading and agents
assisting, and *toxic flow analysis for AI* in Trial: find the paths where private data, untrusted
content, and the ability to communicate externally combine. The principle library already held the
logic. `prompt-injection-containment` states the rule of two, and `zero-trust`, `least-privilege`,
`least-agency`, and `data-classification` supply the mitigations. No skill applied them as one
structured pass. Existing threat-model skills don't tie their mitigations to a cited principle
library.

## Decision

### Placement

One skill, `greenfield-threat-model`, routed as `threat`. It takes either input:

- **An approved architecture** (verified first, `rule:router-verify-handoff`), the usual case
  before code exists; or
- **A running system's observed components and flows**, citing where each was seen, when a feature
  (often an AI one) is added to something already live.

The output is the same either way. The `greenfield-` prefix records where it usually runs; the router
chooses by request, not by the repository's age (`rule:router-phase-from-request`), as it already does
for `spec` inside an old codebase. A second, brownfield copy would duplicate the method and drift.

### Method

1. **Size first.** Count the trust boundaries and decide whether this is a short or a full model,
   so an internal batch job stays short.
2. **Boundaries and flows**, each flow's data classified.
3. **STRIDE per boundary**, likelihood × impact on a fixed ranking rule, so "every threat has the
   same rank" is checkable.
4. **Toxic-flow pass** when the `ai_system` or `autonomous_agents` signal is present. Each agent
   session is marked for untrusted input, sensitive access, and outbound or state-changing ability,
   and is treated as a principal with its own identity and scoped permissions. A session with all
   three is a Critical threat. The mitigation must remove one of the three; an input filter or
   classifier never counts as the only mitigation.
5. **Mitigations** each cite a principle id and say whether the guardrail is deterministic or
   model-judged. A Critical or High threat guarded only by model judgment must be made deterministic,
   or the user accepts it explicitly with a reason.
6. **Candidate detector rules**: deterministic mitigations that could be checked by reading code
   become input for future detector rules (ADR-005).
7. One fresh-eyes review and one acceptance: residual risk is the user's call, recorded with
   `approve --checkpoint=greenfield-threat-model/accept`.

The review page recognizes `# Threat Model:` artifacts. Its tables render as written; dedicated
visuals (a boundary map, a toxic-flow matrix) are follow-up work.

## Consequences

- AI features get a structured check for the most damaging agent failure, the toxic combination,
  at design time, when removing one leg is cheapest.
- Mitigations name principles, so `review` and `check` can find the same gaps later.
- `architecture`'s agent lens (#36) records each session's untrusted / sensitive / outbound marks in
  the same terms, so the two documents line up.
