<!-- source: principles/operations/incident-response.md -->

# Structured Incident Response

## Principle
When something is on fire, response is a process — not improvisation. Defined roles, a single coordination channel, explicit communication cadence, and a blameless review afterward turn a chaotic outage into a learning event. The point is not paperwork; it is to make recovery faster and the next outage less likely.

## When This Matters
- A service has gone live and now has paying users, internal dependents, or compliance obligations
- Multiple teams are likely to be involved in any nontrivial incident and need a way to coordinate
- An on-call rotation exists and engineers are expected to respond to alerts they did not write
- A regulator, customer contract, or auditor expects evidence of how incidents are managed
- A previous incident exposed confusion over who was driving, who was talking to customers, or who could authorize a risky mitigation
- The organization wants to learn from outages instead of repeating them

## When This Doesn't Matter
- Pre-production environments where outages have no external impact
- A single-developer project where there is no ambiguity about who responds
- Issues that are clearly bugs found in development before deployment

## Questions the Agent Should Ask
- Who is the Incident Commander, and is that role explicitly handed off when shifts change or the IC needs to do hands-on work?
- Where is the single coordination channel for this incident, and how do new responders find it without asking?
- Who is responsible for external communication (status page, customers, executives), and on what cadence are updates expected?
- What is the threshold for declaring an incident — and for declaring it resolved — so the team is not arguing about severity mid-fire?
- Will there be a postmortem, when is it scheduled, and who facilitates it independently of the people who responded?
- Are mitigation actions reversible, and is there a record being kept in real time so the postmortem is not reconstructing memory days later?
- How are contributing factors going to be discussed without naming-and-shaming the engineer who pushed the change?

## What Good Looks Like
- Roles (Incident Commander, Communications Lead, Operations Lead) are named at the start and visible to everyone in the channel
- A single chat channel or bridge is the source of truth; side conversations are pulled back into it
- Status updates go out on a predictable cadence even when there is "nothing new to report"
- Significant incidents trigger a written postmortem within days, focused on contributing factors and system change — not on who to blame
- Postmortem action items are tracked to completion and reviewed; "lessons learned" are not just filed
- The team can point to specific changes — alerts, runbooks, guardrails, automation — that came from prior incidents

## What Goes Wrong When You Skip This
- Three engineers are typing fixes simultaneously into production with no coordination, and one undoes the mitigation another just applied
- Customer support has no idea what to tell users because nobody assigned communications, and an internal Slack thread becomes the de facto status page
- An incident is "resolved" because the symptom went away; weeks later the same root cause causes a worse outage because nothing was learned
- A blameful postmortem teaches the team that surfacing mistakes is dangerous, so the next near-miss never gets reported and quietly grows into the next major incident
