# Spec: Escalation tracker

## Problem
Support leads cannot see which escalations are stuck without asking in chat.

## Primary User
Support leads, at their desks, triaging during business hours.

## Scope
### In scope
- A board of open escalations with idle time.
- Reassigning an escalation to another agent.

### Non-goals (explicitly out of scope)
- Customer-facing status pages.

## Success Criteria
1. A lead finds every escalation idle for more than 4 hours in under a minute.

## Primary Data Entity
Name: Escalation
Owner: support-operations

## Open Questions
| Question | Category | Owner |
|---|---|---|
| Exclude nights from idle time? | Deferrable | PM |

## Riskiest Assumption
Leads will check a board rather than wait for chat pings.

## Builder Check
| Question (from a cold read) | Resolution |
|---|---|
| What counts as stuck? | Answered in spec (wording tightened) |
