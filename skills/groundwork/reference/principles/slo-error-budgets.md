<!-- source: principles/observability/slo-error-budgets.md -->

# SLOs and Error Budgets

## Principle
Pick a small number of user-meaningful service level indicators (SLIs), set explicit objectives (SLOs) for them, and treat the gap between objective and 100% as a budget you are allowed to spend on change. When the budget is healthy, ship faster; when it is gone, stop shipping risky changes and pay down reliability instead.

## When This Matters
- A service has real users and the team has to negotiate reliability work against feature work
- The team is arguing about how much testing, redundancy, or incident remediation is "enough" without an agreed reference point
- You operate a platform that other teams depend on, and consumers need to plan around its reliability
- You are setting on-call expectations and want pages to map to user-visible problems, not noise
- Leadership is asking for "five nines" on a service that has never measured what users actually experience

## When This Doesn't Matter
- Pre-launch products with no traffic — there is no signal to measure and no users to disappoint
- Internal tools used by a handful of people who can tolerate ad-hoc breakage and report it directly
- Components where reliability is dominated by an external dependency you cannot influence; an SLO would describe that vendor, not your service

## Questions the Agent Should Ask
- What is the user journey this service supports, and what does "working" mean from the user's perspective?
- Which SLIs reflect that — request success rate, latency at a specific percentile, freshness, durability — and which would be vanity metrics?
- What objective is honest given the system's current behavior over the last 30–90 days, not aspirational?
- What is the measurement window (rolling 28 days is common), and where are the SLI numerator/denominator computed — at the load balancer, the gateway, the client?
- What does "budget exhausted" mean operationally — feature freeze, release freeze, mandatory reliability work — and who has authority to enforce it?
- How will burn-rate alerts be tuned so the team is paged on fast burns but not on slow background noise (typically multi-window, multi-burn-rate)?
- Are dependent services' SLOs compatible with this one — can your 99.9% promise survive a dependency that promises 99.5%?
- Is there a real consequence if the budget is repeatedly blown, or is the SLO decorative?

## What Good Looks Like
- A small set of SLIs (often 2–4 per service) tied to actual user outcomes, defined precisely enough that two engineers would compute the same number
- SLOs that are achievable with the current architecture and have headroom for change — not 100%, not aspirational
- A written error budget policy that names the action taken when the budget is at 50%, 100%, and exhausted, and who owns the decision
- Burn-rate alerts on the SLO itself — fast burn (e.g., 2% in 1 hour) pages, slow burn (e.g., 10% in 3 days) opens a ticket
- Reliability work and feature work are visibly traded off in planning using budget state, not gut feel
- The SLO is reviewed periodically and tightened or loosened based on observed user impact, not left to drift

## What Goes Wrong When You Skip This
- The team chases "99.999%" on a service whose users would not notice 99.9%, and burns engineering time on diminishing returns
- Reliability work is always "next quarter" because there is no agreed signal that says it must happen now, until a major incident forces it
- On-call gets paged on every blip because alerts are set on raw error counts instead of budget burn, leading to alert fatigue and missed real incidents
- A consumer service depends on yours assuming 99.99% when you actually deliver 99.5%, and discovers the gap during their own incident
