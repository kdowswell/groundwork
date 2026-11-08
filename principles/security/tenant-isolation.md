---
id: tenant-isolation
title: Tenant Isolation
category: security
sources:
  - name: "AWS Well-Architected SaaS Lens — Silo, Pool, and Bridge Models"
    url: "https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html"
  - name: "AWS Well-Architected SaaS Lens — Tenant Isolation; Identity and Access Management (SaaS SEC 1)"
    url: "https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html"
  - name: "Azure Architecture Center — Tenancy Models for a Multitenant Solution"
    url: "https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models"
  - name: "Azure Architecture Center — Architectural Approaches for Storage and Data in Multitenant Solutions"
    url: "https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data"
  - name: "Azure Architecture Center — Noisy Neighbor Antipattern"
    url: "https://learn.microsoft.com/en-us/azure/architecture/antipatterns/noisy-neighbor/noisy-neighbor"
  - name: "Google Cloud — GKE Best Practices: Enterprise Multi-tenancy"
    url: "https://docs.cloud.google.com/kubernetes-engine/docs/best-practices/enterprise-multitenancy"
applies_when:
  scope: [new_build, epic, feature]
  scale: [team, enterprise]
  stage: [discovery, refinement, build, maintain]
  domains: [multi_tenant]
tags: [security, multi-tenancy, saas, isolation, noisy-neighbor, tenant-context, data-isolation]
---

# Tenant Isolation

## Principle
When one system serves many customers, guarantee that no tenant can see, change, or starve another tenant's resources. Choose an isolation model for each resource, not once for the whole system: dedicated per tenant (silo), shared by all tenants (pool), or a mix where some components are dedicated and others shared (bridge). Base each choice on the data's regulatory profile, its noisy-neighbor risk, and its cost. Bind tenant identity to the authenticated caller at the point of entry, and carry it through every layer, queue, and job, so each component knows whose request it is handling without asking another service. Enforce isolation with a mechanism below the application code wherever you can, so that a forgotten filter in one query does not become a breach. Isolate more than rows: per-tenant encryption keys where tenants require them, per-tenant quotas and rate limits, and per-tenant telemetry, so that one tenant's load is visible and bounded before it degrades everyone else.

## When This Matters
- The product serves several organizations or customer accounts from shared infrastructure, and each expects its data to be invisible to the others
- Some tenants have compliance, residency, own-key, or backup requirements that others do not
- Tenants differ widely in size or usage pattern, so one large tenant's batch job or heavy query can slow every other tenant
- Background jobs, queues, caches, search indexes, or exports touch data from many tenants in the same process
- You plan to offer a premium tier with dedicated resources, or expect to move a tenant between shared and dedicated deployments later
- Agents or other automated callers act on behalf of a tenant and can issue many requests quickly

## When This Doesn't Matter
- A single-customer system or internal tool with one organization's data, where "tenant" and "deployment" are the same thing
- Consumer products where each user's data is already separated by ordinary per-user authorization and there is no group or organization layer
- Every tenant already gets a fully separate deployment with its own identity, data store, and keys, and nothing is shared (you still need automation to run that fleet, but cross-tenant leakage is not a design concern inside it)

## Questions the Agent Should Ask
- What is a tenant in this product: a company, a team within one, a family, a single user? Can one customer need more than one tenant?
- For each resource (compute, data store, cache, queue, search index, object storage, model context), is it dedicated, shared, or mixed, and what requirement drove that choice?
- Where does tenant identity enter the system, and is it taken from the authenticated identity rather than from a request parameter the caller controls?
- How does tenant context reach background jobs, queued messages, scheduled tasks, and calls to other services?
- In a shared data store, what stops a query from returning another tenant's rows if a developer forgets the tenant filter? Is that guard in the data layer or only in application code?
- Which tenants need their own encryption keys, backup policy, or data location, and does the chosen data model allow it?
- What per-tenant limits exist (request rate, concurrency, storage, query cost), and what happens to a tenant that hits them?
- Can you see resource usage per tenant, and would you notice one tenant consuming most of a shared resource?
- Is there a test that tries to read or write another tenant's data and fails?

## What Good Looks Like
- A short table records the isolation model per resource and the reason for it; dedicated resources are chosen for specific data or noisy-neighbor reasons, not by default
- Tenant identity is a claim in the authenticated identity, set at sign-in and propagated with each request and message; no endpoint trusts a tenant identifier supplied in the request body
- Shared data stores enforce the tenant boundary below application code (row-level policies, tenant-scoped credentials, or a data access layer that cannot build an unscoped query), and the tenant identifier is part of every key and index
- Caches, search indexes, file paths, and exports are scoped by tenant, so a cache hit can never serve another tenant's value
- Tenants that require their own keys, residency, or restore policy are grouped or siloed accordingly, and restoring one tenant does not mean restoring everyone
- Each tenant has quotas and rate limits enforced at the edge and on expensive operations; telemetry and cost are attributable to a tenant, with alerts on unusual per-tenant usage
- Automated tests attempt cross-tenant reads and writes and fail the build if any succeeds; noisy-neighbor behavior is load-tested

## What Goes Wrong When You Skip This
- A reporting endpoint takes the tenant identifier from a query parameter; changing one digit in the URL shows another customer's invoices
- A new query added by an agent omits the tenant filter, nothing below the application catches it, and a support search returns rows from every tenant
- A shared cache keyed only by record identifier serves one tenant's settings to another after an identifier collision
- A background job loses tenant context when it is re-queued, runs under a default tenant, and writes data into the wrong account
- One tenant's bulk import saturates the shared database; every other tenant sees timeouts, and nobody can tell which tenant caused it because usage is not tracked per tenant
- A regulated customer requires its own encryption key, but all tenants share one table and one key, so meeting the requirement means a migration rather than a configuration change

## Further Reading
The AWS SaaS Lens defines the silo, pool, and bridge models, notes that a silo still shares onboarding, identity, and operations with other tenants, and suggests that each microservice can land in a different model depending on its data's regulatory profile and noisy-neighbor traits. Its tenant isolation section treats crossing a tenant boundary as a potentially unrecoverable event for the business, and its identity guidance describes binding tenant to user identity ("SaaS identity") so tenant context flows through every service without extra lookups. Azure's multitenant guide treats isolation as a spectrum chosen per tier, separates logical tenants from deployments, and advises testing that data does not leak and that noisy-neighbor effects are acceptable. Its storage and data guidance lists own-key, backup, and residency needs as reasons to isolate tenants, and warns that row-level security requires tenant identity to reach every query. The Noisy Neighbor antipattern covers per-tenant monitoring, quotas, throttling, limits on expensive operations, and rebalancing. Google's GKE enterprise multi-tenancy guide applies the same ideas at the platform layer: a namespace per tenant, network policies that deny cross-tenant traffic by default, per-tenant resource quotas, sandboxing for untrusted workloads, and per-tenant logs and cost allocation. *Least Privilege* and *Zero Trust* cover the identity foundations this builds on; *Data Partitioning* covers sharding tenants for scale.
