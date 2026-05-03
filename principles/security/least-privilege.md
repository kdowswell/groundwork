---
id: least-privilege
title: Least Privilege
category: security
sources:
  - name: OWASP — Least Privilege Principle
    url: https://owasp.org/www-community/Access_Control
  - name: NIST SP 800-53 AC-6 — Least Privilege
    url: https://csf.tools/reference/nist-sp-800-53/r5/ac/ac-6/
  - name: AWS Well-Architected — SEC03-BP02 Grant least privilege access
    url: https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_permissions_least_privileges.html
applies_when:
  scope: [new_build, epic, feature, story]
  scale: [solo, team, enterprise]
  stage: [discovery, refinement, build, maintain]
  domains: [financial_services, healthcare, defense, government, any_production]
tags: [security, authorization, iam, access-control, rbac]
---

# Least Privilege

## Principle
Every user, service, and process gets the minimum permissions needed to do its job — and nothing more. Permissions are scoped narrowly, granted for as little time as possible, and revoked when the reason for them ends.

## When This Matters
- You are designing IAM policies, service accounts, or database roles
- You are issuing API tokens, deploy keys, or third-party integration credentials
- A human or automated process needs elevated access (production, finance, infra) for a specific task
- You are onboarding or offboarding people, contractors, or vendors
- A service handles sensitive data or executes privileged operations on behalf of users
- You are reviewing existing permissions during an audit, incident, or refactor

## When This Doesn't Matter
- Throwaway local scripts and prototypes that touch no shared or sensitive systems
- Single-user CLIs running on the developer's own machine with their own credentials

## Questions the Agent Should Ask
- What is the smallest set of actions and resources this identity actually needs to perform its job? Can you list them explicitly rather than using a wildcard?
- Could this be a short-lived, scoped credential (assumed role, session token, signed URL) instead of a long-lived key?
- How long does this access need to last — minutes, the duration of a task, a sprint, indefinitely? What revokes it when that ends?
- If this credential leaks tomorrow, what specifically can the attacker do, and what can they not do?
- Are read and write paths separated, so a read-only consumer cannot mutate data?
- Who reviews these permissions, how often, and what triggers a review (role change, project end, audit)?
- Is privileged access (production, customer data, infrastructure) granted just-in-time with approval and an audit trail, or held standing?

## What Good Looks Like
- IAM policies enumerate specific actions and resources; wildcard `*` is rare and justified
- Production and other privileged access is just-in-time and time-bounded, not standing
- Service-to-service identities are distinct per service, not shared
- Read-only roles exist and are used by default; write access is a separate, narrower role
- Permissions are reviewed when people change roles, leave, or finish a project — not only at audit time
- Access logs make it possible to answer "who did what, when, with which permission" after the fact

## What Goes Wrong When You Skip This
- A leaked CI deploy key with `AdministratorAccess` lets an attacker pivot from a stolen GitHub token to full cloud takeover
- A junior engineer's debugging permission to read a customer table is still active two years later, and surfaces in a breach disclosure
- A microservice with `s3:*` on the entire account becomes the path an attacker uses to exfiltrate every bucket after compromising one pod
- An offboarded contractor retains a personal access token that still works against production three months later

## Further Reading
OWASP and NIST SP 800-53 AC-6 define least privilege as a foundational access control principle. The AWS Well-Architected Security Pillar (SEC03-BP02) gives concrete patterns for scoping IAM policies, using short-lived credentials, and granting just-in-time elevation.
