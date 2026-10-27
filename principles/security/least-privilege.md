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
  - name: "Model Context Protocol specification 2025-11-25 — Security Best Practices"
    url: "https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices"
  - name: "ASD's ACSC, CISA, NSA, Cyber Centre, NCSC-NZ, NCSC-UK — Careful Adoption of Agentic AI Services (May 2026)"
    url: "https://www.ncsc.govt.nz/protect-your-organisation/careful-adoption-of-agentic-ai-services/"
applies_when:
  scope: [new_build, epic, feature, story]
  scale: [solo, team, enterprise]
  stage: [discovery, refinement, build, maintain]
  domains: [financial_services, healthcare, defense, government, any_production]
tags: [security, authorization, iam, access-control, rbac, agents, ai-systems, scoped-credentials]
---

# Least Privilege

## Principle
Every user, service, and process gets the minimum permissions needed to do its job — and nothing more. Permissions are scoped narrowly, granted for as little time as possible, and revoked when the reason for them ends.

Agents need this more than people do, because an agent can be steered by what it reads. Give each agent its own short-lived credentials scoped to the task, start it with minimal permissions, and elevate just in time for the specific operation, logging each elevation. Code an agent generates or runs executes where it cannot reach those credentials. For limits on what an agent may decide on its own, as opposed to what it can access, see least-agency.

## When This Matters
- You are designing IAM policies, service accounts, or database roles
- You are issuing API tokens, deploy keys, or third-party integration credentials
- A human or automated process needs elevated access (production, finance, infra) for a specific task
- You are onboarding or offboarding people, contractors, or vendors
- A service handles sensitive data or executes privileged operations on behalf of users
- You are reviewing existing permissions during an audit, incident, or refactor
- AI agents act on systems with credentials, or run code they generated

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
- Does each agent have its own credentials scoped to its current task, or does it borrow a user's or a service's broad, long-lived ones?
- Are permissions requested up front for everything an agent might do, or elevated when a specific operation needs them?

## What Good Looks Like
- IAM policies enumerate specific actions and resources; wildcard `*` is rare and justified
- Production and other privileged access is just-in-time and time-bounded, not standing
- Service-to-service identities are distinct per service, not shared
- Read-only roles exist and are used by default; write access is a separate, narrower role
- Permissions are reviewed when people change roles, leave, or finish a project — not only at audit time
- Access logs make it possible to answer "who did what, when, with which permission" after the fact
- Agents start with a minimal scope (read-only discovery) and request specific additional scopes when a privileged operation is first attempted; elevations are logged with correlation ids
- Agent credentials are ephemeral and task-scoped, never omnibus or wildcard scopes; generated code runs in an environment without access to them

## What Goes Wrong When You Skip This
- A leaked CI deploy key with `AdministratorAccess` lets an attacker pivot from a stolen GitHub token to full cloud takeover
- A junior engineer's debugging permission to read a customer table is still active two years later, and surfaces in a breach disclosure
- A microservice with `s3:*` on the entire account becomes the path an attacker uses to exfiltrate every bucket after compromising one pod
- An offboarded contractor retains a personal access token that still works against production three months later
- An agent is granted every scope its tools could ever need so users see only one consent dialog; a leaked token from one session can read files, query databases, and administer accounts

## Further Reading
OWASP and NIST SP 800-53 AC-6 define least privilege as a foundational access control principle. The AWS Well-Architected Security Pillar (SEC03-BP02) gives concrete patterns for scoping IAM policies, using short-lived credentials, and granting just-in-time elevation. The Model Context Protocol's security best practices describe a progressive, least-privilege scope model and list wildcard or omnibus scopes and bundling unrelated privileges as common mistakes; the Five Eyes agentic AI guidance calls strict least privilege "critical" for agents and recommends replacing "static, long-lived secrets with ephemeral credentials".
