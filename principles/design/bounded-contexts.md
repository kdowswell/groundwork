---
id: bounded-contexts
title: Bounded Contexts
category: design
sources:
  - name: "Eric Evans — Domain-Driven Design: Tackling Complexity in the Heart of Software (2003)"
    url: https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215
  - name: "Eric Evans — DDD Reference (2015)"
    url: https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf
  - name: "Sam Newman — Building Microservices, 2nd Edition (2021)"
    url: https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/
applies_when:
  scope: [new_build, epic, feature]
  scale: [team, enterprise]
  stage: [ideation, discovery, refinement, build, maintain]
  domains: [any_production]
tags: [design, domain-driven-design, service-boundaries, modularity, ubiquitous-language]
---

# Bounded Contexts

## Principle
Every domain model is valid within an explicit boundary — the bounded context — and only within it. The same word can mean different things in different parts of a large system; "customer" in billing means something different than "customer" in fulfillment, and forcing them to share one model causes each team to compromise the model to satisfy the other. The bounded context makes that boundary explicit: one team, one codebase, one unambiguous vocabulary. Context maps document how the bounded contexts relate to each other and who owns the seam.

## When This Matters
- A system spans multiple business subdomains (billing, fulfillment, identity, support) and the same terms have different meanings across them
- Multiple teams own different parts of the system and share a single domain model that each team bends for its own needs
- Adding a field to a shared model requires coordinating with three other teams, even though only one team uses the field
- Deployments are coupled — you cannot release a change to billing without also releasing a change to fulfillment — because they share models at a code level
- A brownfield system is being decomposed and the question of "where does this responsibility live?" is genuinely contested

## When This Doesn't Matter
- A simple application with a single team and a single coherent domain — the overhead of explicit context boundaries adds complexity without benefit
- A read-only reporting or analytics layer that consumes from other systems; it has its own view model already
- A very early prototype where the domain is not yet understood enough to draw boundaries; drawing premature boundaries produces wrong boundaries that are harder to fix later than no boundaries

## Questions the Agent Should Ask
- What are the distinct business subdomains in this system? Can you describe each one's core responsibility in a sentence without referencing the others?
- When different teams use the word "order" (or "account," or "product"), do they mean the same thing? If not, which differences are accidental (should be reconciled) and which are essential (should be separated)?
- Who owns each domain model today? Is it one team or several? If several, how are conflicts resolved?
- Where does the model leak across team boundaries today — shared libraries, shared databases, shared DTOs passed from service to service?
- If you drew a boundary around each team's responsibilities, would the data that crosses that boundary be small and well-defined, or large and chatty?
- What is the translation layer between contexts? Is it explicit (an anti-corruption layer that translates one model to another) or implicit (copy-paste of fields that gradually diverge)?
- Which direction does influence flow — does one context's model dominate others (a "big ball of mud" shared kernel) or are boundaries genuinely respected?

## What Good Looks Like
- Each bounded context has a name, an owner, and a glossary of terms whose meanings are unambiguous within that context
- The model within a context is internally consistent; it can be evolved independently without asking another team's permission
- The seams between contexts are explicit: a published interface, a set of events, or an anti-corruption layer translates between models at the boundary
- A context map (even an informal one — a whiteboard diagram that the team maintains) shows how all bounded contexts relate: upstream/downstream, shared kernel, customer/supplier, conformist, or anti-corruption layer
- Integration between contexts happens via the interface, not the internals; one context cannot query the other's data store directly
- New features that require cross-context collaboration involve a conversation about the contract, not a code change in two repositories simultaneously

## What Goes Wrong When You Skip This
- A "global" domain model accumulates fields from every team's use case until it is understood by no one and changes require coordination across the whole organization
- Two teams evolve different meanings for the same term in the same model — "status" means something different in billing than in fulfillment — and merging those meanings produces bugs that appear only at the edges
- A schema change to serve one team's needs breaks the assumptions of three other teams who depend on the same table
- When a brownfield system is decomposed into services, the shared model is replicated into each service unchanged, bringing all the coupling with it — a distributed monolith rather than a decomposition
- Integration logic that should live in an explicit anti-corruption layer gets buried in business logic, making it impossible to swap the upstream system without rewriting the downstream service

## Further Reading
Evans' original *Domain-Driven Design* (2003) introduced bounded contexts as part of a broader strategic design vocabulary. The free DDD Reference distills the pattern definitions and context mapping relationships without the narrative. Sam Newman's *Building Microservices* applies bounded context thinking directly to the problem of where to draw service boundaries, and is the most practical guide for teams doing that work in production systems. For the data layer implication of bounded context decisions — specifically which service owns and stores which data, and how other services consume it — see *Data Ownership and Service Boundaries*. For how team communication structure shapes and constrains where boundaries can practically be drawn, see *Organizational Alignment and Conway's Law*.
