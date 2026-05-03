---
id: data-classification
title: Data Classification
category: security
sources:
  - name: NIST SP 800-60 — Mapping Information to Security Categories
    url: https://csrc.nist.gov/pubs/sp/800/60/v1r1/final
  - name: NIST SP 800-122 — Protecting the Confidentiality of PII
    url: https://csrc.nist.gov/pubs/sp/800/122/final
  - name: GDPR — Article 5 (Principles relating to processing of personal data)
    url: https://gdpr-info.eu/art-5-gdpr/
  - name: HIPAA Security Rule — 45 CFR Part 164 Subpart C
    url: https://www.hhs.gov/hipaa/for-professionals/security/index.html
applies_when:
  scope: [new_build, epic, feature]
  scale: [solo, team, enterprise]
  stage: [discovery, refinement, build]
  domains: [financial_services, healthcare, defense, government, ecommerce, education, any_production]
tags: [security, data, privacy, pii, phi, compliance, governance]
---

# Data Classification

## Principle
Decide what kinds of data your system holds and how sensitive each kind is — before deciding how to protect it. Apply controls (encryption, access, retention, logging) proportional to the classification, so the most sensitive data is hardest to reach and the cheapest data is not over-protected into uselessness.

## When This Matters
- You are designing a new data model or adding fields that capture user, customer, patient, or financial information
- You are choosing where to store data (database, object store, analytics warehouse, third-party SaaS)
- You are exposing data through APIs, exports, logs, or analytics events
- A regulation applies (GDPR, HIPAA, PCI DSS, SOX, FedRAMP) that ties controls to data type
- You are sharing data with another team, vendor, or AI/ML pipeline
- You are designing retention, deletion, or right-to-erasure flows

## When This Doesn't Matter
- Systems that only handle synthetic test data or fully public information (open data, marketing pages)
- Internal-only tools where every user already has equal access to all the data the tool can see

## Questions the Agent Should Ask
- What categories of data will this system hold (PII, PHI, payment, credentials, business confidential, public)?
- What is the worst-case impact if each category leaks, is altered, or becomes unavailable — for users, the company, and regulators?
- Which fields actually need to be collected, and which are habit? Can the most sensitive be avoided, tokenized, or hashed?
- Where does each category live at rest, and is encryption (with managed keys) appropriate for that level?
- Who needs access to each category, and is that access enforced by code (roles, row-level filters) rather than convention?
- How long does each category need to be retained, and what deletes it on schedule or on user request?
- Do logs, error reports, analytics events, or AI prompts inadvertently include data from a higher classification than the destination is rated for?

## What Good Looks Like
- A simple, named classification scheme exists (e.g., public / internal / confidential / restricted) and every data store, table, or topic maps to one
- Sensitive fields are tagged in the schema or data catalog so engineers and tools know how to handle them
- Encryption, access controls, and audit logging are stronger for higher-classified data — and the difference is enforced, not aspirational
- PII and other regulated data can be located, exported, and deleted on request without a manual archeology project
- Logs and observability pipelines redact or omit high-classification data; lower-rated systems do not silently accumulate it
- Retention is defined per classification and actually executed; "keep forever" is a deliberate, justified exception

## What Goes Wrong When You Skip This
- Customer Social Security numbers end up in application logs that ship to a third-party log vendor with broad employee read access
- A "quick" analytics export pipes production PII into a BI tool that contractors can query, creating a regulatory incident the team did not know existed
- A right-to-erasure request takes weeks because nobody can list every place a user's data lives
- The same level of expensive encryption and access review is applied to public marketing copy and to medical records, slowing the team and convincing nobody that real risks are managed

## Further Reading
NIST SP 800-60 and SP 800-122 give a systematic approach to categorizing information and protecting PII. GDPR Article 5 establishes the data minimization, purpose limitation, and storage limitation principles that drive classification in practice; the HIPAA Security Rule does the equivalent for protected health information.
