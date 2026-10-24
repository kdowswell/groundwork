# Safe Change Plan: Per-team business calendars

**Date:** 2026-10-24
**Author:** Support tools team
**Target system:** Escalation tracker

## Behavior Delta
Baseline: docs/spec.md (approved 2026-10-20)

### Added
- **Team calendars.** Each team has its own business-hours calendar, with its time zone and public holidays.
- **Calendar admin.** Leads with admin rights edit their own team's calendar on the settings page.

### Modified
| Before | After | Spec reference |
|---|---|---|
| One business-hours calendar for all teams in v1 | Idle time uses the calendar of the escalation's team | Scope, item 19 (Business calendar) |
| Per-team business calendars and holidays are out of scope | (removed from Non-goals) | Non-goals |
| The daily digest arrives before 08:30 local time on business days | The digest arrives before 08:30 in each lead's team time zone, and only on that team's business days | Success Criteria 7 |

### Removed
- The single shared calendar on the settings page. Support admins used it; they now edit per-team calendars.

### Unchanged (must keep working)
- Priority limits: P1 after 2 business hours, P2 after 4, P3 after 8.
- Time waiting on the customer still doesn't count toward idle time.
- Reassignment, the conflict check, and the audit log behave as before.

## Blast Radius
**Severity:** Silent
**Affected:** Every lead's board. A wrong calendar makes escalations look stuck too early or too late, with no error.

## Detection Signals
| Signal | Threshold | Detection time |
|---|---|---|
| Stuck count per team, before vs. after rollout | Change of more than 30% on the first business day | One business day |
| Escalations flagged stuck outside their team's business hours | Any | Real-time |

## Rollback Strategy
1. Turn off the per-team calendar flag; idle time falls back to the shared calendar.
2. Keep per-team calendar data; it is unused while the flag is off.
One-way doors: None

## Test Coverage Plan
- [ ] Idle time across a team holiday counts zero hours.
- [ ] Two teams in different time zones flag the same escalation age differently.
- [ ] Priority limits unchanged: a P1 is stuck after 2 business hours on its team's calendar.
- [ ] Waiting on the customer still pauses idle time.

## Deployment Sequence
1. Ship calendar storage and the admin page, flag off.
2. Admins enter each team's calendar.
3. Turn the flag on for one team, compare stuck counts for a day, then all teams.

## Coordination Requirements
| Who | Action | Confirmation required |
|---|---|---|
| Support admins | Enter each team's calendar before step 3 | Each team's calendar reviewed by its lead |

## Builder Check
| Question (from a cold read) | Resolution |
|---|---|
| Which team's calendar applies after a reassignment across teams? | Agent call: the escalation's current team |
| Do holidays come from a shared list? | User: no, each team enters its own (answered 2026-10-24) |
