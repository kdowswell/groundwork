---
id: api-contract-first
title: API Contract-First Design
category: design
sources:
  - name: "Roy Fielding — Architectural Styles and the Design of Network-based Software Architectures, Chapter 5 (2000)"
    url: https://roy.gbiv.com/pubs/dissertation/rest_arch_style.htm
  - name: "Google Cloud API Design Guide"
    url: https://cloud.google.com/apis/design
  - name: "OpenAPI Specification 3.x"
    url: https://spec.openapis.org/oas/latest.html
  - name: "Stripe API Reference — versioning and backward compatibility"
    url: https://stripe.com/blog/api-versioning
  - name: "Anthropic — Writing effective tools for agents — with agents (Sep 2025)"
    url: "https://www.anthropic.com/engineering/writing-tools-for-agents"
  - name: "Birgitta Böckeler — Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl (martinfowler.com, Oct 2025)"
    url: "https://www.martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html"
  - name: "OWASP Top 10 for Agentic Applications for 2026 (ASI07 Insecure Inter-Agent Communication)"
    url: "https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/"
applies_when:
  scope: [new_build, epic, feature]
  scale: [solo, team, enterprise]
  stage: [discovery, refinement, build]
  domains: [any_production]
tags: [design, api-design, contracts, versioning, backward-compatibility, agent-tools, spec-driven-development]
---

# API Contract-First Design

## Principle
Define the API contract — the resource shape, the available operations, the error vocabulary, and the versioning policy — before writing any implementation. The contract is the source of truth; client and server code are derived from it, not the other way around. Code-first API design produces APIs that mirror internal implementation details: verbs that map to internal functions, fields that expose schema columns, errors that leak stack traces. Contract-first produces APIs shaped for callers — stable, evolvable, and independent of how the server is implemented.

## When This Matters
- A service or endpoint will be consumed by more than one caller, or by a caller outside the team's direct control (another team, a partner, a public consumer)
- The API surface will be stable for months or years and callers will depend on backward compatibility
- Multiple implementation teams (client and server, mobile and backend, two services) need to work in parallel before either is complete
- A brownfield service is being redesigned or replaced and the new API must coexist with the old during migration
- The team has experienced "API drift" — where the documentation and the implementation diverged and callers discovered the truth through failures
- The caller is a model: you are exposing tools to an AI agent, and the tool names, descriptions, parameters, return shapes, and errors are the only interface it has
- Agents exchange messages with other agents, so a message format is a contract between components that can be spoofed, misread, or changed under each other
- Specifications are written before agent-generated code, and the question is how they stay true after the code exists

## When This Doesn't Matter
- An internal function called in exactly one place by the same team — a public API contract adds ceremony without benefit
- A prototype or throwaway spike where the goal is to discover what the right interface should be; the contract emerges from exploration, not precedes it
- Event or stream schemas internal to a single service boundary

## Questions the Agent Should Ask
- Who are the callers of this API, and what does each caller need? Are their needs compatible, or does serving one force a compromise on the other?
- What resources does this API expose, and can each resource be named as a noun — an entity in the domain — rather than a verb naming a server-side action?
- What are the standard operations on each resource, and do they map to the standard verbs (create, read, update, delete, list) or do you need custom operations? If custom, can you model them as a sub-resource rather than a verb?
- What does the error response look like? Does it include a machine-readable code (not just an HTTP status), a human-readable message, and enough context for the caller to decide what to do next?
- What is the versioning strategy? What constitutes a breaking change, and what is the migration path when one is unavoidable?
- Have you documented what is NOT in scope for this API — the things callers will ask for that this contract deliberately omits?
- Is there an existing contract format (machine-readable schema) so that client code can be generated and validated against it automatically?
- If a model calls this interface: is it one consolidated, task-shaped tool or a thin wrapper over every endpoint? Are related tools namespaced so the model can tell them apart?
- Does each tool return only the information the model needs to take its next step, with pagination, filtering, or truncation by default, rather than a raw dump?
- When a model calls a tool wrongly, does the error say what was wrong and what to send instead, in words a model can act on?
- Are messages between agents authenticated and validated against a versioned schema, so a forged or outdated message is rejected rather than acted on?
- Is the spec for this change anchored to the code by something executable (contract tests, acceptance tests, schema validation), and is its size proportional to the change?

