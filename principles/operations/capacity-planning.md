---
id: capacity-planning
title: Capacity Planning
category: operations
sources:
  - name: Google SRE Book — Software Engineering in SRE (Capacity Planning, Auxon)
    url: https://sre.google/sre-book/software-engineering-in-sre/
  - name: The Art of Capacity Planning (Allspaw)
    url: https://www.oreilly.com/library/view/the-art-of/9780596518578/
  - name: AWS Well-Architected Framework — Performance Efficiency Pillar
    url: https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/
  - name: "Google Cloud Well-Architected Framework — AI and ML perspective: Reliability (reviewed Aug 2025)"
    url: "https://docs.cloud.google.com/architecture/framework/perspectives/ai-ml/reliability"
  - name: "Anthropic — Model deprecations (Claude Platform documentation, accessed Oct 2026)"
    url: "https://platform.claude.com/docs/en/about-claude/model-deprecations"
applies_when:
  scope: [new_build, epic, feature]
  scale: [team, enterprise]
  stage: [discovery, refinement, build, maintain]
  domains: [financial_services, healthcare, ecommerce, media, government, any_production]
tags: [operations, capacity-planning, performance, load-testing, forecasting, scaling, ai-systems, model-lifecycle]
---

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
- The product depends on model inference: accelerators may not be obtainable on demand, hosted models enforce token and request quotas, and the models themselves are retired on the provider's schedule

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
- For model-backed features: what are the token-per-minute and request quotas on each model in use, how close does peak traffic come to them, and how long does it take to get them raised?
- At what level of concurrency does generation latency degrade, and is accelerator availability the constraint (self-hosted) or the provider's quota (hosted)?
- When will each model in use be retired, and is the migration to its replacement, including re-running evaluations and re-checking cost and latency, in the plan before that date?

## What Good Looks Like
- A demand forecast exists in writing, names its assumptions, and is reviewed on a cadence rather than once a year
- Per-component capacity (RPS, throughput, connections) is measured, not assumed, and updated when the system changes materially
- Headroom targets are explicit and observable on a dashboard; crossing them generates a planning ticket, not just an alert
- Load tests exercise the next expected peak with realistic traffic shapes, including failure modes (a dependency slowing down, not just more requests)
- Non-elastic constraints — database limits, vendor quotas, region capacity — are inventoried and tracked alongside elastic ones
- Capacity decisions are tied to cost: the team can articulate what extra headroom is being bought and why
- Token quotas and accelerator capacity are inventoried as non-elastic constraints, with forecast usage against each and a lead time for raising it
- Generative serving is load-tested at realistic concurrency and prompt lengths, since throughput depends on tokens processed, not just requests
- Model retirement dates are tracked like certificate expiry; each migration is scheduled as planned work well inside the notice window, not started when the deprecation email arrives

## What Goes Wrong When You Skip This
- A scheduled marketing email goes out, traffic doubles for an hour, and the database connection pool — which had no headroom because nobody measured it — saturates and takes the site down
- The system "scales horizontally" until a hidden bottleneck (a single Redis instance, a vendor rate limit) is reached, and the only fix is a multi-week project run under incident pressure
- Cloud spend doubles year over year because every team overprovisions in fear, with no shared forecast to push back on
- A regional outage cannot be absorbed because every region was running at 90% utilization to save money
- A launch doubles traffic to a model-backed feature; the account's token quota is hit within the hour, every request is throttled, and raising the quota takes days
- A model the product depends on is deprecated; the team learns of it late, and the migration, evaluation, and prompt rework are squeezed into the final weeks before requests start failing

## Further Reading
The Google SRE book's chapter on software engineering in SRE describes the demand-and-supply model used by Auxon and the realities of forecasting at scale. Allspaw's *The Art of Capacity Planning* is the practical canonical reference, combining measurement, forecasting, and load testing into a workable operational discipline. Google Cloud's Well-Architected AI and ML reliability perspective recommends load-testing generative AI serving under high concurrency to find the point where accelerator availability limits performance. Anthropic's model deprecations page shows the model lifecycle as a capacity concern: it commits to at least 60 days' notice before retiring a publicly released model, recent retirements have followed deprecation notice by roughly two to four months, and requests to a retired model fail.
