---
id: zero-trust
title: Zero Trust
category: security
sources:
  - name: NIST SP 800-207 — Zero Trust Architecture
    url: https://csrc.nist.gov/pubs/sp/800/207/final
  - name: Google BeyondCorp
    url: https://cloud.google.com/beyondcorp
  - name: Microsoft Zero Trust Guidance
    url: https://learn.microsoft.com/en-us/security/zero-trust/zero-trust-overview
  - name: "Model Context Protocol specification 2025-11-25 — Security Best Practices"
    url: "https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices"
  - name: "ASD's ACSC, CISA, NSA, Cyber Centre, NCSC-NZ, NCSC-UK — Careful Adoption of Agentic AI Services (May 2026)"
    url: "https://www.ncsc.govt.nz/protect-your-organisation/careful-adoption-of-agentic-ai-services/"
applies_when:
  scope: [new_build, epic, feature]
  scale: [team, enterprise]
  stage: [discovery, refinement, build]
  domains: [financial_services, healthcare, defense, government, any_production]
tags: [security, identity, access-control, authentication, authorization, agents, ai-systems]
---

# Zero Trust

## Principle
Never trust based on network location. Verify every request with strong identity, device posture, and context — for every user, every service, every session — and grant the narrowest access the request actually needs.

AI agents are principals too. Each agent gets its own identity, is authenticated on every request like any other caller, and appears in an inventory of authorized agents; access is denied to any agent that isn't in it. Treat a model's output as untrusted input wherever it goes next — into a shell, a query, a renderer, or another agent — because the model may have been steered by content it read. Every service validates that a token was issued for it, and never forwards a caller's token downstream.

## When This Matters
- You are designing authentication or authorization for a new system or service
- Internal services currently trust each other because they sit "behind the firewall"
- Users access systems from multiple networks, devices, or locations (remote work, BYOD, partners)
- You are decomposing a monolith and need to define service-to-service trust
- You handle regulated data (PII, PHI, financial, defense) where lateral movement from a single compromise is catastrophic
- You are integrating with third-party SaaS, contractors, or M&A-acquired networks
- AI agents call your services or each other, or act on behalf of users

## When This Doesn't Matter
- Pre-production prototypes or internal tools with no real users or sensitive data
- Single-process applications where there is no network boundary to authenticate across
- Air-gapped systems with no external connectivity and a single trust domain

## Questions the Agent Should Ask
- Where in this design is access decided by network location (VPN, IP allowlist, "internal" subnet)? What replaces that with identity?
- What identity does each request carry — user identity, workload identity, or both — and how is it cryptographically verified?
- Are authentication and authorization decisions made per-request, or cached in a long-lived session that survives credential revocation?
- What signals beyond identity feed the access decision (device posture, geo, time, behavioral risk)?
- If this service's credentials leak, what can the attacker reach before they are stopped?
- How does access automatically narrow or revoke when a user changes role, a device falls out of compliance, or a service is decommissioned?
- Are encryption and mutual authentication required between services, or only at the perimeter?
- Does each agent have its own identity, separate from the user it acts for, and is there an inventory of which agents are authorized?
- Does any component accept a token that wasn't issued for it, or pass a caller's token through to a downstream service?
- Where does model output flow next, and is it validated there as untrusted input?

## What Good Looks Like
- Every request to every resource is authenticated and authorized — no implicit trust from "we're on the same network"
- Service-to-service calls use workload identity (mTLS, signed tokens) rather than shared secrets or IP allowlists
- Authorization decisions are made by a centralized policy engine, not scattered across services
- Access tokens are short-lived and scoped; long-lived credentials are the exception and are tracked
- Device posture (patched, encrypted, managed) is part of the access decision for sensitive resources
- Microsegmentation contains lateral movement — a compromised workload cannot reach unrelated resources
- Agents authenticate as distinct non-human principals; a registry binds each agent to its authorized roles and is reconciled against the agents actually running
- Each service accepts only tokens issued for it (audience-checked) and obtains its own credentials for downstream calls rather than forwarding the caller's
- Agent runtimes have egress limited to allowlisted destinations, so a steered agent can't reach arbitrary hosts

## What Goes Wrong When You Skip This
- A phishing-stolen VPN credential gives an attacker the same access as a trusted employee, and they pivot freely across "internal" services
- A leaked service-account key found in a public commit grants production database access for months because nothing rotated or scoped it
- A compromised vendor laptop on the corporate network reaches finance systems because the firewall was the only control
- Incident response cannot answer "what did the attacker touch?" because there is no per-request authorization log
- A tool server forwards the user's access token to a downstream API; when that server is compromised, the token works everywhere the user's does, and the downstream logs show the user, not the server

## Further Reading
NIST SP 800-207 is the canonical definition of zero trust architecture and its tenets. Google's BeyondCorp papers describe a real-world implementation at scale; Microsoft's Zero Trust guidance maps the principles to concrete identity, device, and network controls. For AI agents, the Model Context Protocol's security best practices make token passthrough a forbidden anti-pattern (servers "MUST NOT accept any tokens that were not explicitly issued for the MCP server"), and the Five Eyes agencies' agentic AI guidance recommends a trusted registry of agents bound to authorized roles, with access denied to any agent not in it.
