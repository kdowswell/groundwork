<!-- source: principles/scalability/horizontal-scaling.md -->

# Horizontal Scaling and Stateless Services

## Principle
Scale by adding more identical instances of a service rather than by making one instance bigger. This requires that any single instance is disposable — no state lives in process memory or local disk that another instance could not also serve.

## When This Matters
- Traffic is variable or unpredictable, and you need to add or remove capacity without redeploying
- A single machine is already near its CPU, memory, or connection limits and the next size up is expensive or unavailable
- You want zero-downtime deploys — rolling out new instances and draining old ones requires interchangeability
- You operate in a cloud environment that prices per-instance and rewards elasticity over over-provisioning
- Resilience requires that any one instance can die without losing user data or in-flight work

## When This Doesn't Matter
- A single-tenant tool or internal admin app where one machine has comfortable headroom
- Workloads dominated by a single shared resource (a giant in-memory graph, a GPU model) where vertical scale is the only honest answer
- Early prototypes where load is too low for scaling decisions to be meaningful — premature horizontal design adds complexity for no benefit

## Questions the Agent Should Ask
- What state does this service hold in memory or on local disk between requests, and where could it live instead (database, cache, object store, client session)?
- If we kill any one instance mid-request, what does the user see — a retried request, a failed request, or corrupted data?
- Are sticky sessions required, and if so, why — can we eliminate the dependency that forces affinity?
- What is the bottleneck before this service scales horizontally — connection pool size, a downstream database, a shared lock, a singleton background job?
- How are background jobs, cron tasks, and scheduled work coordinated when multiple instances are running — leader election, distributed locks, or a queue with single-consumer guarantees?
- Is configuration injected at runtime (env vars, config service) so identical instances behave correctly, or baked into the image in ways that prevent reuse?
- Have you actually measured whether vertical scaling would be simpler and cheaper for this specific workload?

## What Good Looks Like
- Any instance can serve any request — no client-to-instance affinity required for correctness
- Session state lives in a shared store (Redis, database, signed client tokens), not in process memory
- File uploads and generated artifacts go to object storage, not local disk
- Background work is dispatched via a queue with consumer-group semantics, not run by every replica or pinned to instance #1
- Deploys roll instances incrementally with health-gated traffic shifting; capacity adds and removes are routine, not events
- Load tests demonstrate near-linear throughput gains as instance count increases, up to the next downstream bottleneck

## What Goes Wrong When You Skip This
- A traffic spike pegs the single beefy instance and the only path to recover is a multi-hour migration to a larger machine
- A deploy drops in-flight WebSocket connections or in-memory sessions because state was tied to the process that just terminated
- Background jobs run twice (or zero times) after the team adds a second replica, because the cron was assumed to be a singleton
- Adding instances does not improve throughput because every request contends on a shared mutable resource the team forgot about
- A "stateless" service quietly accumulates uploaded files on local disk; a node replacement during an autoscaling event silently loses customer data
