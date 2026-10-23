<!-- source: principles/security/zero-trust.md -->

# Zero Trust

## Principle
Never trust based on network location. Verify every request with strong identity, device posture, and context — for every user, every service, every session — and grant the narrowest access the request actually needs.

## When This Matters
- You are designing authentication or authorization for a new system or service
- Internal services currently trust each other because they sit "behind the firewall"
- Users access systems from multiple networks, devices, or locations (remote work, BYOD, partners)
- You are decomposing a monolith and need to define service-to-service trust
- You handle regulated data (PII, PHI, financial, defense) where lateral movement from a single compromise is catastrophic
- You are integrating with third-party SaaS, contractors, or M&A-acquired networks

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

## What Good Looks Like
- Every request to every resource is authenticated and authorized — no implicit trust from "we're on the same network"
- Service-to-service calls use workload identity (mTLS, signed tokens) rather than shared secrets or IP allowlists
- Authorization decisions are made by a centralized policy engine, not scattered across services
- Access tokens are short-lived and scoped; long-lived credentials are the exception and are tracked
- Device posture (patched, encrypted, managed) is part of the access decision for sensitive resources
- Microsegmentation contains lateral movement — a compromised workload cannot reach unrelated resources

## What Goes Wrong When You Skip This
- A phishing-stolen VPN credential gives an attacker the same access as a trusted employee, and they pivot freely across "internal" services
- A leaked service-account key found in a public commit grants production database access for months because nothing rotated or scoped it
- A compromised vendor laptop on the corporate network reaches finance systems because the firewall was the only control
- Incident response cannot answer "what did the attacker touch?" because there is no per-request authorization log
