---
name: signal-driven-principles
title: "Signal-Driven Principle Selection"
description: >
  Scan project context for signals and select the load-bearing principles this
  project actually needs. Invoke when a project is beginning and the team needs
  to establish which architectural principles apply — before writing specs,
  plans, or code.
phase: greenfield
entry_criteria:
  - "A project context exists (PRD, README, onboarding answers, or conversation)"
  - "The principles library is accessible"
exit_criteria:
  - "A prioritized list of active principles is documented with one-line rationale for each"
  - "Principles that do NOT apply are explicitly excluded with brief reasoning"
time_box: "20-45 minutes"
tags: [principles, architecture, greenfield, setup]
---

# Signal-Driven Principle Selection

## When to Use This Skill

Use this skill at the very start of a project — before the spec is written, before architecture is chosen. Its job is to narrow the full principle library down to the handful that actually govern this project. Without it, agents either ignore principles entirely (no grounding) or cite every principle indiscriminately (no signal).

What goes wrong when you skip it: the team starts building with implicit assumptions that contradict each other. The data model ignores ownership. The deployment assumes the connectivity the field workers won't have. The compliance requirements emerge six months in as a rewrite.

## Steps

1. **Read the project context.** Consume all available artifacts: PRD, README, existing CLAUDE.md, onboarding answers, or the conversation transcript. Extract every fact you can about scale, team, stage, domain, compliance, and operating context. If no context exists, run `context/discovery-questions.md` first.

2. **Score each signal.** For each signal in the table below, mark it as PRESENT, ABSENT, or UNKNOWN based on what you read:

   | Signal | Fires when... | Mandatory principles |
   |---|---|---|
   | `solo_or_prototype` | ≤1 developer or explicitly "prototype / throwaway" | Suppress enterprise-only principles |
   | `small_team_no_sre` | 2–5 engineers, no dedicated SRE or on-call rotation | `structured-logging`, `alerting-strategy` |
   | `large_scale` | >100K DAU or >100 RPS stated | All `scalability/` + all `observability/` |
   | `compliance_posture` | Any named compliance regime (SOC 2, HIPAA, PCI, FedRAMP, GDPR) | `secrets-management`, `data-classification` |
   | `audit_regulated` | HIPAA, FedRAMP, or PCI explicitly named | `data-ownership` |
   | `offline_first` | Field deployment, mobile with intermittent connectivity, or "works offline" stated | `consistency-models` |
   | `field_users` | Workers using product during physical tasks (field, factory, clinic, vehicle) | `field-first` |
   | `per_customer_integrations` | Product integrates with each customer's external systems | `fault-isolation` |
   | `async_processing` | Background jobs, queues, event pipelines, or "eventual consistency" mentioned | `async-processing` |
   | `greenfield_ideation` | Stage is ideation or discovery with no working system yet | `data-ownership`, `field-first` (if applicable) |

3. **Pull mandatory principles.** For each PRESENT signal, add the listed principles to the active set. These are non-negotiable — do not drop them based on count caps or team preference.

4. **Score remaining principles by applies_when.** For principles not yet in the active set, scan their `applies_when` frontmatter. Add any whose scope, scale, stage, and domain all match the project context.

5. **Suppress contradicted principles.** If `solo_or_prototype` is PRESENT, remove principles whose `applies_when.scale` contains only `enterprise`. Document the suppression explicitly.

6. **Rank the active set.** Order by load-bearingness: principles that constrain the most downstream decisions come first. Signal-mandatory principles always rank highest.

7. **Write the output.** Populate the `Active Principles` section of `context/project-context.template.md` (or an equivalent artifact) with each selected principle id and a one-sentence rationale.

## Checkpoints

**Is the project context complete enough to score the signals?**
If more than three signals are UNKNOWN after reading all available artifacts, run the discovery interview (`context/discovery-questions.md`) before proceeding. Guessing on UNKNOWN signals produces wrong selections.

**Does the mandatory set feel surprising or overloaded?**
If the mandatory principles list is longer than 8 and the project is a prototype, surface this to the developer. The likely explanation is that the scope was stated too broadly — the signals may be firing on aspirational features, not the actual v1. Ask: "Which of these signals reflects v1 specifically, not the eventual product?"

**Are any principles in tension?**
Some principle pairs create real architectural tension (e.g., `consistency-models` with strict latency SLOs, or `data-classification` with rapid prototyping). If you find a pair like this, flag it explicitly rather than silently picking one. The developer needs to make a conscious tradeoff, not inherit an invisible one.

## Principle Application

This skill applies principles indirectly — its output activates them for everything that follows. There are no principles referenced in the frontmatter because this skill governs which principles to use, not how to use them.

The signal table in Step 2 is the operationalized form of the `applies_when` frontmatter across the entire library. If a new principle is added to the library and it has new applies_when conditions, update the signal table here to match.

## Output Format

A populated `Active Principles` section (in `context/project-context.template.md` or equivalent):

```markdown
## Active Principles

- structured-logging — Small team, no SRE; without structured logs the team is blind during incidents
- alerting-strategy — Small team, no SRE; alerts must be actionable or on-call fatigue will silence them
- data-ownership — Greenfield ideation stage; ownership must be established before the data model solidifies
- field-first — Field technicians using product on tablets in low-connectivity environments
- consistency-models — Offline-first requirement; captures must survive connectivity gaps without data loss

Suppressed:
- chaos-engineering — Solo prototype; premature for current team size and stage
```
