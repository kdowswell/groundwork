<!-- source: principles/data/schema-evolution.md -->

# Schema Evolution and Compatibility

## Principle
A schema change is a contract change with consumers you may not control or be able to deploy in lockstep. Design every change so producers and consumers on different versions can coexist — favor additive, optional fields with defaults, and treat breaking changes as a migration project, not a single commit.

## When This Matters
- Multiple services or clients consume the same data shape (API response, event payload, database table, log record) and cannot all be deployed atomically
- Mobile apps, third-party integrations, or partner systems read your data and you cannot force them to upgrade
- Events or messages live in a queue or log for hours, days, or years — old payloads will be read by new consumers and vice versa
- Database migrations on large tables must be online, with old and new code paths both writing and reading during the rollout window
- Stored data has a long lifespan and old records will outlive the original code that wrote them

## When This Doesn't Matter
- A single deployable unit where producers and consumers ship together every time and there is no over-the-wire contract to honor
- Throwaway internal jobs whose output is consumed within the same job and never persisted
- A greenfield contract still in active design with no production consumers — change shape freely until something depends on it

## Questions the Agent Should Ask
- Who reads this data, and can every reader be upgraded before the writer changes — or do old readers need to keep working against the new shape?
- Is the change additive (new optional field), modifying (rename, type change), or destructive (removed field, changed semantics) — and does the consumer audience tolerate that class of change?
- For events that live in a log or queue: how far back can old payloads still be replayed, and does the new consumer code handle every shape it will encounter?
- Is the format self-describing (JSON, Avro with schema, Protobuf descriptors) or position-based — and what compatibility guarantees does that format actually give you?
- Where will the new shape's defaults come from when reading old records — declared in the schema, computed from other fields, or null-and-handled-downstream?
- For database changes: is this an expand-then-contract migration (add new column, dual-write, backfill, switch reads, drop old) or a single coordinated change?
- How will compatibility be verified before merge — schema registry checks, contract tests, generated client compilation, all three?
- What is the deprecation path when a field really must go — how long do producers and consumers have, and how is usage measured to know when it's safe?
- For renamed or restructured fields: is this actually backward-compatible if you keep the old field as an alias, or are you fooling yourself?

## What Good Looks Like
- New fields are added as optional with explicit defaults; old consumers ignore them and old producers continue to work
- Removals and renames go through a documented expand-contract sequence — both shapes coexist long enough for every consumer to migrate
- A schema registry, OpenAPI diff, or generated-code build step catches incompatible changes in CI before the change ships
- Events carry an explicit version (or use a self-describing format with resolution rules) so consumers can route or upcast on encounter
- Contract tests run between producers and known consumers; a producer cannot ship a change that breaks a registered consumer without explicitly accepting the break
- Database migrations are reviewed for online-safety: no blocking locks on hot tables, no NOT NULL adds without backfill, no destructive changes coupled with code deploys
- Field deprecations are tracked with usage telemetry, not deleted on a hopeful schedule

## What Goes Wrong When You Skip This
- A field is renamed in the producer; downstream consumers silently start receiving null and the bug surfaces a week later as missing analytics rows
- A required field is added to an event type, every old message in the queue becomes un-parseable, and a backlog of failed messages piles up before anyone notices
- A column is dropped from a table during a deploy, an old replica still serving reads dies, and the team learns the rollback path is blocked because the new code already wrote data the old schema can't represent
- A mobile app from two versions ago crashes on a new API response shape; users can't upgrade because they can't open the app
- Old events in a Kafka topic become unreadable after a schema change, and a "replay from beginning" capability that justified the architecture quietly stops working
