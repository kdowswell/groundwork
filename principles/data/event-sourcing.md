---
id: event-sourcing
title: Event Sourcing
category: data
sources:
  - name: "Event Sourcing (Martin Fowler)"
    url: "https://martinfowler.com/eaaDev/EventSourcing.html"
  - name: "Event Sourcing pattern — Azure Architecture Center"
    url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing"
  - name: "CQRS (Martin Fowler)"
    url: "https://martinfowler.com/bliki/CQRS.html"
  - name: "Designing Data-Intensive Applications, Chapter 11 (Martin Kleppmann)"
    url: "https://dataintensive.net/"
tags: [data, event-sourcing, cqrs, audit, immutability, architecture]
applies_when:
  scope: [new_build, epic]
  scale: [team, enterprise]
  stage: [discovery, refinement]
  domains: [financial_services, healthcare, government, any_production]
---

# Event Sourcing

## Principle
Store every change to the system's state as an immutable event in an append-only log; the current state is a projection derived from replaying those events. The log is the system of record — tables, caches, and read models are all derived views that can be rebuilt from it.

## When This Matters
- The domain is naturally event-driven and auditors, regulators, or users routinely ask "how did we end up in this state?"
- You need a complete, ordered history of every change for compliance (financial transactions, medical records, legal events) — not just an audit log bolted onto CRUD
- The same underlying events drive multiple read models with different shapes (search index, analytics rollup, real-time dashboard, customer-facing screen)
- Temporal queries matter — "what did this account look like on March 15th" must be answerable without snapshot tables and ad-hoc reconstruction
- New consumers need to be added later that should see the full history, not just the state from the moment they came online

## When This Doesn't Matter
- The domain is genuinely CRUD — current state is what matters, history is incidental, and an audit trail column would satisfy any future need
- The team has never run an event-sourced system before and the domain isn't pushing them toward one — the complexity will outweigh the benefits
- Strong consistency between writes and reads is required everywhere and the team is not prepared to design around the eventual consistency that comes with projections
- Migration cost from a working CRUD system is high and the new capability you would buy with event sourcing is speculative

## Questions the Agent Should Ask
- What is the business event vocabulary — can you list the events in domain language ("OrderPlaced," "PaymentCaptured," "InventoryReserved") without leaking implementation detail?
- Who needs the history, and what would they ask of it — auditors, support agents, ML pipelines, the product itself for "undo" or replay?
- Are events facts about something that already happened (past tense, immutable) or are they being used as commands or messages? Conflating these is the most common modeling mistake.
- How will current state be derived — replay from the start every time, or replay from periodic snapshots — and what is the rebuild time for the largest aggregate today and at projected scale?
- What is the schema-evolution plan when an event shape needs to change five years from now and the old events still exist in the log? (Upcasting, weak schemas, versioned event types?)
- Will reads be served from the event log directly or from projections (CQRS)? If projections, what is the acceptable lag, and how is consumer divergence detected?
- What is the consistency boundary — which decisions can use stale projections, and which must read from the write side?
- How will the team handle the case where an event was wrong — compensating events, never deletion, and how is "wrong" actually recognized in the log?
- Does the team have operational experience running an append-only log at the volume this system will produce, or is this their first?

## What Good Looks Like
- Events are named in past tense and described in domain terms; no "UpdateUser" generic events disguising what actually happened
- The event schema is versioned and the system can read every prior version — old events are never rewritten
- Projections are independently rebuildable from the log, and rebuild is exercised regularly, not theoretical
- A clear consistency story exists: which reads tolerate projection lag, which must hit the write side, and what users see during catch-up
- Snapshots exist where replay times would otherwise become operationally painful, and snapshot strategy is documented
- The log itself has retention, backup, and disaster-recovery treatment proportional to its role as the single source of truth
- The team can answer "what would happen if we replayed the log into a fresh database tomorrow" with confidence, not hope

## What Goes Wrong When You Skip This
- The audit log is a separate table that drifts from the truth — every state-changing code path has to remember to write to both, and some don't
- A regulator asks for the state of an account on a specific date and the team spends weeks reconstructing it from backups and developer memory
- Event sourcing is adopted because it sounded modern, but events are modeled as CRUD verbs ("UserUpdated" with a full snapshot inside) — the system has all the complexity and none of the benefits
- A breaking schema change makes old events un-replayable; the rebuild capability that justified the architecture is now broken and nobody noticed
- Projections drift from the log over time; nobody rebuilds because rebuilds are slow and untested, and divergence is discovered when a customer reports a mismatch

## Further Reading
Fowler's original write-up frames event sourcing as a way to get reliable history, replay, and parallel models for free; pair it with his *CQRS* note, which is where most of the real-world pain (and benefit) actually shows up. Kleppmann's chapter on stream processing in *Designing Data-Intensive Applications* covers how event logs underpin both this pattern and broader event-driven architectures, and is the best treatment of the trade-offs at scale.
