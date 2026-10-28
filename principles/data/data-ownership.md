---
id: data-ownership
title: Data Ownership and Service Boundaries
category: data
sources:
  - name: "Pattern: Database per service (microservices.io, Chris Richardson)"
    url: "https://microservices.io/patterns/data/database-per-service.html"
  - name: "Data sovereignty per microservice — Microsoft .NET architecture guidance"
    url: "https://learn.microsoft.com/en-us/dotnet/architecture/microservices/architect-microservice-container-applications/data-sovereignty-per-microservice"
  - name: "Data Mesh Principles and Logical Architecture (Zhamak Dehghani, martinfowler.com)"
    url: "https://martinfowler.com/articles/data-mesh-principles.html"
  - name: "Designing Data-Intensive Applications (Martin Kleppmann)"
    url: "https://dataintensive.net/"
  - name: "Open Data Contract Standard (Bitol)"
    url: "https://bitol-io.github.io/open-data-contract-standard/"
tags: [data, architecture, microservices, ddd, contracts, ownership, data-contracts, data-products, data-platforms]
applies_when:
  scope: [new_build, epic, feature]
  scale: [team, enterprise]
  stage: [discovery, refinement, build]
  domains: [financial_services, healthcare, ecommerce, data_platforms, any_production]
---

# Data Ownership and Service Boundaries

## Principle
Each service owns its data exclusively — no other service reads or writes its tables, and no shared schema crosses a service boundary. Data is shared only through an explicit contract (an API, an event stream, a read model), and that contract is the only thing other services are allowed to depend on.

The same holds for analytical data. A dataset published for analytics, reporting, or ML is a data product with an owner, and its contract is a data contract: the schema, what each field means, the quality rules it meets, how fresh it is, and who to contact when it breaks. Written in a machine-readable form, a data contract can be checked on every load, so a producer finds out it has broken a consumer before the consumer does.

## When This Matters
- You are decomposing a monolith into services, or carving a new bounded context out of a shared database
- Multiple teams need to evolve their parts of the system on independent release schedules
- An "integration database" already exists where several services read and write the same tables, and changes there require coordination across teams
- Analytics, reporting, or ML pipelines query operational tables directly and break every time the schema changes
- A single shared schema has become the bottleneck for every product change because every alteration risks breaking unknown consumers

## When This Doesn't Matter
- A single-team monolith where one team owns the whole schema and there is no inter-team coordination cost to manage
- Early-stage products where the domain model is still being discovered and premature service boundaries would lock in the wrong cuts
- Read-only reporting use cases where a thin, well-known view layer over the operational database is genuinely cheaper than a contract

## Questions the Agent Should Ask
- Which service is the system of record for this data, and is that decision explicit or implied by who happened to write the migration first?
- Does any other service read these tables directly today — through ORM models, replicated schemas, BI tools, or shared libraries — and what is the plan to give them an API or event instead?
- When this service needs data owned by another service, is it calling an API, consuming an event, or reaching into the other service's database?
- What contract are you publishing for consumers — a synchronous API, a versioned event, a denormalized read model — and who is the audience for each?
- Where do cross-service joins live today, and which of them are unavoidable versus accidents of the original shared-database design?
- How will analytics, search, and reporting consume this data without coupling to internal storage — a CDC stream, an exported product, a read replica with a stable view?
- If two services need to update related data atomically, is that a sign the boundary is wrong, or do you need a saga or outbox to coordinate them?
- Who owns the data product that other teams depend on, and is there a named team responsible for its quality, schema, and SLAs?
- For a dataset published to analytics or ML consumers: is there a written data contract covering schema, field meanings, quality rules, and freshness, and is it checked automatically or only documented?

## What Good Looks Like
- One service writes to a given table; other services that need the data go through that service's API or subscribe to its events
- The published contract (OpenAPI spec, event schema, data product description) is versioned and treated as a first-class deliverable, separate from internal storage
- Internal schema changes do not require coordination with other teams — only contract changes do
- Analytics and downstream consumers receive data through an explicit pipeline (CDC, event stream, exported snapshot), not by querying production tables
- Cross-service consistency is handled with sagas, outbox patterns, or eventual consistency — not with database transactions across boundaries
- Each owned dataset has a named owning team accountable for schema decisions, deprecations, and data quality
- Analytical datasets shared across teams have a data contract in a machine-readable format, versioned with the producer's code, and validated on every load; changing it goes through the same review as an API change

## What Goes Wrong When You Skip This
- A schema change in one service silently breaks three other services that were reading the same table directly, and the breakage is found in production
- The "shared" database becomes the integration layer: every team is afraid to change it, releases require coordination across the org, and feature velocity collapses to the speed of the slowest team
- A reporting query lands on the operational primary, locks rows for minutes, and brings down a customer-facing service unrelated to reporting
- An incident requires rolling back a migration, but you cannot — three downstream services have already written code against the new column shape
- Data quality issues have no owner: every team blames upstream, no one fixes the source, and the same bad records keep being patched in five different places

## Further Reading
Richardson's *Database per Service* pattern is the operational form of this principle for microservice architectures, with concrete trade-offs around transactions and joins. Dehghani's *Data Mesh Principles* extends the same ownership idea to analytical data, treating each domain's data as a product with a named owner, a contract, and a consumer-facing SLA — useful when the operational/analytical split is itself the source of pain. The Open Data Contract Standard is a vendor-neutral format for writing that contract down so it can be validated; *Data Quality Gates at Pipeline Boundaries* covers enforcing it. The domain modeling side of this question — how to draw service boundaries based on business language, team ownership, and subdomain structure — is covered in *Bounded Contexts*. When schema changes inside an owned data store ripple out as contract changes to consumers, *Schema Evolution and Compatibility* describes the patterns for managing that transition safely.
