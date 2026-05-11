---
id: incident-retro
title: "Incident Retro"
phase: brownfield
description: >
  Run a blameless postmortem that produces a verified timeline, contributing
  factors, and owned action items with due dates — so the incident improves
  the system rather than just being closed.
trigger: >
  After a production incident has been resolved and the team needs to understand
  what happened and prevent recurrence.
entry_criteria:
  - "The incident is resolved (system is stable)"
  - "The incident timeline can be reconstructed from logs, alerts, or participant memory"
  - "Key participants are available to contribute"
exit_criteria:
  - "A verified timeline is written"
  - "Contributing factors (not root causes) are identified"
  - "Action items are written with owners and due dates"
  - "The document is shared with the team within 5 business days of resolution"
principles:
  - incident-response
  - structured-logging
  - alerting-strategy
time_box: "60-90 minutes (meeting) + 30 minutes (write-up)"
tags: [brownfield, incident, postmortem, reliability]
---

# Incident Retro

## When to Use This Skill

Use this skill after every production incident that affected users or required on-call response. The goal is not to assign blame — it's to understand the system well enough to make it more reliable. Incidents are learning opportunities that, if not captured in a structured retro, repeat.

Blameless means the focus is on systems and processes, not individuals. People make reasonable decisions with the information they had at the time. The question is: what information was missing, what signals were ambiguous, and what processes could be improved so the next engineer makes a better decision?

What goes wrong when you skip it: the incident gets closed and the team moves on. The same failure mode recurs 3 months later. Everyone is surprised. The second incident would have been prevented if the first had produced an action item.

## Steps

1. **Gather the raw materials.** Collect: alert timestamps, log excerpts, chat messages, status updates, deployment events, and any other time-stamped artifacts from the incident window. The goal is a factual record, not a narrative — narrative comes later. Do not reconstruct from memory alone if artifacts exist.

2. **Build the timeline.** Create a chronological sequence of events from first signal to resolution. Each entry has:
   - Timestamp
   - What happened (factual, not interpretive)
   - Who was involved or made a decision
   
   The timeline should be verifiable — someone who wasn't present should be able to confirm each entry from the raw materials. Where verification isn't possible, mark the entry as "per participant memory."

3. **Identify contributing factors — not root causes.** Incidents don't have a single root cause; they have contributing factors that combined to produce the failure. Common categories:
   - **Latent defect** — a bug that existed and was triggered
   - **Config change** — a configuration that was valid in one context and invalid in another
   - **Dependency failure** — an external system that behaved unexpectedly
   - **Monitoring gap** — the failure wasn't detected until user impact was observed
   - **Process gap** — a step that should have prevented or caught this didn't exist
   - **Knowledge gap** — the responder didn't have the information needed to resolve it faster
   
   Write each contributing factor as a factual statement, not a judgment.

4. **Evaluate detection and response time.** Ask:
   - When did the failure begin, and when was it first detected? What was the gap?
   - When was the impact understood, and when was it mitigated? What was the gap?
   - Were the right people notified? Were they notified in the right order?
   
   Gaps in detection and response time are where monitoring, alerting, and runbook improvements have the highest leverage.

5. **Write action items.** For each contributing factor and each detection/response gap, write at least one action item. A valid action item has:
   - A specific, verifiable outcome ("Add alerting for X metric with threshold Y" not "improve monitoring")
   - An owner (a specific person, not "the team")
   - A due date
   
   Action items without owners and due dates do not get done.

6. **Check for recurrence.** Ask: have we seen a similar contributing factor before? If yes, why didn't the previous incident's action items prevent this one? The answer is usually one of: the action item was not completed, it was completed but incorrectly, or it didn't address the actual contributing factor. Identify which and create a follow-up action item.

7. **Share the document.** Publish the retro within 5 business days of incident resolution. The audience is the whole team, not just the responders. The goal is shared learning — other engineers may recognize related vulnerabilities in their own areas.

## Checkpoints

**Is the timeline factual or narrative?**
Narratives contain interpretations: "the engineer panicked and..." or "the system started acting up when..." Timelines contain facts: "22:03 — PagerDuty alert fired for error rate >5% on checkout-service. On-call engineer acknowledged." Remove interpretation from the timeline; move it to the contributing factors section.

**Are the action items specific enough to be done and verified?**
"Improve alerting" is not an action item. "Add P99 latency alert for the checkout-service API with threshold 2s, paging the on-call engineer, by 2026-06-01" is. For each action item, ask: could an observer verify this was completed without asking the owner? If not, make it more specific.

**Is the retro blaming instead of factoring?**
If any sentence in the document contains a person's name paired with a judgment ("X made a mistake," "Y should have known"), rewrite it. The question is not what the person did wrong — it's what information was missing or what process was ambiguous. "The monitoring threshold was not configured" is a contributing factor. "X forgot to configure it" is blame. Both may be true; only the former belongs in the retro.

## Principle Application

**incident-response** (`principles/operations/incident-response.md`)
This entire skill operationalizes the postmortem phase of this principle. The "Questions the Agent Should Ask" section from the principle drives the contributing factor analysis in Step 3. The "What Good Looks Like" section defines what a retro document that actually improves the system looks like vs. one that just closes the incident.

**structured-logging** (`principles/observability/structured-logging.md`)
Step 1 (gathering raw materials) reveals the quality of the system's observability. If the timeline can't be reconstructed from logs because logs are missing, unstructured, or unhelpful, that's a contributing factor and a monitoring gap action item. The "What Goes Wrong When You Skip This" section lists exactly the problems that appear when logs are insufficient during incident reconstruction.

**alerting-strategy** (`principles/observability/alerting-strategy.md`)
Step 4 (detection and response time) is where this principle is applied. Every monitoring gap identified in Step 4 should be evaluated against the "What Good Looks Like" section of this principle to determine whether the gap should be filled with a new alert, a threshold adjustment, or a runbook update.

## Output Format

An `incident-retro-{{DATE}}-{{INCIDENT-SLUG}}.md` file:

```markdown
# Incident Retro: {{INCIDENT NAME}}

**Date of incident:** YYYY-MM-DD
**Date of retro:** YYYY-MM-DD
**Severity:** {{P1 | P2 | P3 | P4}}
**Duration:** {{START}} → {{RESOLUTION}} ({{TOTAL MINUTES}})
**Impact:** {{WHO WAS AFFECTED AND HOW}}

## Timeline
| Time | Event | Who |
|---|---|---|
| HH:MM | ... | ... |

## Contributing Factors
1. **{{CATEGORY}}** — {{FACTUAL STATEMENT}}
2. ...

## Detection & Response Gaps
- Detection gap: {{N}} minutes between failure start and first alert
- Resolution gap: {{N}} minutes between alert and mitigation
- Notification gaps: ...

## Action Items
| Item | Owner | Due | Status |
|---|---|---|---|
| Add alerting for... | {{NAME}} | YYYY-MM-DD | Open |

## Recurrence Check
Similar incidents: {{NONE | LINK TO PREVIOUS RETRO}}
If prior action items existed: {{STATUS AND WHAT FAILED}}
```
