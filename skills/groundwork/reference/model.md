<!-- generated from skills/greenfield-data-model-first/SKILL.md by scripts/sync-router-references.ts.
     Edit the source skill, then run: npm run sync:router -->

# Data Model First (`/groundwork model`)

**Phase:** Define (greenfield) · **Time box:** 45-90 minutes

**Before you start:** load project context for this session if you have not already (see the
router's Steps); honor active principles throughout. Entry criteria below must hold — if one
does not, say which and route to the command that establishes it instead of proceeding.

**Entry criteria:**
- The primary data entity is named (from spec-from-idea)
- Data ownership is established
- Active principles are selected

**Exit criteria:**
- Core entities and their relationships are modeled
- Ownership of each entity is explicitly assigned
- Schema evolution strategy is chosen
- Access patterns are listed and the model is validated against them

---

## How This Skill Works

This skill produces a deliberate data model before implementation begins — not a perfect schema, but an explicit record of the decisions that become expensive to change once deployed: entity ownership, relationship cardinality, schema evolution strategy, and consistency requirements.

The data model is the most durable part of a system. Code can be rewritten in weeks; a deployed schema with live data can take months to migrate. The cost of schema decisions is paid forward for the lifetime of the system, which is why they are made deliberately here rather than discovered during the first feature.

The agent proposes a first-draft data model based on available context — the spec, existing system descriptions, or any artifacts provided — then the human corrects and refines it. Produce the draft first, ask second. A model with flagged uncertainties is immediately useful to review and correct; a list of questions about the model is not. The human provides what cannot be derived from context: the real-world relationships between entities, the business rules that constrain them, and the expected evolution of the model as the product matures.

**Key concepts used in the Steps:**
- **Entity** — a named thing the system stores, tracks, or transforms; the core unit of the data model
- **Ownership** — which service or team is the authoritative source for a given entity
- **Cardinality** — the numerical relationship between entities (one-to-one, one-to-many, many-to-many)
- **Schema evolution strategy** — how the model will change over time without breaking existing consumers
- **Consistency requirement** — whether related records must be updated atomically or can tolerate eventual consistency

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

**data-ownership**
Steps 1 and 3 are direct applications of this principle. Ask the ownership questions at Step 3 — any entity where ownership is unclear is a Blocking open question; do not proceed to implementation until it's resolved.
Full reference: [principles/data-ownership.md](principles/data-ownership.md)

**schema-evolution**
Step 5 is where this principle is operationalized. The schema evolution strategy must be chosen before the first external consumer exists — changing it after consumers exist is breaking-change territory.
Full reference: [principles/schema-evolution.md](principles/schema-evolution.md)

**consistency-models**
Step 6 applies this principle. If the project context signals offline-first or field deployment, strong consistency across all relationships is architecturally impossible — the model must be designed for eventual consistency from the start.
Full reference: [principles/consistency-models.md](principles/consistency-models.md)

**bounded-contexts**
Steps 1 and 3 together are where bounded context decisions crystallize. Listing entities forces the question of which entities belong to this model and which belong to a neighboring domain. Assigning ownership forces the question of where the boundary actually falls. A data model that contains entities owned by multiple distinct teams is not one model — it's several models that haven't been separated yet.

When an entity's ownership is contested between two teams, that's not a personnel question — it's a signal that the two teams are working within the same conceptual space and the bounded context hasn't been properly drawn. Surface this in Step 3 rather than splitting ownership or creating shared write access as a workaround.

What good looks like: every entity in the model has exactly one owner, and entities owned by other teams appear in the model only as identifiers (foreign keys to their bounded context) rather than as full embedded records.

Full reference: [principles/bounded-contexts.md](principles/bounded-contexts.md)

**conways-law-organizational-alignment**
Step 3 (assign ownership to each entity) operationalizes this principle at the data layer. "No entity should have two owners" is simultaneously a data architecture rule and an organizational alignment rule: an entity with two owners has two teams that must coordinate on every schema change, which means its schema change rate is bounded by the coordination cost between those teams. When ownership is contested in Step 3, that is not a data modeling problem — it is a signal that team boundaries and service boundaries haven't been drawn in the right place, and the data model is inheriting that misalignment. Surface contested ownership as a Blocking open question and resolve it through the organizational conversation before proceeding. The resolution is often splitting the entity into two distinct domain entities each owned by one team, rather than forcing shared write access.
Full reference: [principles/conways-law-organizational-alignment.md](principles/conways-law-organizational-alignment.md)

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
