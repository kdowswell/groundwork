# Spec: Escalation tracker

## Problem
Support leads cannot see which customer escalations are stuck without asking in chat, so stuck
escalations sit for a day or more before anyone notices.

## Primary User
Support leads (8 across three regional teams), at their desks during business hours, triaging
between their own queue work. They have minutes, not hours, for triage, and they work from the
ticketing system all day.

Today a lead finds stuck escalations by asking agents in the team chat, or by scanning the
ticketing system's queue view, which can't sort by idle time and hides internal replies.
Secondary users are support admins, who maintain the priority limits.

## Scope
### In scope
1. **Escalation board.** One page listing every open escalation, sorted by how long it has been
   idle past its priority's limit. Each row shows ticket number, customer, priority, assignee,
   idle time, and how far past the limit it is.
2. **Idle time.** Business-hours time since the assignee last replied publicly or internally.
   Time waiting on the customer does not count.
3. **Priority limits.** P1 is stuck after 2 business hours, P2 after 4, P3 after 8.
4. **Team filter.** Leads see their own team by default and can switch to all teams.
5. **Priority filter.** Narrow the board to one or more priorities.
6. **Assignee filter.** Show one agent's escalations, to prepare a one-to-one.
7. **Customer tier filter.** Enterprise, business, or standard.
8. **Search.** By ticket number or customer name.
9. **Reassign.** Move an escalation to another agent on the lead's team in one step. The new
   assignee is notified by the ticketing system's own notification, not by the board.
10. **Reassignment note.** A required short note, kept in the board's audit log.
11. **Conflict check.** Reassigning fails if the assignee changed since the board loaded.
12. **Audit log.** Who reassigned what, when, from whom, to whom, and why.
13. **Stuck history.** When each escalation became stuck and when it stopped being stuck.
14. **Daily digest.** A morning email to each lead listing their team's stuck escalations, with
    a link to each on the board. Leads can turn their own digest off.
15. **Board refresh.** Data at most 2 minutes old, with the time of the last refresh shown.
16. **Outage banner.** When the ticketing system is unreachable, the board keeps its last copy
    and says how old it is.
17. **Reassignment while degraded.** Disabled during a ticketing outage, with a clear message.
18. **Settings page.** Leads with admin rights change priority limits without a deploy. Every
    change is audited, and a change applies from the next refresh onward.
19. **Business calendar.** One business-hours calendar for all teams in v1.
20. **Sign-in.** Company single sign-on; only support leads and admins can open the board.

### Non-goals (explicitly out of scope)
- Customer-facing status pages.
- Creating or closing escalations: that stays in the ticketing system.
- Changing priority, tags, or any ticket field other than the assignee.
- Agent-facing views: v1 is for leads only.
- Per-team business calendars and holidays.
- Workload balancing or automatic reassignment.
- Reporting beyond the stuck history (no dashboards, no exports).
- Mobile layouts.
- Chat or paging integrations.
- Escalations from channels the ticketing system doesn't hold (phone notes, email outside it).

### Constraints
- The ticketing system stays the system of record; the board never creates or closes tickets.
- The board's only write to the ticketing system is the assignee, through its public API.
- API credentials come from the environment or a secret store at runtime, never from source.
- The ticketing API allows 700 requests per minute per account; the board may use half.
- Leads work across three time zones; all times shown are in the lead's own time zone.
- Support operations owns the board after launch and has no dedicated on-call.
- The board must be usable at 1280×800, the smallest screen the support team uses.
- Personal data shown is limited to what the ticketing system already shows a lead.
- Audit entries are kept for 13 months, matching the ticketing system's retention.
- Launch target: before the Q1 support planning review.

## Success Criteria
1. A lead finds every escalation stuck past its limit in under a minute, without asking in chat.
2. Median time an escalation stays stuck drops by at least 50% within six weeks of launch.
3. Reassignments made from the board show up in the ticketing system within 30 seconds.
4. No reassignment silently overwrites another person's change (conflict check holds).
5. During a ticketing outage the board still loads, from its last copy, with its age shown.
6. Every reassignment has an audit entry with a note.
7. The daily digest arrives before 08:30 local time on business days.
8. Leads from all three teams use the board on at least four days a week after four weeks.

## Primary Data Entity
Name: Escalation
Owner: support-operations (the ticketing system is the system of record; the board keeps a
read-only copy plus its own audit log and stuck history)

## Open Questions
| Question | Category | Owner |
|---|---|---|
| Should the digest also go to the support director? | Deferrable | Support director |
| Per-team business calendars in v2? | Deferrable | PM |

## Riskiest Assumption
The ticketing system's API exposes enough activity history (reply times, assignee changes) to
compute idle time for every open escalation every 2 minutes within its rate limits. If it
doesn't, the board needs webhooks or a nightly export instead of polling, which changes the
architecture.

## Builder Check
| Question (from a cold read) | Resolution |
|---|---|
| What counts as the assignee acting on an escalation? | Answered in spec (wording tightened): public or internal replies |
| Which notification channel for the digest? | Agent call: email only |
| Can one escalation have two owners? | User: no, one assignee (answered 2026-10-20) |
| Which agents can a lead reassign to? | User: their own team only (answered 2026-10-20) |
| Does the stuck clock restart after waiting on the customer? | Agent call: yes, it restarts |
