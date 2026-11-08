---
name: greenfield-analytical-data-model
disable-model-invocation: true
title: "Analytical Data Model"
description: >
  Designs an analytical data platform before pipelines are built: source
  ownership and contracts, an immutable raw layer with rebuildable derived
  layers, grain and keys per dataset, current versus as-of history per
  attribute, quality gates that block publishing, and a backfill strategy.
  For reporting, BI, and ML datasets, not an application's own data model.
  Invoke when a warehouse, lakehouse, or pipeline is about to be built and
  its layers, grain, and history rules have not been written down.
phase: greenfield
entry_criteria:
  - "The questions the published datasets must answer are named, ideally in an approved spec (if not, infer them from the request and label them assumptions)"
  - "The source systems are known (if not, list the likely sources and mark each for confirmation)"
  - "Active principles are selected (if not, apply the ones the request obviously touches and say so)"
exit_criteria:
  - "Every source has one named owner and a contract, or a stated reason it has none"
  - "Raw data lands append-only and every derived layer is a deterministic transformation of the layer below"
  - "Every dataset has a one-sentence grain and a key that enforces it"
  - "Every changeable attribute consumers group or filter by has a history policy, and valid time is separated from record time wherever reports must be reproduced"
  - "Every published dataset has blocking quality gates with an owner and a failure action"
  - "Re-runs replace whole partitions, and the replay window and late-data policy are stated"
principles:
  - rebuildable-derived-data
  - historical-data-modeling
  - data-quality-gates
  - data-ownership
  - schema-evolution
  - idempotency-by-design
time_box: "60-120 minutes"
tags: [data, data-platforms, analytics, pipelines, warehouse, greenfield, architecture]
---

# Analytical Data Model

## How This Skill Works

This skill produces the design of an analytical data platform before the first pipeline is written: an explicit record of the decisions that are cheapest now and most expensive once data has been published and consumed. Those are who owns each source, which layer is the record and which are rebuildable, what one row of each dataset means, which attributes keep history, what stops bad data from reaching a consumer, and how a past day is recomputed.

It is not the application's data model. An application model is shaped by the writes a service performs; an analytical model is shaped by the questions consumers ask of the past, and its hardest decisions are about time: what a number meant on the day it was first reported, and whether re-running last quarter gives last quarter's answer.

Propose a complete first draft from the spec, the source descriptions, and the consumer questions you have, then let the human correct it. Produce the draft first, ask second. The human supplies what context cannot: which reports must be reproducible, which source owners will commit to a contract, and which corrections the business treats as restatements.

**Key concepts used in the Steps:**
- **Raw layer** — source data as received, append-only, never edited; the only layer that is a record
- **Derived layer** — any dataset computed from the layer below by versioned, deterministic code; it can be dropped and rebuilt
- **Grain** — what exactly one row represents ("one row per order line per day"); the key enforces it
- **Valid time** — when a fact was true in the world; **record time** — when the platform learned it
- **History policy** — per attribute: overwrite, keep versions with effective dates, or keep the prior value (the SCD types are names for these)
- **Quality gate** — a declared, versioned check that runs before data becomes visible and stops publishing when it fails
- **Replay window** — how far back a re-run or late-data reprocessing reaches as routine, without a special project

## Steps

1. **Name the consumer questions and the sources.** **First, if a spec file is named or present in the project, run `npx @kdowswell/groundwork verify <spec path>` from the project root, and the same for an architecture sketch if one exists, and act on the first Checkpoint before writing anything else.** With no spec file, work from the request as given. Write the 3–8 questions the published datasets must answer, each as a sentence a consumer would ask ("revenue by sales territory at the time of sale, by month"). Then list every source system that feeds them: what it holds, how data leaves it (periodic extract, change feed, event stream, file drop), and whether it overwrites or deletes its own records.

