<!-- source: principles/design/fallacies-of-distributed-computing.md -->

# Fallacies of Distributed Computing

## Principle
Developers new to distributed systems consistently make the same eight false assumptions. Each assumption feels safe because it was true in a single-process system and is often true in development. Each is false enough in production to cause outages, data loss, and cascading failures. The fallacies are not a checklist to suppress — they are a prompt to surface and challenge design assumptions *before code is written*. A design review that does not explicitly address each fallacy is incomplete.

The eight fallacies:
1. The network is reliable
2. Latency is zero
3. Bandwidth is infinite
4. The network is secure
5. Topology doesn't change
6. There is one administrator
7. Transport cost is zero
8. The network is homogeneous

## When This Matters
- Any feature or system that makes a network call — between services, to a third-party API, to a data store, to a message queue
- A design review for a new service that has not yet addressed what happens when remote dependencies are slow or unavailable
- A team migrating from a monolith to distributed services, where formerly in-process calls become network calls with entirely different failure modes
- Capacity planning or performance design where latency and bandwidth have not been explicitly modeled
- Security design where network-layer trust has not been questioned

## When This Doesn't Matter
- A genuinely single-process system with no external network calls (vanishingly rare in production)
- A prototype that exists only to test a concept and will be discarded before any network behavior matters

## Questions the Agent Should Ask
**On reliability:**
- What happens to this operation when the network call fails? Times out? Returns an error? Returns a partial response?
- Is there a retry strategy, and is it bounded? Unbounded retries under failure can amplify load into a cascade.

**On latency:**
- What is the p99 latency budget for this operation, and does it account for all the network hops? Have you added the latencies of each downstream call?
- Is any part of this flow synchronous that could safely be asynchronous?

**On bandwidth:**
- What is the payload size at production scale? Have you tested with a full-size payload, not a toy example?
- Are you transferring data that could instead be a reference (an identifier) that the receiver resolves on demand?

**On security:**
- Is this call authenticated at the transport layer, at the application layer, or both? Is trust derived from network location?
- What does an attacker with access to the internal network segment gain?

**On topology:**
- Are service addresses, ports, or IP ranges hardcoded? What breaks when a host is replaced or an IP changes?
- Have you verified that service discovery and health-check configuration handles restarts and re-registrations correctly?

**On administration:**
- Who controls the runtime configuration on each side of this call? What happens when they make independent changes?
- What is the protocol for a breaking change — schema, API version, or behavior — when two teams own the two ends?

**On transport cost:**
- Are you serializing and deserializing this payload in a tight loop? Have you measured the CPU and memory cost at scale?
- Is compression or a binary encoding justified by the volume?

**On homogeneity:**
- Do all services in this call chain assume the same character encoding, date format, number precision, and timezone?
- Have you tested across the language runtimes and library versions actually deployed in production?

## What Good Looks Like
- Every network call has an explicit timeout, and the timeout is informed by the latency budget of the operation, not an arbitrary default
- Failures are handled with defined behavior (retry with backoff, return a cached fallback, propagate a typed error) rather than letting exceptions surface unexpectedly
- Latency is measured at the p50, p95, and p99 levels under production-like load, not just average in development
- Service addresses are resolved via service discovery or DNS; no hardcoded IP addresses in application code
- Cross-team API changes go through a versioning and deprecation process before any consumer is affected
- Serialization format and encoding are explicit contracts, not implicit assumptions about a common runtime
- Network security is explicit: every internal call carries a verifiable identity, not a trusted-network assumption

## What Goes Wrong When You Skip This
- An in-process function call is replaced by a network call with no timeout — the first slow downstream response holds a thread for 30 seconds and the thread pool exhausts in under a minute, taking the caller down with it
- A bulk data transfer that worked in development with 100 rows sends 10 million rows in production and saturates the network link between data centers
- A service trusts all requests from within the internal network — an attacker who compromises one internal service pivots to any other service without authentication
- Hardcoded IPs fail silently after a cloud provider replaces an instance, and no monitoring catches the absence of traffic until a user files a support ticket
- Two teams independently change their serialization library, and the incompatibility is discovered only in production when one team's service cannot deserialize the other's payload
