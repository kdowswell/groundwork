---
name: data-model-first
title: "Data Model First"
description: >
  Design the core data model before writing implementation code so that schema
  decisions, ownership, and evolution constraints are made deliberately rather
  than discovered during refactoring. Invoke when implementation is about to
  start and no one has explicitly designed the data model, or when the model
  was sketched informally and never validated.
phase: greenfield
entry_criteria:
  - "The primary data entity is named (from spec-from-idea)"
  - "Data ownership is established"
  - "Active principles are selected"
exit_criteria:
  - "Core entities and their relationships are modeled"
  - "Ownership of each entity is explicitly assigned"
  - "Schema evolution strategy is chosen"
  - "Access patterns are listed and the model is validated against them"
principles:
  - data-ownership
  - schema-evolution
  - consistency-models
time_box: "45-90 minutes"
tags: [data, schema, greenfield, architecture]
---

# Data Model First

## When to Use This Skill

Use this skill when implementation is about to begin and the data model hasn't been deliberately designed. The goal is not to produce a perfect schema — it's to surface the decisions that, once baked into a deployed data store, become expensive to change: entity ownership, relationship cardinality, schema evolution strategy, and consistency requirements.

What goes wrong when you skip it: the schema emerges from the first feature built. It encodes the assumptions of that feature, not the system's actual data relationships. Adding the second feature requires working around those assumptions. By the third feature, the team is carrying a schema debt that would take a week to pay down — and they never do.

## Steps

1. **List the core entities.** Start from the primary data entity in the spec. Expand outward: what other things does the system need to know about? Write each entity as a noun with a one-sentence definition. Aim for 3–7 core entities. If you have more than 10, you are either modeling the whole domain (too broad) or modeling implementation details (too narrow).

2. **Draw relationships.** For each pair of related entities, write the cardinality: one-to-one, one-to-many, many-to-many. Where the relationship is many-to-many, name the join concept explicitly — it is almost always a first-class entity that carries meaning of its own.

3. **Assign ownership to each entity.** For each entity, name the service, team, or role that is the authoritative source of truth. No entity should have two owners. If two teams both feel they own an entity, that's an organizational boundary problem that will become a system boundary problem — surface it now.

4. **List the primary access patterns.** For each entity, write the 2–4 most common ways the system reads it: by which field, in what order, with what filters. This is how you validate the model against the queries it must serve. If an access pattern requires scanning the whole table, it's a design signal — not necessarily wrong, but worth a decision.

5. **Choose a schema evolution strategy.** Pick one approach and document why:
   - **Additive only** — new fields only; never remove or rename; consumers ignore unknown fields
   - **Versioned schemas** — explicit schema versions; consumers negotiate which version they speak
   - **Migration-managed** — explicit migration scripts; each change is coordinated and deployed
   
   The right choice depends on whether external consumers exist, how often schema changes are expected, and the team's operational capability.

6. **Flag consistency requirements.** For each relationship that crosses a service or storage boundary, decide: does this need to be strongly consistent (two-phase commit, distributed transaction) or eventually consistent (event-driven, reconciliation)? Write the choice and the reasoning. "We'll figure it out" becomes "everything is broken" during an incident.

7. **Check the model against active principles.** For each principle in the active set that touches data (data-ownership, consistency-models, schema-evolution, data-classification), verify the model is compliant. Note any tensions.

## Checkpoints

**Does any entity have no clear owner?**
An ownerless entity is an orphan — it will be modified by whoever is most convenient at the time, which means it will eventually be inconsistent. If ownership is genuinely shared, that's an architectural smell: either the entity should be split, or one owner should be chosen with explicit read/write rules for others.

**Does any access pattern require data the model doesn't naturally surface?**
If a common read requires joining 4+ tables or scanning a large table with no index, the model isn't shaped for its workload. This is the moment to restructure — not six months into production when the query takes 30 seconds. Consider denormalization, a read model, or a projection.

**Is the schema evolution strategy compatible with the deployment model?**
Migration-managed evolution requires coordinated deploys and rollback capability. If the team can't reliably coordinate deployments, migration-managed schemas will break in production. The strategy must match the team's operational maturity, not just the theoretical best practice.

## Principle Application

**data-ownership** (`principles/data/data-ownership.md`)
Steps 1 and 3 are direct applications of this principle. The "Questions the Agent Should Ask" section identifies ownership ambiguities that surface as architectural problems later. Any entity where ownership is unclear at Step 3 is a Blocking open question — do not proceed to implementation until it's resolved.

**schema-evolution** (`principles/data/schema-evolution.md`)
Step 5 is where this principle is operationalized. The key insight from the principle: the schema evolution strategy must be chosen *before* the first external consumer exists, because changing the strategy after consumers exist is breaking change territory. The "When This Matters" section is most load-bearing for Step 5.

**consistency-models** (`principles/data/consistency-models.md`)
Step 6 applies this principle. If the project context signals offline-first or field deployment, strong consistency across all relationships is architecturally impossible — the model must be designed for eventual consistency from the start. The "What Good Looks Like" section describes how to design for convergence rather than fighting it.

## Output Format

A `data-model.md` file (or equivalent) with:

```markdown
# Data Model: {{SYSTEM NAME}}

## Entities
| Entity | Definition | Owner |
|---|---|---|
| ... | One sentence | Team / service / role |

## Relationships
| Entity A | Relationship | Entity B | Notes |
|---|---|---|---|
| ... | one-to-many | ... | ... |

## Access Patterns
| Entity | Pattern | Fields | Notes |
|---|---|---|---|
| ... | read by user_id | user_id (indexed) | High-frequency |

## Schema Evolution Strategy
Choice: {{ADDITIVE ONLY | VERSIONED | MIGRATION-MANAGED}}
Reason: ...

## Consistency Requirements
| Boundary | Requirement | Reason |
|---|---|---|
| {{Service A}} → {{Service B}} | Eventual | Offline-first; reconcile on reconnect |

## Principle Compliance Notes
- {{PRINCIPLE}}: ...
```