2. **Assign an owner and a contract to each source.** For each source, name the one team or role that owns it and can fix it when it breaks. Write what the platform relies on at that boundary: schema, field meanings, keys, expected arrival time, and volume band. Where the owner agrees to it, that is a data contract; where they have not, label it "assumed, unconfirmed" and treat the source as untrusted in Step 6. A source with no owner who can fix it is a risk to record, not a detail.

3. **Lay out the layers.** Define the raw layer first: append-only, data kept as received including fields nobody uses yet, each batch stamped with its arrival time and origin, and nothing allowed to update or delete it except a logged retention or erasure step. Set its retention longer than the longest plausible gap between a bug being introduced and being noticed. Then define each derived layer as a function of the one below (cleaned and conformed, then consumption-ready, or whatever cut fits; the names are yours) and state, for each, the rule that makes it rebuildable: no hand edits, no reading the wall clock, external lookups pinned to a snapshot, and manual corrections kept in versioned reference data the transformation reads.

4. **Define grain and keys for every dataset.** For each dataset in the derived layers, write the grain as one sentence, the key that enforces it, and which datasets it is built from. Separate facts (events and measurements, at the finest grain consumers need) from dimensions (the things facts are grouped and filtered by). Give each dimension a stable business key from its source and, if it keeps versions, a surrogate key per version. Where a source has no reliable key, write how identity is decided (which fields, which deduplication rule); this is where double-counting starts.

5. **Decide history per attribute, and separate the two clocks.** For every dimension attribute a consumer groups, filters, or joins by, decide: when it changes, are old facts reported against the old value or the new one? Write the policy per attribute: overwrite, version with effective dates, or keep the prior value alongside the current one; name the SCD type only as shorthand for the choice. Mark which changes are corrections (the old value was wrong) and which are real changes (it was right at the time). Then ask, for each published dataset, whether anyone must reproduce a report exactly as first published. Wherever the answer is yes, record valid time and record time separately, so "as originally reported" and "as currently known" are both answerable. Fix the conventions once: inclusive or exclusive end dates, the sentinel for "current", time zone, and precision. State how facts attach to the right version (a surrogate key fixed at load, or an as-of join on event time), and how late or out-of-order changes split and close version ranges. Keep fast-changing attributes apart from slow ones so versioning one does not multiply the other.

6. **Place quality gates at each boundary.** For each boundary (source into raw, raw into each derived layer, derived out to consumers), list declarative checks: completeness, validity and key resolution, uniqueness at the stated grain, volume within a band, freshness against the expected arrival time, and distribution where a silent shift would mislead. For each check, write its failure action (halt publishing, quarantine rows and continue, or warn), the owner who is notified and can fix the cause, and why that action fits what the consumer can tolerate. Gates on published datasets run before the data becomes visible: write to a staging location, check, then publish, so a failure leaves consumers on the last good data.

7. **Design re-runs and backfills.** For each dataset, name the partition a run replaces in full (a day, an hour, a source batch) and confirm a second run of the same partition produces the same table, never an appended copy. Pass the run's date range in as a parameter. Choose event time or processing time for partitioning and say why. Write the late-data policy: re-process the last N partitions on every run, or a watermark with a stated lateness bound, and what happens to data later than that. Write the backfill procedure as a command someone could run today, including its expected cost in time and compute for the largest layer, and how a backfill interacts with versioned dimensions and with gates.

8. **Write the published contracts.** For each dataset consumers depend on, write the contract: owner, grain, schema with field meanings, history semantics (current or as-of, and which clock), quality rules from Step 6, freshness target, and the evolution rule. Default to additive changes; a removal, rename, or change of meaning or grain is a breaking change that ships as a new version alongside the old, with a stated overlap window. Record lineage from each published dataset back to its raw sources so a bad batch's reach is a lookup.

9. **Check the model against active principles.** For each active principle that touches data (rebuildable-derived-data, historical-data-modeling, data-quality-gates, data-ownership, schema-evolution, data-classification), verify the model complies and note tensions, such as an erasure duty that conflicts with immutable raw retention.

