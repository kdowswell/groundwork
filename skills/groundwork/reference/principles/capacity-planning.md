<!-- source: principles/operations/capacity-planning.md -->

# Capacity Planning

## Principle
Capacity planning is the discipline of knowing — before users do — when a system is going to run out of headroom. It combines a forecast of demand (organic growth plus known launches), measurements of how much load each unit of infrastructure can actually serve, and a deliberate safety margin so the system has room to absorb surprises and the time to react.

## When This Matters
- A product launch, marketing campaign, seasonal peak, or geographic expansion will measurably change traffic
- Provisioning has lead time — physical hardware, regional capacity, vendor quotas, or DBA review — and you cannot just scale on demand
- A system has hard scaling cliffs (database connection limits, partition counts, license seats) that cannot be crossed without a project
- You are choosing between paying for headroom and accepting the risk of saturation
- Recent incidents have been driven by saturation rather than by code defects
- The cost of overprovisioning is significant enough that "just add 3x" is not an answer

## When This Doesn't Matter
- Early-stage products with tiny, unpredictable usage where forecasting is guesswork
- Fully elastic, pay-per-request workloads with no meaningful upper bounds and no concentration risk
- Internal tools whose worst-case load is well under available headroom and unlikely to change

## Questions the Agent Should Ask
- What is the demand forecast — organic growth, plus known inorganic events like launches and marketing — for the next planning horizon?
- How many requests per second (or jobs, connections, GB) can a single unit of this service handle today, and how do you know — by load test, by production observation, or by guess?
- What is the lead time to add capacity for the slowest constraint in the stack, and does the forecast horizon exceed it?
- What is the headroom target (e.g., run at 50% of saturation), and what triggers a re-plan when actual usage moves toward it?
- Which scaling axes are not elastic — database, queue partitions, vendor rate limits, IPs — and what is the plan when one is approached?
- How will you detect a forecast miss early enough to react, rather than discovering it during an incident?
- What does a controlled load test of the next anticipated peak look like, and when was the last one run?

## What Good Looks Like
- A demand forecast exists in writing, names its assumptions, and is reviewed on a cadence rather than once a year
- Per-component capacity (RPS, throughput, connections) is measured, not assumed, and updated when the system changes materially
- Headroom targets are explicit and observable on a dashboard; crossing them generates a planning ticket, not just an alert
- Load tests exercise the next expected peak with realistic traffic shapes, including failure modes (a dependency slowing down, not just more requests)
- Non-elastic constraints — database limits, vendor quotas, region capacity — are inventoried and tracked alongside elastic ones
- Capacity decisions are tied to cost: the team can articulate what extra headroom is being bought and why

## What Goes Wrong When You Skip This
- A scheduled marketing email goes out, traffic doubles for an hour, and the database connection pool — which had no headroom because nobody measured it — saturates and takes the site down
- The system "scales horizontally" until a hidden bottleneck (a single Redis instance, a vendor rate limit) is reached, and the only fix is a multi-week project run under incident pressure
- Cloud spend doubles year over year because every team overprovisions in fear, with no shared forecast to push back on
- A regional outage cannot be absorbed because every region was running at 90% utilization to save money
