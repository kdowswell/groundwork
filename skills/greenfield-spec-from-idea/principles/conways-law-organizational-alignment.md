<!-- source: principles/design/conways-law-organizational-alignment.md -->

# Organizational Alignment and Conway's Law

## Principle
Any organization that designs a system will produce a design whose structure mirrors its communication structure. This is not a failure mode to avoid — it is a constraint to design with. The Inverse Conway Maneuver applies this insight deliberately: decide the architecture you want first, then organize teams to match it. Teams that must coordinate to ship a feature will produce coupled systems; teams with clear ownership and minimal cross-team coordination will produce decoupled ones.

A microservices decomposition built by a team organized into frontend, backend, and database layers produces a distributed monolith — three services where every feature requires a synchronized deployment across all three, with none of the delivery autonomy microservices were adopted to achieve. The coupling is organizational, not technical.

## When This Matters
- A new system is being architected before team structure has been decided — this is the moment to align them deliberately
- An existing system has tight coupling that mirrors cross-team dependencies: the coupling is an organizational symptom, and refactoring the code without changing team ownership will recreate it
- A reorg is planned and its effects on the software architecture have not been analyzed
- Service or API boundaries require constant negotiation between teams, slowing feature delivery — that coordination cost is a signal that boundaries are in the wrong place
- A platform team has been created but its boundaries are not well-defined, and product teams find themselves blocked on the platform team for routine work

## When This Doesn't Matter
- A single-team product where organizational communication structure does not produce meaningful coupling between components
- A greenfield project early enough that team structure has not stabilized — it will naturally adapt to whatever boundaries the architecture requires
- Short-lived projects where organizational inertia is not yet established

## Questions the Agent Should Ask
- Does the proposed service decomposition match the team ownership structure, or will every feature require changes across teams?
- Which services are owned by which teams, and is each ownership boundary unambiguous — one team per service, one clear owner per decision?
- When a feature requires changes to three services, is that because the feature genuinely spans three domains, or because the boundaries were drawn in the wrong place?
- Are there recurring coordination meetings that exist primarily to synchronize teams that share a service, a schema, or an API? What would have to be true of the architecture to eliminate them?
- When a team is blocked waiting on another team, is that a dependency that should be eliminated by redesigning the architecture, or a genuine inter-domain contract that needs a cleaner, more stable interface?
- Has the team structure changed recently? Was the architecture updated to match, or is the organization now misaligned with the system it inherited?

## What Good Looks Like
- Each service or module is owned by exactly one team; no service has two teams committing to it as a regular cadence
- A team can release its service without requiring a coordinated deployment with another team's service
- The architectural diagram and the team ownership map have the same shape — this is evidence of intentional alignment, not coincidence
- When team structure changes, there is a deliberate conversation about what must change in the architecture and ownership model to stay aligned
- Platform teams own clear interfaces; product teams consume them without needing to understand their internals or wait on the platform team for routine changes
- "Who owns this?" has a one-sentence answer for every component in the system
- Every module has a human owner who can explain how it works and why, even when most of its code was generated; code nobody can explain is treated as debt regardless of its test status

## What Goes Wrong When You Skip This
- A microservices architecture is built by a team organized by technical layer (frontend, API, database); the result is three tightly coupled services where every feature requires a simultaneous release of all three — none of the autonomy, all of the distributed-systems complexity
- Two teams share a service that neither fully owns; changes require negotiation, the codebase develops factions, and one team's test changes break the other's releases
- A reorg moves engineers between teams but does not move service ownership; new teams inherit systems built under different constraints, producing confusion about who can authorize a change and who is accountable for an incident
- The most skilled engineers become coordinators — their value is navigating cross-team dependencies, not building — because the architecture makes every feature a negotiation
- A module written mostly by coding agents has a nominal owning team but nobody who understands it; an incident in it is debugged from scratch, under pressure, by people reading it for the first time