10. **Run a builder check before you ask the user anything.** It runs on the finished draft: write every earlier step in full first, and never open with questions. Do not defer it until open questions are resolved either. Its purpose is to gather every question into one round, asked at the end of the same response that delivers the complete analytical data model, so the user is asked once. Hand the analytical data model to a fresh reviewer: the analytical data model file only, not this conversation. Give them this brief: "You will build exactly this. List every question you would need answered before you could start, and every place where two competent builders would build different things. Quote the line each question comes from. Do not suggest improvements." Use an isolated subagent if the runtime offers one. Otherwise do a deliberate cold read yourself, treating anything not written in the analytical data model as unknown. Sort each question the reviewer returns into one of three groups:
   - **Answered by the analytical data model:** the reviewer missed it. Tighten the wording so the next reader won't.
   - **Your call:** the answer doesn't change what gets built, or one option is clearly right. Decide, write the answer into the analytical data model, and label it "Agent call:".
   - **For the user:** the answer changes what gets built.
   Bring the user only the last group, in one round. Ask all of them in that one message, however many there are; do not hold any back for a later turn. Record every question and its resolution in the analytical data model's Builder Check section. The section is never left out; if the cold read finds nothing, write "No open questions."

11. **Record the user's decision.** When the user answers the acceptance Checkpoint, run `npx @kdowswell/groundwork approve <analytical data model path> --checkpoint=greenfield-analytical-data-model/accept`, adding `--decision=changes-requested` if they asked for changes or `--decision=delegated` if they told you to decide. Record only an answer the user gave in this conversation. If they decided in the review page, it is already recorded: confirm with `npx @kdowswell/groundwork verify` instead of recording it again, and never submit the page yourself. With no one available to answer, record nothing and leave the artifact marked as a draft. If the CLI is unavailable, write the decision and date at the top of the artifact instead and say it is unverified.

## Checkpoints

**Is the spec you are building on approved and unchanged?**
Decided by step 1's verify. **Exit 0:** the spec is unchanged since the user accepted it (or delegated the choice), so build on it as written. **Non-zero (unapproved, changed since approval, or changes requested):** tell the user which, summarize what changed if you can tell, and re-ask the spec's acceptance Checkpoint before going further. Never record the approval yourself to get past it. **A spec file exists but the CLI is unavailable or fails to run:** this is not the no-file case. Say the approval could not be verified, ask the user to confirm the spec is final, and stop there: do not draft from it until they answer. A path error from the CLI means you ran it from the wrong directory; rerun it from the project root before concluding anything. **No spec file available** (none named, none in the project, even if the user mentions one elsewhere): work from the request as given. List the consumer questions and requirements you assumed under "Working Spec (unapproved)" in the output, and keep going; the acceptance Checkpoint at the end covers them with this artifact. Never end a turn just to ask whether a spec exists.

**Does the source keep its own complete, immutable history?**
**No (it overwrites or deletes records):** the raw layer is the only record of what the source said, so retention is set by the longest restatement anyone will ask for, and losing a batch is unrecoverable; gates on source arrival become hard failures. **Yes:** the raw copy can hold a shorter window, and a rebuild beyond it re-reads the source; write that dependency into the backfill procedure.

**Must any published report be reproducible exactly as first published?**
**Yes:** model valid time and record time separately for every dataset that report reads, and add "as originally reported" to its contract; corrections then add records instead of replacing values. **No:** valid-time history is enough, and corrections may restate the past; write that in the contract so a consumer is never surprised when last quarter's number moves.

**Can a quality gate failure halt publishing for this dataset?**
**Yes:** gate it before publish, and consumers see the last good data with a freshness alert. **No (a consumer needs some data on time even when part of it is bad, such as an hourly operational feed):** quarantine failing rows, publish the rest flagged as partial, and name who reconciles the quarantine. The choice changes what the contract promises.

