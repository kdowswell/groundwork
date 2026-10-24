<!-- source: principles/delivery/ci-cd-pipeline.md -->

# CI/CD Pipeline as Code

## Principle
Every change to the codebase travels the same automated path from commit to production: build, test, package, deploy. The pipeline is defined in version control alongside the code, runs on every change, and is the single, trusted route to production — humans do not run release steps by hand.

## When This Matters
- More than one engineer commits to the same repository, so manual release steps create coordination cost and inconsistency
- You need to deploy faster than you can manually verify each release end-to-end
- Regulatory or audit requirements demand an evidence trail showing what was built, tested, and deployed for any given commit
- Deployments are currently slow, error-prone, or held by a single person who knows the steps
- You want to use deployment frequency, lead time, change failure rate, and recovery time as feedback signals on engineering health

## When This Doesn't Matter
- One-off scripts, throwaway experiments, or research notebooks that never reach a user
- Static personal projects deployed by hand once a quarter where the cost of automation exceeds the cost of repeating the manual steps

## Questions the Agent Should Ask
- Where does the pipeline definition live, and is it reviewed through the same code review process as the application code?
- What stages does a commit pass through before production, and which of them can fail the build?
- How long does the pipeline take from commit to deployable artifact, and what is the slowest stage?
- Is the same artifact promoted across environments, or does each environment rebuild from source — and how do you guarantee they are equivalent?
- What is the branching strategy — trunk-based with short-lived branches, or long-lived feature branches — and does the pipeline match it?
- How are secrets, signing keys, and deploy credentials provided to the pipeline without exposing them in logs or config?
- What happens when a deploy fails partway through — is rollback automated, manual, or undefined?
- Who is paged when the pipeline itself breaks, and how is pipeline reliability tracked separately from application reliability?

## What Good Looks Like
- The pipeline definition is checked into the same repository as the code it builds, and changing it requires a pull request
- Every commit on the main branch produces a single immutable artifact (container image, package, bundle) that is the same across staging, pre-prod, and prod
- Tests run in tiers — fast unit tests gate every commit, slower integration and end-to-end tests gate promotion — so feedback on common failures arrives in minutes, not hours
- Deployment to production is a single, reproducible action that any engineer can trigger and observe, not a runbook full of manual SSH steps
- Pipeline runs and the artifacts they produce are traceable back to a specific commit, with provenance metadata attached for audit and incident forensics
- Branches are short-lived, merges to trunk happen daily, and the pipeline keeps trunk continuously deployable

## What Goes Wrong When You Skip This
- Releases drift between environments because each one was built or configured by hand, and "works in staging, fails in prod" becomes the default outcome of every deploy
- The one engineer who knows the manual deploy steps becomes a single point of failure; releases stall when they are on leave
- A bad change reaches production because the only test that would have caught it lives on someone's laptop and was skipped under deadline pressure
- Audit and compliance reviews stall because there is no consistent record of what code, with what tests, was deployed where, when, and by whom
- Long-lived feature branches accumulate merge conflicts and integration debt that surface as a single high-risk release, raising change failure rate
