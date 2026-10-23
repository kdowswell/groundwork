<!-- source: principles/delivery/infrastructure-as-code.md -->

# Infrastructure as Code

## Principle
Define infrastructure — networks, compute, data stores, identities, DNS, policies — in version-controlled, declarative source files, and apply changes only through an automated, reviewed pipeline. Manual console clicks and ad-hoc CLI fixes are not allowed to be load-bearing; the code is the source of truth, and the running system must converge to it.

## When This Matters
- More than one environment exists (dev, staging, prod) and they must stay genuinely equivalent rather than drifting into snowflakes
- Compliance, audit, or security review requires evidence of who changed what infrastructure, when, and with what approval
- Disaster recovery requires rebuilding part or all of the environment from scratch in a defined timeframe
- The team is growing past the point where one person can hold the topology in their head
- You are migrating between regions, accounts, or cloud providers and need infrastructure changes to be reviewable and reversible
- Tear-up and tear-down of ephemeral environments (preview deploys, integration test stacks) is a routine workflow

## When This Doesn't Matter
- Truly throwaway personal experimentation in a sandbox account where the value of automation is lower than the cost of writing it
- A single managed service (e.g., a fully managed SaaS) where the only "infrastructure" you control is a handful of dashboard settings already covered by that vendor's audit trail

## Questions the Agent Should Ask
- Which tool fits the team's skills and the cloud surface area — a declarative provisioner like Terraform/CloudFormation, an SDK-style tool like Pulumi/CDK, or a configuration-management layer on top?
- How is state stored, locked, and backed up — and who has write access to it?
- How are secrets handled in the IaC layer so they do not land in git, plan output, or state files?
- What is the change workflow — is `apply` triggered from a developer's laptop, from CI, or from a separately permissioned deploy system?
- How is drift between code and live infrastructure detected, and how often?
- How are modules or stacks structured so that a blast-radius-limited change does not require touching every environment in one commit?
- What is the rollback story when an apply leaves resources in an inconsistent state, and have you tested it?
- Which resources are intentionally not managed by IaC (e.g., bootstrap accounts, DNS zone delegation), and where is that decision documented?

## What Good Looks Like
- All long-lived infrastructure is described in version control; new resources land via pull request, not via the console
- A scheduled job or pipeline detects drift between declared and actual state and reports it as a real signal, not a silent warning
- Modules are small, composable, and parameterized by environment, so a change can be promoted from dev to prod by changing inputs, not by copying files
- State is stored in a remote backend with locking enabled, encrypted at rest, and accessible only via the pipeline's identity — not human credentials
- The console is locked down to read-only for most engineers in production accounts; write access is rare, audited, and time-bound
- Rebuilding a non-production environment from a clean slate is a routine, tested operation — not a quarterly fire drill

## What Goes Wrong When You Skip This
- Production drifts silently from the code: someone fixed a thing in the console at 2am during an incident, and now the next IaC apply will revert that fix and re-cause the outage
- Disaster recovery fails because the runbook to "rebuild prod" has not been exercised since the original setup, and the original setup involved manual steps no one wrote down
- Two environments named "staging" and "prod" diverge in security group rules, IAM policies, or instance sizes, and a change that worked in staging breaks in prod for reasons no one can explain
- A misapplied change from a developer laptop locks up the team because the state was not stored centrally and now two people's local state files conflict
- Secrets end up in plaintext in the state file or in committed plan output because no one drew a clear boundary between IaC and the secrets layer