**Did the builder check surface questions that change what gets built?**
**Yes:** put them to the user before the acceptance Checkpoint, and fold each answer into the analytical data model. Acceptance cannot be asked while any of them is open, because the user would be approving a model that two builders would read differently. **No:** go straight to acceptance, and list the "Agent call:" decisions you made so the user can overturn any of them when they answer.

**Does the user accept this analytical data model as the basis for building the pipelines?**
Ask once the model is complete. If it is long or still has open questions for the user, offer once to show it as a review page (`npx @kdowswell/groundwork render <analytical data model path> --serve`), where the user can read it beside its open questions and findings and decide there. **Accepted:** record the approval; pipeline work may start from it, and any later edit makes the approval stale, so the next step re-asks. **Changes requested:** record that, revise, and ask again; nothing downstream starts from this version. **Delegated ("you decide"):** record it as delegated, state the calls you made in your next reply, and proceed. The agent never answers this Checkpoint on the user's behalf.

## Red Flags

Observable signs this playbook is being skipped or gamed. Check your own work against them before you ask for approval; each one you find is something to fix, not to explain away.

- A dataset in the Datasets table has no grain sentence, or its key would allow two rows for one grain.
- A derived dataset is described as patched, corrected by hand, or loaded by appending without a partition it replaces.
- The History section names an SCD type with no per-attribute policy, or mentions "as of" without saying which clock.
- A quality gate has no failure action or no owner, or every gate is a warning.
- The backfill procedure reads "re-run the pipeline" with no partition, date range, or replay window.
- A source is marked as owned by "the data team" when the data team does not run the source system.

## Principle Application

**rebuildable-derived-data**
Steps 3 and 7 carry this principle. At design time it reduces to one test you apply to every dataset: if its code had a bug for the last three months, could the fix be a code change and a re-run over the affected range? A raw layer that is edited, a derived table with hand corrections, or a transformation that reads today's exchange rate each fails that test, and fixing any of them after consumers depend on the numbers means restating history nobody can verify. The layer names are irrelevant; a medallion layout passes only if each layer rebuilds from the one below.
Full reference: [principles/rebuildable-derived-data.md](principles/rebuildable-derived-data.md)

**historical-data-modeling**
Step 5 applies it per attribute, not per table, because the answer differs within one dimension: a customer's region may need versions while their email only needs the current value. The decision most often missed at greenfield is the second clock. Valid time answers "what was true then"; record time answers "what did we know then". Finance, regulated, and audited reporting usually needs both, and it cannot be added later for data already overwritten. The SCD type is the implementation shorthand written after the decision, never instead of it.
Full reference: [principles/historical-data-modeling.md](principles/historical-data-modeling.md)

**data-quality-gates**
Step 6 places gates where data crosses a boundary, with the failure action chosen per check from what the consumer can tolerate. In a new platform the expensive omission is freshness and volume: a missing load looks like a quiet day unless a check knows when data is due and how much is normal. Gating before publish is a layout decision (stage, check, then publish) that is cheap to build in now and hard to retrofit once consumers read the tables directly.
Full reference: [principles/data-quality-gates.md](principles/data-quality-gates.md)

**data-ownership**
Steps 2 and 8 apply it at both ends of the platform. Each source has one owner who can fix it, and the contract at that boundary says what the platform relies on; each published dataset is a data product with its own owner and contract. A platform that reads a source's internal tables with no contract inherits every schema change as an outage, and a published dataset with no owner becomes the place every team patches by hand.
Full reference: [principles/data-ownership.md](principles/data-ownership.md)

