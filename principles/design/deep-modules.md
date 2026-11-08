---
id: deep-modules
title: Deep Modules and Information Hiding
category: design
sources:
  - name: "David L. Parnas — On the Criteria To Be Used in Decomposing Systems into Modules (Communications of the ACM 15(12), 1972)"
    url: "https://dl.acm.org/doi/10.1145/361598.361623"
  - name: "John Ousterhout — A Philosophy of Software Design, 2nd Edition (2021)"
    url: "https://web.stanford.edu/~ouster/cgi-bin/book.php"
applies_when:
  scope: [new_build, epic, feature]
  scale: [solo, team, enterprise]
  stage: [refinement, build, maintain]
  domains: [any_production]
tags: [design, modularity, information-hiding, interfaces, abstraction, complexity, ai-assisted-development]
---

# Deep Modules and Information Hiding

## Principle
Draw module boundaries around design decisions that are likely to change, and hide each decision inside one module so the rest of the system never depends on it. A storage format, a protocol, a retry policy, or a vendor's API shape belongs behind an interface that does not mention it. Prefer deep modules: a small, simple interface over a large amount of useful behavior. A module whose interface is nearly as complicated as its implementation is shallow; it adds a name and a call to learn while hiding almost nothing, and many shallow modules add up to more complexity than one deep one. Do not decompose by the order of processing steps; decompose by what each module knows that the others should not. Treat the interface as the module's test surface and its contract, so the implementation can be rewritten without touching callers. Small interfaces also keep the context a coding agent must load small: to use a deep module, it reads the interface, not the implementation.

## When This Matters
- A part of the system is expected to change: a data format, an external provider, a pricing rule, a model or prompt, a storage technology
- The same knowledge (a file layout, a field encoding, a vendor's error codes) appears in several places, so one change edits many files
- Coding agents make changes and need to know which files a change touches and which they can ignore
- A codebase has many thin classes, wrappers, or pass-through layers, and following one request means opening a dozen files
- Tests break whenever internals change, because they exercise private structure rather than the module's interface

## When This Doesn't Matter
- Short scripts and throwaway prototypes that nobody will change or extend
- Code where the interface is the whole point, such as a thin adapter that exists to translate one interface into another at a boundary
- Very early exploration where you do not yet know which decisions will change; wait for the second or third variation before freezing an interface around a guess

## Questions the Agent Should Ask
- What design decision does this module hide? If the answer is "none, it just calls the next layer," does the module earn its place?
- If this decision changed (a new format, a different provider), how many modules would have to change? Is the answer one?
- Can a caller use this module correctly from its interface alone, or must they know how it works inside?
- Does the interface expose internal details (storage identifiers, vendor error types, ordering assumptions) that callers will start to depend on?
- Is this split following processing steps (read, then parse, then store), so that a shared format leaks into every step?
- Would merging these two modules produce a simpler interface than the two have together?
- Do the tests exercise the interface, so the implementation can be rewritten without rewriting them?
- How much of the codebase must an agent read to make a typical change here, and could a deeper boundary reduce that?

## What Good Looks Like
- Each module can be described by the decision it hides ("knows the on-disk format", "knows the payment provider's API"), and that decision appears nowhere else
- Interfaces are small and general enough to cover common uses without special-case parameters; the common case needs no configuration
- Errors, defaults, and edge cases are handled inside the module where possible, rather than pushed to every caller
- Swapping a provider or format is a change to one module plus its tests; callers and their tests do not change
- Tests target public interfaces and survive internal refactoring
- An agent asked to change a behavior can find the one module that owns it from names and interfaces, and can leave the rest of the codebase unread

## What Goes Wrong When You Skip This
- A record's layout is known by the reader, the validator, the writer, and the report; adding one field becomes a change across four modules, and the agent making it misses the fifth
- The codebase is split into many small classes, each a thin wrapper around the next; every feature touches six files, and an agent has to load all of them to change one rule
- A vendor's response type leaks through the service interface into the domain layer; switching vendors becomes a rewrite instead of a new adapter
- An interface exposes a configuration object with twenty options; every caller sets them differently, and a bug fix inside the module breaks callers that relied on one combination
- Tests mock internal collaborators, so a harmless refactor fails dozens of tests and the team stops refactoring

## Further Reading
Parnas's 1972 paper compares two decompositions of the same small program, one that follows the steps of processing and one that hides each design decision likely to change inside a single module, and shows that the second makes changes local and lets modules be built and understood independently. It is the origin of the idea now called information hiding, and its central criterion is still the right first question for any boundary. Ousterhout's *A Philosophy of Software Design* builds on it: it measures a module by comparing the cost of its interface to the functionality it hides, names shallow modules and the habit of splitting code into many tiny classes as sources of complexity, describes information leakage when one decision is reflected in several modules, and argues for somewhat general-purpose interfaces that make modules deeper. *Separation of Concerns* covers dividing responsibilities between layers; *Bounded Contexts* covers boundaries at the domain level. *Agent-Legible Codebase* covers making boundaries discoverable; deep modules are what make a discovered boundary cheap to work behind.
