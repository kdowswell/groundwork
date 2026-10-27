---
id: secrets-management
title: Secrets Management
category: security
sources:
  - name: HashiCorp Vault — Secrets Management Documentation
    url: https://developer.hashicorp.com/vault/docs
  - name: AWS Secrets Manager — Best Practices
    url: https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html
  - name: The Twelve-Factor App — Config
    url: https://12factor.net/config
  - name: "OWASP Top 10 for LLM Applications 2025"
    url: "https://genai.owasp.org/llm-top-10/"
applies_when:
  scope: [new_build, epic, feature, story, bug_fix]
  scale: [solo, team, enterprise]
  stage: [discovery, refinement, build, maintain]
  domains: [financial_services, healthcare, defense, government, ecommerce, any_production]
tags: [security, secrets, credentials, configuration, rotation, llm, ai-systems]
---

# Secrets Management

## Principle
Secrets — API keys, database passwords, signing keys, tokens — never live in source code, build artifacts, or shared developer machines. They are stored in a system designed to hold them, injected at runtime, scoped narrowly, and rotated on a schedule short enough that a leak has limited value.

Never put secrets, or the logic that decides who may do what, in a model's instructions. A system prompt is not a security boundary: it can be extracted, and a model can be talked out of following it. Keep credentials in the tools and services the model calls, and enforce authorization in deterministic code.

## When This Matters
- You are wiring up any external service: database, third-party API, message broker, cloud provider
- You are designing CI/CD pipelines that need credentials to deploy or call APIs
- A new environment (staging, preview, production) is being set up
- You are onboarding a teammate and need to give them access to credentials
- An incident, departure, or accidental commit has potentially exposed a secret
- You are reviewing existing config to find hardcoded credentials inherited from earlier work

## When This Doesn't Matter
- Local development against a disposable database with no real data and credentials that never leave the machine
- Public test credentials that vendors publish explicitly for sandboxing (Stripe test keys, etc.)

## Questions the Agent Should Ask
- Where will this secret be stored at rest, and what authenticates the caller that retrieves it?
- How does the secret reach the running process — env var injected by the platform, file mounted by an agent, or fetched at startup via an authenticated API call?
- What is the rotation cadence, and is rotation automated or manual? Who or what gets paged if rotation fails?
- Can this be a dynamic, short-lived credential (issued per session, per deploy) instead of a long-lived static secret?
- If this secret leaks into a log, error message, or error tracker, what detects that and what revokes it?
- Are different environments using different secrets, and is access to production secrets gated more tightly than to staging?
- How do developers run this locally without copying production secrets onto laptops?
- Does any system prompt, tool description, or model context contain a credential, an internal URL that should be private, or a rule like "only reveal this to administrators"?

## What Good Looks Like
- Secrets live in a managed store (cloud secret manager, Vault) and are pulled at runtime, not baked into images or repos
- The repo contains zero plaintext credentials; pre-commit and CI scanning enforce this
- Production secrets are distinct from staging and dev, and access is logged
- Long-lived static secrets are the exception; the default is short-lived, dynamically issued credentials
- Rotation is automated and exercised regularly, not a once-a-year manual fire drill
- Logs, error reports, and crash dumps are scrubbed so leaked secrets do not silently land in observability systems
- Model prompts contain no credentials or access rules; tools hold their own credentials and check authorization themselves, so leaking the prompt reveals nothing that grants access

## What Goes Wrong When You Skip This
- An AWS access key checked into a public repo is scraped by a bot within minutes and used to spin up crypto miners on the company's account
- A database password embedded in a Docker image lives unchanged for two years; when the image is leaked in a breach, the password still works
- A `.env` file emailed to a new hire ends up in their personal cloud backup and surfaces years later
- Rotating a critical credential is so painful — manual updates across services, no clear owner — that nobody does it, and "temporary" secrets become permanent
- An assistant's system prompt includes an API key and the instruction "never share this"; a user asks it to repeat its instructions in a different language, and it does

## Further Reading
The Twelve-Factor App's "Config" chapter establishes the baseline of separating config from code. HashiCorp Vault and AWS Secrets Manager documentation cover the operational patterns: dynamic secrets, automated rotation, scoped access policies, and audit logging. OWASP's Top 10 for LLM Applications lists system prompt leakage (LLM07) as its own risk: prompts should be assumed discoverable, so secrets and authorization logic belong outside them.
