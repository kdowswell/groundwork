<!-- source: principles/design/api-contract-first.md -->

# API Contract-First Design

## Principle
Define the API contract — the resource shape, the available operations, the error vocabulary, and the versioning policy — before writing any implementation. The contract is the source of truth; client and server code are derived from it, not the other way around. Code-first API design produces APIs that mirror internal implementation details: verbs that map to internal functions, fields that expose schema columns, errors that leak stack traces. Contract-first produces APIs shaped for callers — stable, evolvable, and independent of how the server is implemented.

## When This Matters
- A service or endpoint will be consumed by more than one caller, or by a caller outside the team's direct control (another team, a partner, a public consumer)
- The API surface will be stable for months or years and callers will depend on backward compatibility
- Multiple implementation teams (client and server, mobile and backend, two services) need to work in parallel before either is complete
- A brownfield service is being redesigned or replaced and the new API must coexist with the old during migration
- The team has experienced "API drift" — where the documentation and the implementation diverged and callers discovered the truth through failures

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

## What Good Looks Like
- The contract is written in a machine-readable format that both parties agree on before a line of implementation is written, and it is the canonical reference — not the implementation
- Resources are named as domain nouns (order, invoice, user, shipment) with standard operations; custom verbs are used sparingly and documented with their semantics
- Error responses carry a stable, machine-readable error code that callers can branch on, separate from the HTTP status code and the human-readable message
- Backward compatibility is a stated commitment: additive changes (new optional fields, new endpoints) are non-breaking; removals and type changes follow a deprecation period before removal
- The contract is versioned in source control alongside the implementation; a diff between versions makes breaking changes explicit
- Client teams can generate typed client code, mocks, or validation from the contract without reading the implementation source

## What Goes Wrong When You Skip This
- The API surface mirrors the server's internal data model — fields are named after database columns, operations named after internal functions — and callers inherit every refactor as a breaking change
- Two teams integrate against different mental models of the same API; the mismatch is discovered in a shared environment, not in development, and the fix requires coordinating a simultaneous deployment
- Error handling on the client consists of checking the HTTP status code; when the server starts returning 200 with an error body (or 500 with a partial success), client logic silently does the wrong thing
- A breaking change is shipped without warning because "breaking change" was never defined — one team's "cleanup" is another team's production outage
- The API documentation is written after the fact from reading the code, and is wrong in ways the author cannot detect because the author wrote the code
