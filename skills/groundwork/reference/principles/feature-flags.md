<!-- source: principles/delivery/feature-flags.md -->

# Feature Flags and Release Decoupling

## Principle
Wrap new or risky behavior in a runtime switch so that *deploying* the code and *releasing* it to users are two different decisions. Different flag types — release, ops, experiment, permission — have different lifetimes and different owners; treat them differently rather than as one undifferentiated toggle bag.

## When This Matters
- You want to merge to trunk continuously while a feature is still incomplete or unverified in production
- You need to roll a change out to a small percentage of traffic, observe, and expand or revert without redeploying
- A feature must be reversible within seconds — for example, a payment integration, a search index swap, or a security-sensitive code path
- You are running A/B tests or holdout experiments and need consistent per-user assignment
- Different customers, plans, or regions are entitled to different functionality from the same codebase
- An incident response team needs a kill switch they can flip without waiting on a deploy pipeline

## When This Doesn't Matter
- The change is purely additive, low-risk, and easy to roll back via a redeploy (small bug fix, copy change, internal-only tooling)
- The system has no live users yet, so there is no value in decoupling deploy from release
- Adding a flag would introduce more accidental complexity than the change itself carries (a one-line refactor wrapped in a toggle obscures more than it protects)

## Questions the Agent Should Ask
- Which type of flag is this — release, ops, experiment, or permission — and how long is it expected to live?
- Who owns the flag, and who has authority to flip it in each environment?
- What is the default value if the flag service is unavailable, and is that default safe?
- How will the flag be evaluated — per request, per user, per session — and is the assignment stable for the same user over time?
- What metrics or observability hooks tell you whether the new code path is actually behaving correctly when the flag is on?
- When will this flag be removed, and what stops the codebase from accumulating dead toggles?
- Are flag changes logged and auditable, especially for permission and ops toggles that affect security or availability?
- Does the rollback path involve flipping the flag, redeploying, or both — and have you tested it?

## What Good Looks Like
- Flags are declared with an explicit type, owner, and expected end-of-life date in a single registry the team can audit
- Release toggles are removed within days or weeks of a feature reaching general availability — the codebase does not carry indefinite dead branches
- Long-lived flags (ops kill switches, permission gates) are clearly distinguished from short-lived release toggles and follow a different review process
- The flag evaluation layer fails closed to a known-safe default if the configuration store is unreachable
- Experiments use stable, hashed user assignment so the same user sees the same variant across requests and devices
- Flag flips emit audit events with actor, timestamp, environment, and reason — so post-incident review can see what changed when

## What Goes Wrong When You Skip This
- A risky deploy ships everything-or-nothing; rollback means a panicked revert and redeploy under incident pressure rather than a single flag flip
- The codebase accumulates years of stale toggles, each one a forked code path that confuses readers and hides bugs in the unflipped branch
- An A/B experiment produces noisy results because users were rebucketed on every request, mixing variants together
- An ops kill switch fails open during an outage because no one defined the safe default, and a third-party dependency outage takes the whole product down
- Permission flags drift out of sync with the entitlements system, and customers either lose access to features they paid for or gain access to features they did not
