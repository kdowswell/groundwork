<!-- source: principles/delivery/blue-green-canary.md -->

# Progressive Deployment Strategies

## Principle
Choose a deployment strategy — blue-green, canary, or rolling — based on how quickly you must roll back, how much risk a bad release carries, and how much extra capacity you can afford to run. The goal is not zero-downtime as a vanity metric; it is a deploy you can reverse before users notice it broke.

A change to a model, prompt, or agent harness is a deploy too, and it fails by giving worse answers rather than by throwing errors. Gate it on the eval suite before any traffic sees it, judge the canary on output quality as well as error rate and latency, and roll back automatically when quality drops below the threshold. Long-running agent sessions are a stateful workload: a session may be mid-task when the new version ships, so run old and new versions side by side and let in-flight sessions finish on the version they started on.

## When This Matters
- The service is user-facing and a failed deploy directly affects revenue, safety, or trust
- Schema or stateful changes accompany the deploy and naive replacement risks data corruption or incompatible versions handling the same request
- You operate at a scale where exposing 100% of traffic to a new build is materially riskier than exposing 1%
- Rollback time is part of an SLO, an incident response objective, or a regulatory commitment
- Multiple versions will run side by side for any period — you need to reason about API and message compatibility across them
- The change is a new model, prompt, or agent configuration, where a bad release shows up as worse answers rather than errors
- Agent sessions run for minutes or hours and would be broken by a version switch mid-task

## When This Doesn't Matter
- Internal tools, batch jobs, or background workers where a few minutes of downtime during deploy is acceptable
- Single-instance services where the simplest stop-redeploy-start procedure is honest about its trade-offs and well within tolerance
- Early-stage products with no live users yet — investing in canary infrastructure before you have traffic to canary against is premature

## Questions the Agent Should Ask
- What is the target time-to-rollback, and which strategy can hit it with the infrastructure you actually have?
- Can the application run two versions concurrently — including across database migrations, message contracts, and cached responses?
- For canary: which signals (error rate, latency, business metrics) decide whether the canary is healthy, and who or what makes the promote/rollback call?
- For blue-green: how do you handle in-flight requests, sticky sessions, and connections that outlive the cutover?
- How do database schema changes phase in — expand-then-contract migrations, dual writes, or a strict downtime window?
- What is the budget for extra capacity, and does the chosen strategy fit it (blue-green roughly doubles, canary adds a slice, rolling reuses existing capacity)?
- How is the deployment strategy expressed in code — a platform feature (e.g., a Kubernetes deployment, a load-balancer-target shift) or bespoke scripting?
- What does "deploy succeeded" actually mean — artifact landed on hosts, traffic shifted, health checks green, or business metrics holding?
- For a model or prompt change: which evals must pass before the canary starts, which quality signal decides promotion, and does rollback restore the previous model id and prompt version together?
- Can an agent session that started on the old version finish on it, or will it pick up the new version partway through?

## What Good Looks Like
- The deploy strategy matches the risk profile: critical user-facing paths get canary or blue-green; low-risk internal services use rolling deploys without ceremony
- Rollback is a single, rehearsed action — flipping a load balancer, scaling down a canary, or reversing a rolling update — not a fresh re-deploy of the previous version
- Schema changes are decoupled from code deploys via expand-and-contract, so the new and old code can both run against the same database safely
- Canary promotion is automated against explicit health and business metrics, not based on "looks fine" eyeballing of dashboards
- The platform layer (Kubernetes, ECS, a managed deploy product) does the orchestration; teams do not hand-write traffic-shifting logic per service
- Deploys, rollbacks, and traffic shifts emit events that incident responders can correlate with later anomalies
- Model and prompt changes pass the regression evals before release, then canary on a slice of traffic judged by a sampled quality score as well as errors and latency; a missed threshold shifts traffic back to the previous version automatically
- Long-lived agent sessions stay on the version they started on while new sessions go to the new version, and the old version is drained, not killed

## What Goes Wrong When You Skip This
- A bad release reaches 100% of traffic before anyone notices, and rollback takes longer than the original deploy because no plan for it existed
- A blue-green cutover succeeds for new requests but in-flight long-running connections fail mid-flight, producing a confusing trickle of errors after "deploy completed"
- Rolling deploy of a service with an incompatible message format causes old and new instances to corrupt each other's queue messages for the duration of the rollout
- A canary serves only a tiny fraction of traffic but hits a code path that only fires for premium customers, missing the bug entirely; the team gains false confidence and rolls forward
- Database schema changes ship with code that requires them, leaving no path back: rolling forward is unsafe, rolling back is unsafe, and the team is stuck
- A prompt change canaries cleanly on error rate and latency and is promoted; it has made answers worse for a common question type, and the canary never measured quality
- A deploy replaces the agent harness while hundreds of sessions are mid-task; they resume on a version with a different tool schema and fail in confusing ways long after "deploy completed"