**schema-evolution**
Step 8 sets the evolution rule before the first consumer exists, when it is still free. For analytical data the breaking changes go beyond renames: changing a dataset's grain, a metric's definition, or a field from current to as-of semantics breaks every consumer silently while every query still runs. Treat those as new versions published alongside the old for a stated overlap window. On the source side, the raw layer keeps fields as received, so a source's additive change never breaks ingestion.
Full reference: [principles/schema-evolution.md](principles/schema-evolution.md)

**idempotency-by-design**
Step 7 makes every load safe to run more than once, because schedulers retry, operators re-run days, and backfills replay history over the platform's lifetime. The design choice is a partition that each run overwrites in full, or a merge on the stable key from Step 4, with the date range passed in. An appending load is correct only on its first run, and its failure shows up as a doubled total on a dashboard.
Full reference: [principles/idempotency-by-design.md](principles/idempotency-by-design.md)

## Output Format

An `analytical-data-model.md` file (or equivalent) with:

```markdown
# Analytical Data Model: {{NAME}}

## Consumer Questions
1. {{A question a consumer asks, with the grouping and time it needs}}

## Sources and Ownership
| Source | Owner | Extraction | Keeps own history? | Contract (confirmed / assumed) |
|---|---|---|---|---|
| ... | Team / role | Change feed / periodic extract / file drop | Yes / No (overwrites) | Schema, keys, arrival time, volume band |

## Layers
| Layer | Holds | Rebuildable from | Rules |
|---|---|---|---|
| Raw | Source data as received | Source (append-only record) | No updates; retention: {{WINDOW}}; erasure: {{LOGGED STEP}} |
| ... | ... | {{LAYER BELOW}} | No hand edits; run date as parameter; lookups pinned |

## Datasets
| Dataset | Layer | Fact / Dimension | Grain (one row per...) | Key | Built from |
|---|---|---|---|---|---|
| ... | ... | ... | One sentence | Business key / surrogate key | ... |

## History
Conventions: end date {{INCLUSIVE | EXCLUSIVE}}, current sentinel {{VALUE}}, time zone {{TZ}}, precision {{UNIT}}

| Dimension | Attribute | Policy (overwrite / version / prior value) | Change or correction | Clocks (valid / valid + record) | Fact attachment |
|---|---|---|---|---|---|
| ... | ... | Version (SCD 2) | Real change | Valid + record | Surrogate key at load / as-of join |

Late and out-of-order changes: ...

## Quality Gates
| Boundary | Dataset | Check | Failure action | Owner notified | Why this action |
|---|---|---|---|---|---|
| Source → raw | ... | Freshness: arrives by {{TIME}} | Halt publish | ... | ... |

## Backfill and Re-runs
| Dataset | Partition replaced per run | Partition time (event / processing) | Late-data policy | Replay window |
|---|---|---|---|---|
| ... | One day | Event | Re-process last {{N}} partitions | {{WINDOW}} |

Backfill procedure: {{COMMAND OR STEPS}}; expected cost for the largest layer: ...

## Published Contracts
| Dataset | Owner | Grain | History semantics | Quality rules | Freshness | Evolution rule |
|---|---|---|---|---|---|---|
| ... | ... | ... | As-of, valid + record | Gates above | Daily by {{TIME}} | Additive; breaking = new version, {{OVERLAP}} overlap |

Lineage: {{HOW LINEAGE FROM EACH PUBLISHED DATASET TO RAW IS RECORDED}}

## Principle Compliance Notes
- {{PRINCIPLE}}: ...

## Builder Check
| Question (from a cold read) | Resolution |
|---|---|
| ... | Answered in model (wording tightened) / Agent call: ... / User: ... |
```

**Next step:** End your reply (not the artifact) with one recommended next command and why, worked out from what exists now (the router's Next steps table), never a list. Usually: start building the raw layer and its gates once the spec and this model are approved; `adr` for a history or replay-window decision that was close, such as adopting record time or a short raw retention; `spike` when a full rebuild's cost or a source's change feed is unproven; `architecture` when no architecture exists yet and the platform's compute and storage boundaries are undecided.
