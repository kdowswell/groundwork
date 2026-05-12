<!-- source: principles/operations/finops-cost-visibility.md -->

# FinOps and Cost Visibility

## Principle
Cloud infrastructure cost is an engineering concern, not only a finance concern. Every architectural decision — the data store chosen, the cache hit rate, the fan-out of a single event, the retry interval on a background job — has a cost consequence. Cost should be visible to the teams making those decisions in near real time, not discovered monthly on a billing report. FinOps (financial operations for cloud) treats cost as a first-class engineering metric: tagged to the team or feature responsible, measured per unit of work, and actionable without waiting for a finance cycle.

The goal is not to minimize cost — it is to understand cost well enough to make deliberate trade-offs between cost, latency, reliability, and feature scope. An architectural decision made with cost visibility is a trade-off; made without it, it is a gamble.

## When This Matters
- Cloud spend is growing faster than the revenue or feature output it is producing
- Engineering teams cannot attribute cost spikes to specific features, services, or code changes
- Architecture decisions are made without cost estimates — a new pattern ships that costs ten times more per request than the old one and nobody knows until the bill arrives
- Egress, storage, or compute costs have surprised the business on a monthly invoice
- The product includes AI/ML features where inference cost per request is a direct constraint on product margin
- Multi-tenancy means cost must be attributed per customer to validate unit economics and detect unprofitable accounts

## When This Doesn't Matter
- A project in early exploration where cost is deliberately not the constraint (a funded spike, a time-boxed prototype)
- An on-premises or fully self-hosted system where cost does not vary with usage in a directly attributable way
- A small-scale system where total spend is negligible and the attribution overhead exceeds the savings from optimization

## Questions the Agent Should Ask
- What is the cost per request, per user, or per transaction for this system — and is that number known, estimated, or unknown?
- Are infrastructure resources tagged by team, service, and environment so that spend can be attributed to the responsible team without a manual audit?
- When a new architectural pattern is being evaluated, is cost per unit of work part of the evaluation criteria alongside latency and throughput?
- Is there a budget threshold or anomaly detection configured so that the team hears about a cost spike within hours rather than weeks?
- For AI/ML features: what is the inference cost per request, and does that fit within the product's unit economics at expected scale?
- Are the team's most expensive operations actually a bottleneck, or is money being spent on heavily over-provisioned resources that could be right-sized?
- Is there a named person or team responsible for reviewing cost trends and owning optimization decisions — or does cost review happen only when the bill is painful?

## What Good Looks Like
- Every cloud resource carries at minimum: team, service name, and environment (production/staging/dev) tags — enforced by policy, not by convention
- Cost dashboards are updated at least daily and are visible to engineers without requiring a finance team's mediation
- Budget alerts and anomaly detection fire within hours of a cost spike — before the monthly bill, not after
- Architecture reviews include an order-of-magnitude cost estimate for the new pattern at expected load and peak load
- Unit economics (cost per customer, cost per transaction, cost per model inference) are tracked as product metrics alongside latency and error rate
- Optimization work is prioritized against the highest-spend line items, not just the most visible or most recent changes

## What Goes Wrong When You Skip This
- A fan-out pattern sends one user action to 500 downstream event consumers; no one notices until the monthly bill shows a 400% cost increase with no corresponding increase in features or users
- Engineering teams over-provision "just to be safe" — ten times the needed compute idles at full cost because no one sees the bill for leaving it running
- Two architectures are compared on latency and reliability; the option chosen is 3× more expensive per request; that fact was not in the evaluation, and the team learns it only when it matters at scale
- A single misconfigured job runs 100× more often than intended for three weeks; no alert fires because cost anomalies are not monitored; the quarterly budget review is the first indication something went wrong
- A competitor ships the same feature at half the cost because they understood the cost model before choosing the architecture; the discovery happens when pricing becomes a competitive issue
