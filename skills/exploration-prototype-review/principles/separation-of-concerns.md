<!-- source: principles/design/separation-of-concerns.md -->

# Separation of Concerns

## Principle
A system is easier to build, test, and change when each part is responsible for exactly one concern and knows as little as possible about the others. A concern is any cohesive body of logic or responsibility: persisting data, enforcing business rules, rendering output, communicating over a network, handling authorization. When two concerns share the same module, a change to one forces a change to the other — and those forced changes are where bugs hide and where velocity dies.

## When This Matters
- A new system is being designed from scratch and module boundaries have not yet been drawn
- An existing system has frequent cross-concern changes: a UI change requires a database schema change, or a business rule change breaks a network protocol
- Tests are hard to write because setting up one behavior requires instantiating large portions of unrelated code
- The team cannot assign ownership of a module to one person or squad without ambiguity
- Onboarding developers need to understand the whole system to change any one part of it
- Coding agents make many of the changes: an agent reproduces the structure it finds, so clear boundaries are a precondition for its changes landing in the right place, and blurred ones spread
- The system embeds a model: the model, the harness that drives it, and the environment where its actions run are separate concerns that change at different rates

## When This Doesn't Matter
- A single-purpose script or automation with a short expected lifespan and no dependents
- Proof-of-concept work where speed of exploration matters more than structure and the output will be discarded
- A module that is genuinely simple enough that further decomposition produces indirection overhead without clarity

## Questions the Agent Should Ask
- What are the distinct responsibilities in this system? Can you name them in a sentence each without using "and"?
- For each proposed module: if this concern changes, what else must change? If the answer is "everything," the separation is not working.
- Where does business logic live today — in the data layer, the presentation layer, or a layer of its own? Is that intentional?
- Are there modules that are changed frequently by different people for different reasons? That is a smell of mixed concerns.
- Can you test the business logic without spinning up the data store or the network? If not, the concerns are tangled.
- When something breaks in production, how many layers of the system do engineers touch in a single fix? More than two layers usually means a boundary has been crossed that should be a seam.
- Has the team named these concerns explicitly, or are they implicit conventions that new developers have to infer?
- Is the allowed direction of dependencies between layers or modules written down, and is it enforced by a test that fails when an import crosses it the wrong way?
- In a model-backed system, could the model, the orchestration harness, or the execution environment be replaced without rewriting the other two? What is the narrow interface between them?

## What Good Looks Like
- Module and directory names correspond to named concerns (authorization, persistence, domain logic, delivery), and each name is understood the same way by the whole team
- Business logic modules have no knowledge of how data is stored or how results are delivered — they receive typed inputs and return typed outputs
- A change to the data store (swapping one provider for another, changing a schema) requires changes in exactly one layer, not scattered across the system
- Unit tests for business logic run in milliseconds because they require no external infrastructure — all dependencies are interfaces substituted in tests
- New developers can predict which directory to open when given a description of a bug, without guidance
- When a module changes, the diff is coherent: it touches one concern, not five
- The dependency direction between layers is declared and checked by structural tests in the pipeline, so a violation, whether written by a person or an agent, fails before review (see *Executable Architecture Guardrails*)
- In model-backed systems, the model, the harness, and the sandbox where actions execute sit behind stable, narrow interfaces (for example, a single "run this tool with this input, return a result" call), so each can be upgraded or replaced without disturbing the others

## What Goes Wrong When You Skip This
- A bug in the business logic requires understanding the database schema to diagnose, and a schema change requires understanding the rendering logic to safely deploy
- The test suite requires a running database to test a simple calculation, making tests slow, flaky, and rarely run
- Authorization logic is scattered across layers — some in the API handler, some in the service layer, some in SQL queries — so a new privilege escalation path is added without triggering the right review
- Teams that own "features" (vertical slices) cannot deploy independently because their code is entangled with another team's horizontal concern
- Technical debt accumulates in the seams: shared utilities that grew organically across concerns become the most-changed and most-feared files in the codebase
- An agent adds a data-store query to a request handler because a nearby handler already does; with no enforced dependency rule, each such change becomes precedent for the next, and the layering erodes at the speed of generation
- Harness logic, model-specific workarounds, and tool execution are tangled in one process; a model upgrade makes a workaround unnecessary, but removing it means touching code that also runs tools and holds credentials
