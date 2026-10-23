<!-- source: principles/operations/runbooks.md -->

# Runbooks for Operational Procedures

## Principle
A runbook is a focused, action-oriented document that tells an on-call engineer exactly what to do for a known operational task or alert. It is reachable from the alert that triggers it, current enough to be trusted, and specific enough that a tired engineer at 3 a.m. can follow it without rereading the system architecture.

## When This Matters
- You are wiring up a new alert and need to give the recipient something to do other than guess
- A recurring operational task (failover, certificate rotation, replay of a queue) keeps falling on whoever happens to remember how it works
- On-call rotation includes engineers who did not build the system being paged on
- A previous incident exposed that critical knowledge lived in one person's head
- You are introducing a new service to production and the on-call team has not operated it before
- A manual procedure is repeated often enough that it is worth either documenting or automating

## When This Doesn't Matter
- A pre-production prototype with no on-call expectations
- A one-off migration that will never run again
- A task that is already fully automated and exposes no manual decision points

## Questions the Agent Should Ask
- Which alert or symptom does this runbook address, and is the runbook linked from the alert payload?
- What is the first concrete command or check the responder should run, and what output tells them they are in the right place?
- What does each branch of the decision tree do — including the "escalate" branch when the runbook does not cover the situation?
- Where does this runbook live, who owns it, and when was it last exercised against the real system?
- Which steps in this runbook are candidates for automation, and what is blocking that automation today?
- How will the runbook get updated when the underlying system changes — is there a trigger that flags it as stale?
- What is the rollback or "undo" path if a step in the runbook makes things worse?

## What Good Looks Like
- Every paging alert links to a runbook entry, and every runbook entry names the alerts it answers
- Steps are commands, checks, and decisions — not paragraphs of background prose
- Runbooks live in version control alongside the service, are reviewed in PRs, and have named owners
- Each runbook includes an explicit escalation path for "this is not what the runbook describes"
- Frequently used runbooks are progressively replaced by automation, with the runbook reduced to "run this script and verify these outputs"
- Runbooks are exercised — in game days, onboarding, or scheduled drills — so staleness is detected before an incident does it

## What Goes Wrong When You Skip This
- A 2 a.m. page wakes an engineer who has never seen the service, the runbook link is missing, and MTTR balloons while they read source code
- The "runbook" is a Confluence page last edited eighteen months ago that references a hostname that no longer exists, sending the responder down a dead end
- Tribal knowledge concentrates in one senior engineer; when they take vacation, the team carries pager risk they cannot diagnose
- Operators improvise during an incident, take an unsafe shortcut that worked once, and turn a 10-minute degradation into a 3-hour outage
