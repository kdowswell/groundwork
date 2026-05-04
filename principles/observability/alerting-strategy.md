---
id: alerting-strategy
title: Alerting Strategy
category: observability
sources:
  - name: "Google SRE Book — Practical Alerting"
    url: "https://sre.google/sre-book/practical-alerting/"
  - name: "Google SRE Workbook — Alerting on SLOs"
    url: "https://sre.google/workbook/alerting-on-slos/"
  - name: "PagerDuty — Alerting Principles"
    url: "https://response.pagerduty.com/oncall/alerting_principles/"
  - name: "Charity Majors — Observability and Alerting"
    url: "https://charity.wtf/2019/11/05/the-sociotechnical-path-to-high-performing-teams/"
applies_when:
  scope: [new_build, epic, feature]
  scale: [solo, team, enterprise]
  stage: [refinement, build, maintain]
  domains: [financial_services, healthcare, ecommerce, any_production]
tags: [observability, alerting, on-call, sre, incident-response]
---

# Alerting Strategy

## Principle
Page humans for things only humans can fix, on signals that reflect user-visible problems, with enough context to act. Alert on symptoms — slow, broken, missing — not on causes like CPU or memory; let causes inform investigation, not pages.

## When This Matters
- A service has on-call and you are deciding what should and shouldn't wake someone up at 3 AM
- The team is suffering alert fatigue and ignoring real signals because the noise floor is too high
- You are setting up monitoring for a new service and copying default alerts wholesale from a template
- An incident already happened where the page fired late, fired wrong, or fired five times for one cause
- You are aligning alerts with new SLOs and need to retire legacy threshold alerts that no longer match user impact

## When This Doesn't Matter
- Pre-production environments where alerts are informational, not paging — different rules apply
- Batch systems whose failure modes are best handled by a daily review queue, not real-time pages
- One-person projects with no on-call rotation; a dashboard the developer checks is sufficient

## Questions the Agent Should Ask
- Does each paging alert correspond to something a user would actually notice or care about?
- For every alert, is there a runbook (or at minimum, a documented next step) — and if not, why is the alert paging instead of opening a ticket?
- Are alerts symptom-based (latency, error rate, freshness) or cause-based (CPU, memory, queue depth) — and if cause-based, why is that the right level?
- What is the severity ladder: which alerts page immediately, which open tickets, which post to a channel, which only show on dashboards?
- For SLO-based alerts, are you using multi-window, multi-burn-rate so fast burns page and slow burns ticket, instead of a single brittle threshold?
- How are related alerts grouped or deduplicated so one root cause produces one notification, not fifty?
- Who owns each alert, and is there a quarterly process to retire alerts that have not fired or have only produced false positives?
- What is the page-to-action ratio — how many pages in the last 90 days resulted in a real intervention vs. "ack and ignore"?

## What Good Looks Like
- Every paging alert has a clear user-visible symptom statement, an owning team, a runbook link, and a known severity
- The on-call rotation gets fewer than a handful of pages per shift in steady state, and most pages lead to action
- Alerts on SLOs use burn-rate windows, not raw error counts, so noise from brief spikes does not page
- Cause-level signals (resource saturation, queue length, retry counts) feed dashboards and tickets, not the pager
- Alerts are reviewed regularly; ones that never fire, always self-resolve, or always indicate the same fix are deleted or automated away
- New alerts are added through the same review process as code, with a defined symptom, threshold rationale, and runbook

## What Goes Wrong When You Skip This
- On-call ignores the pager because 80% of pages are noise, and the one real outage gets acknowledged but not investigated until customers complain
- Cause-based alerts page on CPU at 80% on a service that comfortably runs at 90%, while a real user-visible latency regression has no alert at all
- A single root cause produces a cascade of fifty pages across dependent services, and the responder spends the first 30 minutes silencing notifications instead of fixing anything
- Burnout drives out the senior engineers who held the on-call together, taking their tribal knowledge with them

## Further Reading
The Google SRE Book's *Practical Alerting* and the SRE Workbook's *Alerting on SLOs* together cover the philosophy of symptom-based alerting and the mechanics of multi-window burn-rate alerts. PagerDuty's alerting principles page is a concise checklist worth re-reading when you are tempted to add yet another page.
