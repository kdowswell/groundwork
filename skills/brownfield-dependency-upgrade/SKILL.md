---
name: brownfield-dependency-upgrade
title: "Dependency Upgrade"
description: >
  Safely upgrades a dependency by validating compatibility, checking security
  advisories, and staging the rollout so a problematic upgrade can be reverted.
  Use when a dependency needs updating, a security advisory or CVE flags an
  outdated package, or a version upgrade is blocking other work.
phase: brownfield
entry_criteria:
  - "The dependency to upgrade is identified"
  - "The current and target versions are known"
  - "The dependency's role in the system is understood"
exit_criteria:
  - "Breaking changes between current and target versions are documented"
  - "Security advisories affecting the upgrade are reviewed"
  - "A test plan covering the dependency's use in the system is written"
  - "A rollback plan exists if the upgrade causes regressions"
principles:
  - supply-chain-security
  - health-checks
time_box: "2-8 hours depending on criticality"
tags: [brownfield, dependencies, security, maintenance]
---

# Dependency Upgrade

## How This Skill Works

This skill structures a dependency upgrade as a staged, verifiable process with a documented rollback path — so the upgrade is either confirmed safe or reverted cleanly, rather than applied and hoped for. The output is an upgrade plan with a compatibility matrix, test checklist, and explicit rollback procedure.

The agent drives the compatibility analysis, advisory review, and test plan structure. The human provides what the agent cannot determine remotely: which system behaviors are most critical to verify, what the release window looks like, and the acceptable risk threshold given the current system state.

**Key concepts used in the Steps:**
- **Compatibility matrix** — a mapping of the dependency's new version against the system's known usage patterns
- **Security advisory** — a published CVE or vendor notice affecting the current version
- **Staging strategy** — the sequence of environments (dev → staging → canary → production) the upgrade moves through
- **Rollback procedure** — the specific steps to revert the upgrade if a problem is detected after deployment
- **Blast radius** — which system behaviors are affected if the upgrade introduces a regression

## Steps

1. **Assess the dependency's criticality.** Before investing effort, calibrate the upgrade's risk level:
   - **Critical** — used in the primary request path, security-relevant, or affects data integrity
   - **Standard** — used regularly but not on the primary path; failure would degrade, not destroy
   - **Low** — tooling, dev dependencies, test utilities
   
   Critical dependencies require the full skill. Standard dependencies can skip Steps 3 and 5. Low-criticality upgrades don't need this skill.

2. **Read the changelog.** Read every change between the current and target version. Look for:
   - Breaking API changes (method renames, removed parameters, changed return types)
   - Behavioral changes (different defaults, changed semantics)
   - Dependency changes (the package now requires a new transitive dependency, or drops one)
   - Known incompatibilities with other packages in the project
   
   The changelog is the minimum input. For major version upgrades, also read the migration guide if one exists.

3. **Check security advisories.** Query the relevant security database for advisories affecting:
   - The current version (to understand what vulnerabilities the upgrade fixes)
   - The target version (to ensure the upgrade doesn't introduce new vulnerabilities)
   - Transitive dependencies that change as a result of the upgrade
   
   If the upgrade is being done specifically to address a security advisory, document which CVE(s) it resolves.

4. **Map the dependency's usage in the codebase.** Find every place the dependency is used directly. For each usage, check whether a breaking change from the changelog affects it. Create a list: "Usage at file:line — affected by breaking change X — requires change Y."

5. **Write the test plan.** Before touching any code, write the list of tests you will run to verify the upgrade is safe:
   - Unit tests that cover usage points identified in Step 4
   - Integration tests that exercise the dependency's primary use cases
   - Any manual test cases that automated tests don't cover
   
   If test coverage of the dependency's usage is thin, write the tests first before upgrading.

6. **Apply the upgrade in isolation.** Make the version change in a dedicated branch. Don't combine the upgrade with other changes — if something breaks, you need to know it was the upgrade. Run the test plan from Step 5. Fix any issues from Step 4's usage map.

7. **Stage the rollout.** For critical dependencies, don't deploy directly to production:
   - Deploy to staging or a canary environment first
   - Monitor for errors or behavioral changes for at least 24 hours
   - Define the specific signals that indicate a problem (error rates, latency changes, failed health checks)
   - Write the rollback procedure before deploying (reverting a dependency version should be documented and practiced)

## Checkpoints

**Is the upgrade driven by need or habit?**
Upgrading for security fixes, bug fixes affecting you, or features you need is justified. Upgrading to "stay current" is a legitimate long-term policy but shouldn't override sprint priorities. Before investing significant effort, confirm why this upgrade is happening now.

**Are there transitive dependency changes that weren't accounted for?**
Most package managers show direct dependency changes; transitive changes are harder to see. Lock file diffs reveal the full picture. Before completing the upgrade, compare the full lock file diff and look for changes in packages that also play significant roles in the system.

**Is the test coverage sufficient to catch regressions?**
If the test suite passes after the upgrade but the team has low confidence in the test suite itself, the upgrade is not validated — it's just not proven broken yet. In this case, either write additional tests before upgrading, or stage the rollout aggressively and monitor closely before declaring success.

## Principle Application

**supply-chain-security**
Step 3 (security advisories) directly applies this principle. The "Questions the Agent Should Ask" section from this principle drives the security assessment: is the dependency still maintained? Is the new version signed or verified? Have there been recent supply-chain compromises in this package ecosystem? The "What Goes Wrong" section describes the consequences of skipping supply-chain checks on dependency upgrades.

**health-checks**
Step 7 (staging the rollout) relies on health checks to detect that the upgrade is causing problems. Before deploying the upgraded dependency, verify that health checks cover the paths exercised by the dependency. If they don't, add health checks as part of the upgrade work — not as an afterthought after the deployment.

## Output Format

A `dependency-upgrade-{{PACKAGE-NAME}}-{{VERSION}}.md` file:

```markdown
# Dependency Upgrade: {{PACKAGE}} {{CURRENT}} → {{TARGET}}

**Date:** YYYY-MM-DD
**Criticality:** Critical / Standard / Low
**Reason for upgrade:** {{SECURITY FIX | BUG FIX | FEATURE | MAINTENANCE}}

## Breaking Changes
| Change | Impact | Files affected | Required code change |
|---|---|---|---|
| ... | ... | ... | ... |

## Security Advisories
- Resolved: {{CVE IDs fixed by this upgrade}}
- New: {{CVE IDs introduced, if any}}

## Usage Map
| Usage | File | Breaking change | Fix required |
|---|---|---|---|
| ... | ... | Yes / No | ... |

## Test Plan
- [ ] {{TEST}}

## Rollout Plan
1. Apply upgrade in isolation branch
2. Run test plan
3. Deploy to {{STAGING/CANARY}}
4. Monitor for {{N}} hours
5. Deploy to production if no issues

## Rollback Procedure
1. Revert version in dependency manifest
2. Run {{COMMAND}} to restore prior lockfile
3. Deploy reverted version
```