## What Good Looks Like
- The contract is written in a machine-readable format that both parties agree on before a line of implementation is written, and it is the canonical reference — not the implementation
- Resources are named as domain nouns (order, invoice, user, shipment) with standard operations; custom verbs are used sparingly and documented with their semantics
- Error responses carry a stable, machine-readable error code that callers can branch on, separate from the HTTP status code and the human-readable message
- Backward compatibility is a stated commitment: additive changes (new optional fields, new endpoints) are non-breaking; removals and type changes follow a deprecation period before removal
- The contract is versioned in source control alongside the implementation; a diff between versions makes breaking changes explicit
- Client teams can generate typed client code, mocks, or validation from the contract without reading the implementation source
- Tools for agents are designed for a model consumer: a small number of consolidated tools shaped around tasks, namespaced by service or resource, with unambiguous parameter names, strict input and output schemas, high-signal responses, and error messages that tell the model how to correct the call
- Tool definitions are versioned and evaluated like any other contract change: a renamed parameter or reworded description is tested against realistic multi-step tasks before release, because it changes model behavior
- Messages between agents carry an authenticated sender and a schema version; receivers validate both and reject what does not conform
- Specifications record intent and acceptance criteria, stay anchored to the code through executable checks, and scale with the change: a one-line fix does not get a multi-page spec. The code remains the artifact that is reviewed and maintained, not something regenerated from the spec on every change

## What Goes Wrong When You Skip This
- The API surface mirrors the server's internal data model — fields are named after database columns, operations named after internal functions — and callers inherit every refactor as a breaking change
- Two teams integrate against different mental models of the same API; the mismatch is discovered in a shared environment, not in development, and the fix requires coordinating a simultaneous deployment
- Error handling on the client consists of checking the HTTP status code; when the server starts returning 200 with an error body (or 500 with a partial success), client logic silently does the wrong thing
- A breaking change is shipped without warning because "breaking change" was never defined — one team's "cleanup" is another team's production outage
- The API documentation is written after the fact from reading the code, and is wrong in ways the author cannot detect because the author wrote the code
- A team wraps every internal endpoint as a separate agent tool; faced with forty similar tools returning full records, the model picks the wrong one, fills its context with unused fields, and retries blindly on an opaque error code
- An agent accepts a task message that claims to come from a coordinating agent; nothing authenticates the sender, and a forged message redirects the whole pipeline
- A detailed spec is written for a feature, the agent-generated code drifts from it within a week, nothing checks the two against each other, and the next change is planned from the wrong picture

## Further Reading
Fielding's dissertation Chapter 5 defines REST's architectural constraints — statelessness, uniform interface, layered system, cacheability — as a principled design for evolving distributed systems at web scale, not a naming convention for HTTP endpoints. Google's API Design Guide is the most thorough published standard for resource-oriented API design with concrete rules for naming, standard methods, errors, and versioning. Stripe's writing on API versioning documents how they maintain backward compatibility across years of API evolution with hundreds of thousands of callers. The internal data schema changes that can ripple out as API contract breaks are covered in *Schema Evolution and Compatibility* — particularly the expand-contract migration pattern and compatibility modes that CI can enforce automatically. Anthropic's "Writing effective tools for agents" describes tools as a contract between deterministic systems and non-deterministic agents, and recommends fewer, consolidated tools over wrappers for every endpoint, namespacing, returning only high-signal information, pagination and truncation defaults, actionable error messages, and inputs and outputs enforced with strict data models. The OWASP Top 10 for Agentic Applications lists insecure inter-agent communication (ASI07) as a top risk. Böckeler's review of spec-driven development tools distinguishes spec-first, spec-anchored, and spec-as-source approaches; she found generated spec documents verbose and tedious to review, workflows that did not scale down to small changes, and different code generated from the same spec, and warns that spec-as-source risks combining the inflexibility of model-driven development with the non-determinism of LLMs.
